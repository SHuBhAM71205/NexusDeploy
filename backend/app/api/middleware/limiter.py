import logging

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.reddis import get_redis_client

logger = logging.getLogger(__name__)


async def global_rate_limit_middleware(request: Request, call_next):
    """
    Global IP-based rate limiter middleware applied to all incoming requests.
    Checks request count against settings.GLOBAL_RATE_LIMIT_PER_MINUTE.
    """
    host = request.client.host if request.client else "unknown"
    user_key = f"global_rate_limit:{host}"
    client = get_redis_client()

    try:
        request_count = await client.incr(user_key)
        if request_count == 1:
            await client.expire(user_key, 60)
        else:
            # Safeguard to prevent keys from living indefinitely if the expiry call failed
            ttl = await client.ttl(user_key)
            if ttl == -1:
                await client.expire(user_key, 60)

        if request_count > settings.GLOBAL_RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Too Many Requests",
                    "message": "Global rate limit exceeded. Please try again later."
                },
                headers={"Retry-After": "60"}
            )
    except Exception as e:
        logger.warning("Redis error while applying global rate limit: %s", e)

    return await call_next(request)


async def auth_rate_limit_middleware(request: Request, call_next):
    """
    IP-based rate limiter middleware for authentication routes.
    """
    host = request.client.host if request.client else "unknown"
    user_key = f"auth_rate_limit:{host}"
    client = get_redis_client()

    try:
        counts = await client.incr(user_key)
        if counts == 1:
            await client.expire(user_key, 60)
        else:
            ttl = await client.ttl(user_key)
            if ttl == -1:
                await client.expire(user_key, 60)

        if counts > settings.AUTH_RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Too Many Requests",
                    "message": "Auth rate limit exceeded. Please try again later."
                },
                headers={"Retry-After": "60"}
            )
    except Exception as e:
        logger.warning("Redis error while applying auth rate limit middleware: %s", e)

    return await call_next(request)


async def auth_rate_limiter(request: Request):
    """
    IP-based rate limiter dependency for sensitive authentication routes.
    Checks request count against settings.AUTH_RATE_LIMIT_PER_MINUTE.
    """
    host = request.client.host if request.client else "unknown"
    user_key = f"auth_rate_limit:{host}"
    client = get_redis_client()

    try:
        counts = await client.incr(user_key)
        if counts == 1:
            await client.expire(user_key, 60)
        else:
            ttl = await client.ttl(user_key)
            if ttl == -1:
                await client.expire(user_key, 60)

        if counts > settings.AUTH_RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please try again later."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Redis error while applying auth rate limit dependency: %s", e)
