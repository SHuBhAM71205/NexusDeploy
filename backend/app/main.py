import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.api.routes import api_router
from app.api.routes import auth

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NexusDeploy High-Performance Cloud Deployment & Orchestration API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Combine CORS origins from settings
cors_origins = list(settings.CORS_ORIGINS)
if settings.REACT_APP_FRONTEND_URL and settings.REACT_APP_FRONTEND_URL not in cors_origins:
    cors_origins.append(settings.REACT_APP_FRONTEND_URL)
if "http://localhost:5173" not in cors_origins:
    cors_origins.append("http://localhost:5173")

# Set up CORS middleware to allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="fastapi_session",
    same_site="lax",
    https_only=False,
)

# Mount all v1 API routes under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to NexusDeploy API",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
