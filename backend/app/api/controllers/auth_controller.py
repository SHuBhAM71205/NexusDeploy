from datetime import timezone, datetime

from fastapi import Request, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.models import (auth_model)
from app.api.services import (user_services as us, auth_services as aus)
from app.db.models.User import OAuthDetail, User

user_services = us.UserServices()
auth_services = aus.AuthServices()


class AuthController:

    def __init__(self) -> None:
        pass

    async def login_controller(
            self,
            req: auth_model.LoginRequest,
            db: AsyncSession,
            request: Request | None = None,
            response: Response | None = None,
    ) -> auth_model.LoginResponse:

        try:
            user = await user_services.find_user_by(key_value=[(us.UserLookupField.EMAIL, req.email)], db=db)

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            if not auth_services.verify_hash(req.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            access_token, refresh_token = await auth_services.create_access_token(
                user_id=str(user.id),
                db=db
            )

            if request is not None:
                request.session["user_id"] = str(user.id)
                request.session["auth_provider"] = "local"

            if response is not None:
                response.set_cookie(
                    key="refresh_token",
                    value=refresh_token,
                    httponly=True,
                    secure=False,
                    samesite="lax",
                    max_age=7 * 24 * 60 * 60,
                )

            return auth_model.LoginResponse(access_token=access_token, refresh_token=refresh_token, username=user.name)

        except HTTPException:
            raise

        except Exception as e:
            print(f"Database error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def register_controller(
            self,
            req: auth_model.RegisterRequest,
            db: AsyncSession
    ) -> auth_model.RegisterResponse:

        try:
            user = await user_services.find_user_by(
                key_value=[
                    (us.UserLookupField.EMAIL, req.email),
                    (us.UserLookupField.USERNAME, req.username)
                ],
                operator="OR", db=db
            )

            if user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email OR Name already registered"
                )

            secure_password_hash = auth_services.gen_hash(req.password)

            new_user = User(
                email=req.email,
                name=req.username,
                password_hash=secure_password_hash

            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)

            print(user)

            return auth_model.RegisterResponse(
                id=new_user.id,
                email=new_user.email,
                username=new_user.name,
                status=new_user.status,
                is_verified=new_user.is_verified,
                created_at=new_user.created_at
            )

        except HTTPException:
            raise

        except Exception as e:
            print(f"Database error: ppppp{e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def me_controller(
            self,
            req: Request,
            db: AsyncSession
    ) -> auth_model.UserProfileResponse:

        try:
            from uuid import UUID
            from app.api.middleware.redis_cache import redis_profile_cache_get, redis_profile_cache_set

            user_id_str = req.state.user_id
            user_uuid = UUID(str(user_id_str))

            # Check cache first
            cached_profile = await redis_profile_cache_get(user_uuid)
            if cached_profile:
                return auth_model.UserProfileResponse(
                    id=UUID(cached_profile["id"]),
                    email=cached_profile["email"],
                    username=cached_profile["username"],
                    is_verified=cached_profile["is_verified"]
                )

            # Database lookup on cache miss
            user = await user_services.find_user_by(key_value=[(us.UserLookupField.ID, user_uuid)], db=db)

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )

            profile_data = {
                "id": str(user.id),
                "email": user.email,
                "username": user.name,
                "is_verified": user.is_verified
            }

            # Cache the user profile
            await redis_profile_cache_set(user_uuid, profile_data)

            return auth_model.UserProfileResponse(
                id=user.id,
                email=user.email,
                username=user.name,
                is_verified=user.is_verified
            )
        except HTTPException:
            raise

        except Exception as e:
            print(f"Database error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def refresh_controller(
            self,
            request: Request,
            response: Response,
            refresh_token: str | None,
            db: AsyncSession
    ) -> auth_model.TokenRefreshResponse:
        current_refresh_token = refresh_token or request.cookies.get("refresh_token")

        if not current_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing. Please log in again."
            )

        try:
            payload = auth_services.decode_token(current_refresh_token, expected_type="refresh")
            user_id = payload.get("sub")
            user_tokens = await auth_services.get_user_tokens(user_id=user_id, db=db)
            active_token_record = None

            for db_token in user_tokens:
                if auth_services.verify_hash(current_refresh_token, db_token.token_hash):
                    if db_token.is_revoked:
                        await auth_services.revoke_all_user_tokens(user_id=user_id, db=db)
                        response.delete_cookie("refresh_token")
                        request.session.pop("user_id", None)
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Security alert: refresh token reuse detected. All sessions revoked."
                        )

                    if db_token.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
                        db_token.is_revoked = True
                        db_token.revoked_at = datetime.now(timezone.utc)
                        await db.commit()
                        response.delete_cookie("refresh_token")
                        request.session.pop("user_id", None)
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Session expired. Please log in again."
                        )

                    active_token_record = db_token
                    break

            if not active_token_record:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired refresh token status",
                )

            active_token_record.is_revoked = True
            active_token_record.revoked_at = datetime.now(timezone.utc)

            new_access_token, new_refresh_token = await auth_services.create_access_token(
                user_id=user_id,
                db=db
            )

            request.session["user_id"] = str(user_id)
            request.session["auth_provider"] = "local"

            response.set_cookie(
                key="refresh_token",
                value=new_refresh_token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=7 * 24 * 60 * 60,
            )

            return auth_model.TokenRefreshResponse(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                token_type="bearer"
            )

        except HTTPException:
            raise

        except Exception as e:
            print(f"Database error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def google_oauth_login_controller(
            self,
            google_user: dict,
            db: AsyncSession,
            request: Request | None = None,
            response: Response | None = None,
            oauth_access_token: str | None = None,
            oauth_refresh_token: str | None = None,
    ) -> dict:
        email = (google_user.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account email is required"
            )

        user = await user_services.find_user_by(
            key_value=[(us.UserLookupField.EMAIL, email)],
            db=db,
        )

        if not user:
            user = User(
                email=email,
                name=google_user.get("name") or google_user.get("given_name") or email.split("@")[0],
                password_hash=None,
                is_verified=bool(google_user.get("email_verified")),
                profile_pic_url=google_user.get("picture")
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            updated = False
            if not user.name and (google_user.get("name") or google_user.get("given_name")):
                user.name = google_user.get("name") or google_user.get("given_name")
                updated = True
            if google_user.get("picture") and not user.profile_pic_url:
                user.profile_pic_url = google_user.get("picture")
                updated = True
            if bool(google_user.get("email_verified")) and not user.is_verified:
                user.is_verified = True
                updated = True
            if updated:
                await db.commit()

        provider_user_id = str(google_user.get("sub") or email)
        existing_oauth = await db.execute(
            select(OAuthDetail).where(
                OAuthDetail.provider == "google",
                OAuthDetail.provider_user_id == provider_user_id,
            )
        )
        oauth_record = existing_oauth.scalars().first()

        if not oauth_record:
            oauth_record = OAuthDetail(
                user_id=user.id,
                provider="google",
                provider_user_id=provider_user_id,
                access_token=oauth_access_token or "",
                refresh_token=oauth_refresh_token,
                expires_at=None,
                scopes="openid email profile",
            )
            db.add(oauth_record)
            await db.commit()
        else:
            oauth_record.user_id = user.id
            oauth_record.access_token = oauth_access_token or oauth_record.access_token
            oauth_record.refresh_token = oauth_refresh_token or oauth_record.refresh_token
            await db.commit()

        access_token, refresh_token = await auth_services.create_access_token(
            user_id=str(user.id),
            db=db,
        )

        if request is not None:
            request.session["user_id"] = str(user.id)
            request.session["auth_provider"] = "google"

        if response is not None:
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=7 * 24 * 60 * 60,
            )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "username": user.name,
        }

    async def logout_controller(
            self,
            request: Request,
            response: Response,
            refresh_token: str | None,
            db: AsyncSession
    ):
        current_refresh_token = refresh_token or request.cookies.get("refresh_token")

        try:
            from app.api.middleware.redis_cache import redis_cache_invalidate

            if current_refresh_token:
                payload = auth_services.decode_token(current_refresh_token, expected_type="refresh")
                user_id = payload.get("sub")
                await auth_services.revoke_all_user_tokens(user_id=user_id, db=db)
                await redis_cache_invalidate(f"profile_cache:{user_id}")

            request.session.pop("user_id", None)
            request.session.pop("auth_provider", None)
            response.delete_cookie("refresh_token")

            return {"detail": "Successfully logged out and session revoked."}

        except HTTPException:
            raise
        except Exception as e:
            print(f"Database error during logout: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
