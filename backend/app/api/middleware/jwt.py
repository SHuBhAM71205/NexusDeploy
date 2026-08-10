from typing import Annotated

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import jwt
from app.core.config import settings

security_scheme = HTTPBearer()


async def jwt_verify_middleware(
        request: Request,
        credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)]
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, settings.BACKEND_SECRETE_KEY, algorithms=[settings.HASHING_ALGO])

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token required."
            )

        request.state.user_id = payload.get("sub")

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
