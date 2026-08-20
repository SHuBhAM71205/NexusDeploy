from typing import Annotated
from urllib.parse import urlencode

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status
)
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

# import controller
from app.api.controllers.auth_controller import (AuthController)
# import middleware
from app.api.middleware import (jwt)
from app.api.middleware.limiter import auth_rate_limiter
# import model
from app.api.models import (auth_model)
# AsyncDB
from app.db.session import db_session

from authlib.integrations.starlette_client import OAuth

from app.core.config import settings
AsyncDB = Annotated[AsyncSession, Depends(db_session)]

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

auth_controller = AuthController()


oauth = OAuth()

oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    authorize_url=settings.GC_AUTH_URI,
    access_token_url=settings.GC_TOKEN_URI,
    jwks_uri=settings.GC_AUTH_PROVIDER,
    client_kwargs={
        'scope': 'openid email profile'
    }
)


@router.post(
    "/login",
    response_model=auth_model.LoginResponse,
    dependencies=[Depends(auth_rate_limiter)]
)
async def login(request: Request, response: Response, req: auth_model.LoginRequest, db: AsyncDB):
    return await auth_controller.login_controller(req=req, db=db, request=request, response=response)


@router.post(
    "/register",
    response_model=auth_model.RegisterResponse,
    dependencies=[Depends(auth_rate_limiter)]
)
async def register(req: auth_model.RegisterRequest, db: AsyncDB):
    return await auth_controller.register_controller(req=req, db=db)


@router.get(
    "/me",
    response_model=auth_model.UserProfileResponse,
    dependencies=[Depends(jwt.jwt_verify_middleware)],
)
async def get_me(request: Request, db: AsyncDB):
    return await auth_controller.me_controller(req=request, db=db)


@router.post(
    "/refresh",
    response_model=auth_model.TokenRefreshResponse
)
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncDB,
    req: auth_model.RefreshRequest | None = None,
):
    return await auth_controller.refresh_controller(
        request=request,
        response=response,
        refresh_token=req.refresh_token if req else None,
        db=db,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK
)
async def logout(
    request: Request,
    response: Response,
    db: AsyncDB,
    req: auth_model.RefreshRequest | None = None,
):
    return await auth_controller.logout_controller(
        request=request,
        response=response,
        refresh_token=req.refresh_token if req else None,
        db=db,
    )

@router.get("/oauth/google")
async def google_oauth_login(request: Request):
    redirect_url = str(request.url_for("google_oauth_callback"))
    
    print(redirect_url)
        
    return await oauth.google.authorize_redirect(request, redirect_url) 


@router.get("/oauth/google/callback")
async def google_oauth_callback(request: Request, response: Response, db: AsyncDB):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Google OAuth handshake failed: {exc}"
        ) from exc

    userinfo = token.get("userinfo")
    if not userinfo:
        try:
            userinfo = await oauth.google.userinfo(token=token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Google user identity profile verification unavailable"
            )

    result = await auth_controller.google_oauth_login_controller(
        google_user=userinfo,
        db=db,
        request=request,
        response=response
    )

    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],  # Stored securely in database ledger
        httponly=True,                  # Protects token from malicious JavaScript
        samesite="lax",                 # CSRF defense
        max_age=7 * 24 * 60 * 60        # 7-day warranty duration
    )

    frontend_url = getattr(settings, "REACT_APP_FRONTEND_URL", "http://localhost:3000")
    
    query = urlencode({
        "access_token": result["access_token"],
        "username": userinfo.get("name") or "",
        "provider": "google",
    })
    
    '''
        TODO: Handle of frontend auth here append
    '''
    return RedirectResponse(
        url=f"http://{frontend_url.rstrip('/')}",

        status_code=status.HTTP_302_FOUND,
        headers=response.headers
    )
