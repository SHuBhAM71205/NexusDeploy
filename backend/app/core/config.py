from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


# noinspection pep8-naming,pep8-naming,pep8-naming,pep8-naming
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )
    #POSTGRES
    PG_DB_NAME :str 
    PG_DB_USER :str
    PG_DB_PASSWORD :str 
    PG_DB_HOST :str
    PG_DB_PORT :int
    
    @computed_field
    def POSTGRES_URL(self) -> str:
        return f"postgresql+asyncpg://{self.PG_DB_USER}:{self.PG_DB_PASSWORD}@{self.PG_DB_HOST}:{self.PG_DB_PORT}/{self.PG_DB_NAME}"
    
    @computed_field
    def ALEMBIC_POSTGRES_URL(self) -> str:
        return f"postgresql+psycopg://{self.PG_DB_USER}:{self.PG_DB_PASSWORD}@{self.PG_DB_HOST}:{self.PG_DB_PORT}/{self.PG_DB_NAME}"

    # ---------REDIS(GENERAL)--------------

    GEN_REDIS_HOST:str
    GEN_REDIS_PORT:int
    GEN_REDIS_LOGICAL_DB:int

    @computed_field
    def GEN_REDIS_URL(self) -> str:
        return f"redis://{self.GEN_REDIS_HOST}:{self.GEN_REDIS_PORT}/{self.GEN_REDIS_LOGICAL_DB}"


    # RATE LIMITING
    GLOBAL_RATE_LIMIT_PER_MINUTE: int = 100
    AUTH_RATE_LIMIT_PER_MINUTE: int = 5

    # CRYPTOGRAPHIC
    BACKEND_SECRETE_KEY: str
    HASHING_ALGO: str
    SECRET_KEY: str = "change-me-in-production"

    # OAUTH / AUTH PROVIDERS
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GC_AUTH_URI: str = "https://accounts.google.com/o/oauth2/auth"
    GC_TOKEN_URI: str = "https://oauth2.googleapis.com/token"
    GC_AUTH_PROVIDER: str = "https://www.googleapis.com/oauth2/v3/certs"

    # FRONTEND
    REACT_APP_FRONTEND_HOST: str
    REACT_APP_FRONTEND_PORT: int
    @computed_field
    def REACT_APP_FRONTEND_URL(self) -> str:
        return f"{self.REACT_APP_FRONTEND_HOST}"


settings = Settings() #type:ignore
