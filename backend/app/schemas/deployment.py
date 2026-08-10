from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LogLine(BaseModel):
    timestamp: str
    level: str = "info"  # info, warn, error, success, debug
    message: str

class DeploymentTrigger(BaseModel):
    project_id: str
    environment: str = "production"  # production, staging, preview
    branch: Optional[str] = "main"
    commit_message: Optional[str] = "Manual trigger from dashboard"
    trigger_type: str = "manual"  # manual, webhook, git_push, rollback

class RollbackRequest(BaseModel):
    deployment_id: str
    target_environment: str = "production"

class DeploymentResponse(BaseModel):
    id: str
    project_id: str
    project_name: str
    environment: str
    status: str  # Success, Building, Failed, Queued, Rolled Back
    branch: str
    commit_hash: str
    commit_message: str
    author: str
    started_at: str
    completed_at: Optional[str] = None
    duration: Optional[str] = None
    url: Optional[str] = None
    logs_count: int = 0
    trigger_type: str = "manual"

class DeploymentDetail(DeploymentResponse):
    logs: List[LogLine] = []
    build_metrics: Optional[Dict[str, Any]] = None
