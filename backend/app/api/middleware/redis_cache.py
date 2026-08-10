import json
import logging
from typing import Optional
from uuid import UUID

from app.core.reddis import get_redis_client

logger = logging.getLogger(__name__)

# Cache expiration times (in seconds)
PROFILE_CACHE_TTL = 5 * 60  # 5 minutes
RESUME_CACHE_TTL = 60  # 1 minute


async def redis_profile_cache_set(user_id: UUID, profile: dict) -> bool:
    """
    Cache user profile data in Redis with proper serialization.
    
    Args:
        user_id: User UUID
        profile: Profile dictionary to cache
        
    Returns:
        True if successful, False otherwise
    """
    try:
        redis_client = get_redis_client()
        cache_key = f"profile_cache:{user_id}"

        # Serialize profile as JSON
        serialized_profile = json.dumps(profile)

        # Set with expiration
        await redis_client.set(cache_key, serialized_profile, ex=PROFILE_CACHE_TTL)
        logger.info(f"Profile cached for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error caching profile for user {user_id}: {str(e)}")
        return False


async def redis_profile_cache_get(user_id: UUID) -> Optional[dict]:
    """
    Retrieve cached user profile from Redis.
    
    Args:
        user_id: User UUID
        
    Returns:
        Profile dictionary if cached, None otherwise
    """
    try:
        redis_client = get_redis_client()
        cache_key = f"profile_cache:{user_id}"

        cached_data = await redis_client.get(cache_key)
        if cached_data:
            profile = json.loads(cached_data)
            logger.info(f"Profile cache hit for user {user_id}")
            return profile

        logger.info(f"Profile cache miss for user {user_id}")
        return None
    except Exception as e:
        logger.error(f"Error retrieving profile cache for user {user_id}: {str(e)}")
        return None


# Backward compatibility - deprecated functions
async def reddis_profile_cache_middleware(user_id: UUID, profile) -> bool:
    """Deprecated: Use redis_profile_cache_set instead."""
    if isinstance(profile, dict):
        return await redis_profile_cache_set(user_id, profile)
    return False


async def redis_cache_invalidate(cache_key: str) -> bool:
    """
    Invalidate a cache entry.
    
    Args:
        cache_key: The cache key to invalidate
        
    Returns:
        True if successful, False otherwise
    """
    try:
        redis_client = get_redis_client()
        await redis_client.delete(cache_key)
        logger.info(f"Cache invalidated: {cache_key}")
        return True
    except Exception as e:
        logger.error(f"Error invalidating cache {cache_key}: {str(e)}")
        return False
