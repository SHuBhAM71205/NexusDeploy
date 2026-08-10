from datetime import timezone, datetime

from fastapi import Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.models import (auth_model)
from app.api.services import (user_services as us, auth_services as aus)
from app.db.models.User import User

user_services = us.UserServices()
auth_services = aus.AuthServices()


class AuthController:

    def __init__(self) -> None:
        pass

    async def login_controller(
            self,
            req: auth_model.LoginRequest,
            db: AsyncSession
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
            req: auth_model.RefreshRequest,
            db: AsyncSession
    ) -> auth_model.TokenRefreshResponse:

        payload = auth_services.decode_token(req.refresh_token, expected_type="refresh")
        user_id = payload.get("sub")
        try:

            db_tokens = await auth_services.get_unrevoked_token(user_id=user_id, db=db)
            active_token_record = None

            for db_token in db_tokens:
                if auth_services.verify_hash(req.refresh_token, db_token.token_hash):
                    if db_token.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
                        active_token_record = db_token
                        break

            if not active_token_record:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired refresh token status",
                )

            new_access_token = auth_services.refresh_access_token(user_id=user_id)

            return auth_model.TokenRefreshResponse(
                access_token=new_access_token,
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

    async def logout_controller(
            self,
            req: auth_model.RefreshRequest,
            db: AsyncSession
    ):
        payload = auth_services.decode_token(req.refresh_token, expected_type="refresh")
        user_id = payload.get("sub")

        try:
            from app.api.middleware.redis_cache import redis_cache_invalidate

            db_tokens = await auth_services.get_unrevoked_token(user_id=user_id, db=db)

            target_token = None
            for db_token in db_tokens:
                if auth_services.verify_hash(req.refresh_token, db_token.token_hash):
                    target_token = db_token
                    break

            if not target_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token already invalid or logged out."
                )

            target_token.is_revoked = True
            await db.commit()

            # Invalidate user profile cache on logout
            await redis_cache_invalidate(f"profile_cache:{user_id}")

            return {"detail": "Successfully logged out and session revoked."}

        except HTTPException:
            raise
        except Exception as e:
            print(f"Database error during logout: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
