import uuid
from datetime import date
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["Settings"])

class WorkspaceSettings(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    plan: Optional[str] = None
    concurrency_limit: Optional[int] = None
    retention_days: Optional[int] = None
    log_retention_days: Optional[int] = None
    auto_deploy_on_push: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    alert_email: Optional[str] = None
    slack_webhook: Optional[str] = None

class CreateApiKeyRequest(BaseModel):
    name: str

_workspace_state: Dict[str, Any] = {
    "name": "Acme Inc.",
    "slug": "acme-inc",
    "plan": "Enterprise Pro",
    "concurrency_limit": 10,
    "retention_days": 90,
    "log_retention_days": 90,
    "auto_deploy_on_push": True,
    "notifications_enabled": True,
    "alert_email": "ops@acme-corp.internal",
    "slack_webhook": "https://hooks.slack.com/services/T00/B00/X00",
}

_api_keys: List[Dict[str, Any]] = [
    {"id": "key-1", "name": "CI/CD Pipeline", "prefix": "nx_live_9a8f...", "key": "nx_live_9a8f71b2e3c4d5e6f7a8b9c0", "created_at": "2026-06-10", "last_used": "10 minutes ago"},
    {"id": "key-2", "name": "Terraform Deployer", "prefix": "nx_live_b21c...", "key": "nx_live_b21c43d2e1f0a9b8c7d6e5f4", "created_at": "2026-07-02", "last_used": "Yesterday"},
]

@router.get("")
@router.get("/")
def get_settings():
    state = dict(_workspace_state)
    state["api_keys"] = _api_keys
    return state

@router.put("")
@router.put("/")
def update_settings(settings: WorkspaceSettings):
    global _workspace_state
    updates = {k: v for k, v in settings.model_dump().items() if v is not None}
    _workspace_state.update(updates)
    state = dict(_workspace_state)
    state["api_keys"] = _api_keys
    return state

@router.get("/workspace")
def get_workspace_settings():
    return _workspace_state

@router.put("/workspace")
def update_workspace_settings(settings: WorkspaceSettings):
    global _workspace_state
    updates = {k: v for k, v in settings.model_dump().items() if v is not None}
    _workspace_state.update(updates)
    return _workspace_state

@router.get("/api-keys")
def get_api_keys():
    return _api_keys

@router.post("/api-keys")
def create_api_key(req: CreateApiKeyRequest):
    new_id = f"key-{uuid.uuid4().hex[:6]}"
    raw_token = f"nx_live_{uuid.uuid4().hex[:16]}"
    new_item = {
        "id": new_id,
        "name": req.name,
        "prefix": f"{raw_token[:12]}...",
        "key": raw_token,
        "created_at": str(date.today()),
        "last_used": "Just now",
    }
    _api_keys.append(new_item)
    return new_item

@router.delete("/api-keys/{key_id}")
def delete_api_key(key_id: str):
    global _api_keys
    initial_len = len(_api_keys)
    _api_keys = [k for k in _api_keys if k["id"] != key_id]
    if len(_api_keys) == initial_len:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"message": "Key deleted successfully", "id": key_id}
