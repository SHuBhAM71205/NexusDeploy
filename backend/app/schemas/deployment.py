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
    status: str
    branch: Optional[str] = None
    commit_hash: Optional[str] = None
    commit_message: Optional[str] = None
    author: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration: Optional[str] = None
    url: Optional[str] = None
    logs_count: int = 0
    trigger_type: Optional[str] = "manual"
    provider: Optional[str] = None
    error: Optional[str] = None
    provider_metadata: Optional[Dict[str, Any]] = None

class DeploymentDetail(DeploymentResponse):
    logs: List[LogLine] = []
    build_metrics: Optional[Dict[str, Any]] = None
