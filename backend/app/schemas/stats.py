from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class StatMetric(BaseModel):
    label: str
    value: str
    detail: str
    change_type: str = "positive"  # positive, neutral, negative

class ClusterHealth(BaseModel):
    status: str  # operational, degraded, maintenance
    uptime_percentage: float
    total_containers: int
    running_containers: int
    cpu_utilization_pct: float
    memory_utilization_pct: float
    regions_online: int
    total_regions: int

class DashboardStats(BaseModel):
    active_projects: StatMetric
    successful_deploys: StatMetric
    avg_build_time: StatMetric
    bandwidth_usage: StatMetric
    total_deployments_today: int
    cluster_health: ClusterHealth
