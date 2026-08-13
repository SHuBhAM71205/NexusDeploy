from sqlalchemy.ext.asyncio import async_sessionmaker,create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.POSTGRES_URL, #type:ignore
    pool_size=20, 
    max_overflow=5
    
) 

session_pool = async_sessionmaker(bind=engine, expire_on_commit=False)


async def db_session():
    async with session_pool() as session:
        yield session