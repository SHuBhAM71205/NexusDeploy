from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Request,
    status
)
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

AsyncDB = Annotated[AsyncSession, Depends(db_session)]

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

auth_controller = AuthController()


@router.post(
    "/login",
    response_model=auth_model.LoginResponse,
    dependencies=[Depends(auth_rate_limiter)]
)
async def login(req: auth_model.LoginRequest, db: AsyncDB):
    return await auth_controller.login_controller(req=req, db=db)


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
async def refresh_session(req: auth_model.RefreshRequest, db: AsyncDB):
    return await auth_controller.refresh_controller(req=req, db=db)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK
)
async def logout(req: auth_model.RefreshRequest, db: AsyncDB):
    return await auth_controller.logout_controller(req=req, db=db)
