from typing import List, Optional
from fastapi import APIRouter
from app.db.store import store
from app.schemas.activity import ActivityItem

router = APIRouter(prefix="/activities", tags=["Activities"])

@router.get("", response_model=List[ActivityItem])
def list_activities(limit: Optional[int] = 20):
    return store.activities[:limit]
