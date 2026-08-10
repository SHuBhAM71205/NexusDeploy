from typing import Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import Hash, AccessToken
from app.db.models.RefreshToken import RefreshToken


class AuthServices:

    def __init__(self) -> None:
        self.__hash = Hash()
        self.__token = AccessToken(
            settings.BACKEND_SECRETE_KEY, settings.HASHING_ALGO)

    def verify_hash(
            self,
            req_password: str,
            org_hash_password: str
    ) -> bool:
        return self.__hash.verifyhash(req_password, org_hash_password)

    async def create_access_token(
            self,
            user_id: str,
            db: AsyncSession
    ) -> Tuple[str, str]:
        return await self.__token.create_access_token(
            user_id=user_id,
            db=db,
            hashing_util=self.__hash
        )

    def gen_hash(self, password: str) -> str:
        return self.__hash.generatehash(password)

    def decode_token(self, refresh_token: str, expected_type: str):
        return self.__token.decode_token(refresh_token, expected_type)

    async def get_unrevoked_token(self, user_id, db: AsyncSession):
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        )
        result = await db.execute(stmt)
        db_tokens = result.scalars().all()

        return db_tokens

    def refresh_access_token(self, user_id):
        return self.__token.refresh_access_token(user_id)
