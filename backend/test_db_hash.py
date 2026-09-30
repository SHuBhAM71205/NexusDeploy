import asyncio

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from app.core.config import settings
from app.api.services.auth_services import AuthServices


async def test():
    engine = create_async_engine(settings.POSTGRES_URL, echo=True)

    auth = AuthServices()
    hashed = auth.gen_hash("TestPassword123")

    print("\nHASH BEFORE INSERT:")
    print(hashed)

    async with engine.begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO users
                    (id, email, name, password_hash, failed_login_attempts, is_verified)
                VALUES
                    (gen_random_uuid(), :email, :name, :password_hash, 0, false)
            """),
            {
                "email": "direct_debug@example.com",
                "name": "Direct Debug",
                "password_hash": hashed,
            }
        )

        result = await conn.execute(
            text("""
                SELECT email, password_hash
                FROM users
                WHERE email = :email
            """),
            {"email": "direct_debug@example.com"}
        )

        print("\nDATABASE RESULT:")
        print(result.fetchone())

    await engine.dispose()


asyncio.run(test())