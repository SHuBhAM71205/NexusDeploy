from typing import Optional
from pydantic import BaseModel

class ActivityItem(BaseModel):
    id: str
    action: str
    project_name: str
    user_name: str
    timestamp: str
    type: str  # deploy, rollback, env_update, project_created, domain_added
    status: str  # success, in_progress, failed
    details: Optional[str] = None
