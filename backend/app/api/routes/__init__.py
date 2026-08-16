from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.projects import router as projects_router
from app.api.routes.deployments import router as deployments_router
from app.api.routes.stats import router as stats_router
from app.api.routes.activities import router as activities_router
from app.api.routes.settings import router as settings_router
from app.api.routes.auth import router as auth_router
api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(stats_router)
api_router.include_router(projects_router)
api_router.include_router(deployments_router)
api_router.include_router(activities_router)
api_router.include_router(settings_router)
api_router.include_router(auth_router)