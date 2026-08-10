from fastapi import APIRouter
from app.db.store import store

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("")
def get_dashboard_stats():
    total_projects = len(store.projects)
    total_deploys = sum(p.get("total_deploys", 0) for p in store.projects.values())
    
    return {
        "active_projects": {
            "label": "Active projects",
            "value": str(total_projects),
            "detail": "+2 this month",
            "change_type": "positive"
        },
        "successful_deploys": {
            "label": "Successful deploys",
            "value": "98.6%",
            "detail": "Last 30 days",
            "change_type": "positive"
        },
        "avg_build_time": {
            "label": "Average build time",
            "value": "1m 42s",
            "detail": "14% faster than last week",
            "change_type": "positive"
        },
        "bandwidth_usage": {
            "label": "Monthly Bandwidth",
            "value": "2.4 TB",
            "detail": "68% of 5 TB quota",
            "change_type": "neutral"
        },
        "total_deployments_today": 28,
        "cluster_health": {
            "status": "operational",
            "uptime_percentage": 99.98,
            "total_containers": 64,
            "running_containers": 64,
            "cpu_utilization_pct": 34.2,
            "memory_utilization_pct": 52.8,
            "regions_online": 4,
            "total_regions": 4
        }
    }
