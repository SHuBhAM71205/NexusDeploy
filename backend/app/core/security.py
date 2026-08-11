from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Tuple
from fastapi import HTTPException, status
import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.ext.asyncio import AsyncSession


from app.db.models.RefreshToken import RefreshToken


class Hash:

    def __init__(self):
        self.ph = PasswordHash.recommended()

    def generatehash(self, password: str) -> str:
        return self.ph.hash(password)

    def verifyhash(self, password: str, hash: str) -> bool:
        try:
            return self.ph.verify(password, hash)
        except UnknownHashError:
            return False


class AccessToken:

    def __init__(self, secret_key: str, algo: str):
        self.SECRET_KEY = secret_key
        self.ALGORITHM = algo

    async def create_access_token(self, user_id: str, db: AsyncSession, hashing_util: Hash) -> Tuple[str, str]:

        now = datetime.now(timezone.utc)

        access_expire = now + timedelta(minutes=15)
        access_payload = {
            "sub": user_id,
            "exp": access_expire,
            "type": "access"
        }
        access_token = jwt.encode(
            access_payload, self.SECRET_KEY, algorithm=self.ALGORITHM)

        refresh_expire = now + timedelta(days=7)
        refresh_payload = {
            "sub": user_id,
            "exp": refresh_expire,
            "type": "refresh"
        }
        raw_refresh_token = jwt.encode(
            refresh_payload, self.SECRET_KEY, algorithm=self.ALGORITHM)

        refresh_token_hash = hashing_util.generatehash(raw_refresh_token)

        db_refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expire,
            is_revoked=False,
            revoked_at=None,
        )

        db.add(db_refresh_token)
        await db.commit()
        
        return access_token, raw_refresh_token

    def refresh_access_token(self, user_id: str) -> str:
        
        now = datetime.now(timezone.utc)
        access_expire = now + timedelta(minutes=15)
        access_payload = {
            "sub": user_id,
            "exp": access_expire,
            "type": "access"
        }
        return jwt.encode(access_payload, self.SECRET_KEY, algorithm=self.ALGORITHM)

    def decode_token(self, token: str, expected_type: str) -> dict:
        try:
            payload = jwt.decode(token, self.SECRET_KEY,
                                 algorithms=[self.ALGORITHM])

            if payload.get("type") != expected_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {expected_type} token.",
                )

            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
            )

        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials"
            )


if __name__ == "__main__":
    check_hash = Hash()
    hash_str = check_hash.generatehash("Shubham")

    if not check_hash.verifyhash("Shubham", hash_str[:-1]):
        print("Test 1 pass")

    try:
        if check_hash.verifyhash("Shubham", hash_str):
            print("Test 2 pass")
    except Exception as e:
        print("Test 2 failed")

    print('Hash class all test cases passed successfully.')
