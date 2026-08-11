import logging
from typing import Optional
from redis.asyncio import Redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared Redis client instance
_redis_client: Optional[Redis] = None


def get_redis_client() -> Redis:
    """
    Get or initialize the shared async Redis client.
    Uses settings.GEN_REDIS_URL.
    """
    global _redis_client
    if _redis_client is None:
        logger.info("Initializing Redis client connection pool...")
        _redis_client = Redis.from_url(
            settings.GEN_REDIS_URL, #type: ignore
            max_connections=20,
            decode_responses=True
        )
    return _redis_client


async def close_redis_client() -> None:
    """
    Close the shared Redis client and its connection pool on application shutdown.
    """
    global _redis_client
    if _redis_client is not None:
        logger.info("Closing Redis client connection pool...")
        await _redis_client.aclose()
        _redis_client = None
