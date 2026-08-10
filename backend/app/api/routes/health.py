import time
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health"])

START_TIME = time.time()

@router.get("/health")
def get_health():
    uptime = time.time() - START_TIME
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_seconds": round(uptime, 2),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

@router.get("/system/status")
def get_system_status():
    return {
        "overall_status": "operational",
        "services": [
            {"name": "API Gateway", "status": "operational", "latency_ms": 12},
            {"name": "Build Engine", "status": "operational", "latency_ms": 45},
            {"name": "Edge Routing CDN", "status": "operational", "latency_ms": 18},
            {"name": "Database Cluster", "status": "operational", "latency_ms": 5},
            {"name": "Log Aggregator", "status": "operational", "latency_ms": 28},
        ],
        "regions": [
            {"region": "us-east-1", "status": "operational", "nodes": 12},
            {"region": "us-west-2", "status": "operational", "nodes": 8},
            {"region": "eu-central-1", "status": "operational", "nodes": 10},
            {"region": "ap-southeast-1", "status": "operational", "nodes": 6},
        ]
    }
