from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.metrics import (
    deployments_started_total,
    deployments_success_total,
    deployments_failed_total,
    deployment_duration_seconds,
)
from app.db.models import Deployment, Project
from app.db.session import db_session

router = APIRouter(prefix="/agent", tags=["agent"])
security_scheme = HTTPBearer(auto_error=False)


class AgentDeploymentReport(BaseModel):
    job_id: str = Field(..., min_length=1)
    project_id: str = Field(..., min_length=1)
    provider: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    environment: str = Field("production")
    branch: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None
    provider_metadata: Optional[dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"started", "running", "success", "failed"}
        if value not in allowed:
            raise ValueError(f"status must be one of: {sorted(allowed)}")
        return value

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, value: str) -> str:
        try:
            UUID(value)
        except ValueError as exc:
            raise ValueError("project_id must be a valid UUID") from exc
        return value


async def require_agent_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    if credentials.credentials != settings.AGENT_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent credentials.",
        )

    return True


def _parse_ts(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value)


async def upsert_agent_deployment_report(session: AsyncSession, payload: AgentDeploymentReport) -> dict:
    project_uuid = UUID(payload.project_id)
    project = await session.get(Project, project_uuid)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found for deployment report.",
        )

    existing_result = await session.execute(
        select(Deployment).where(Deployment.job_id == payload.job_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing is None:
        deployment = Deployment(
            project_id=project.id,
            job_id=payload.job_id,
            provider=payload.provider,
            status=payload.status,
            url=payload.url,
            error=payload.error,
            environment=payload.environment,
            branch=payload.branch,
            provider_metadata=payload.provider_metadata,
            started_at=_parse_ts(payload.started_at),
            completed_at=_parse_ts(payload.completed_at),
        )
        session.add(deployment)
        await session.commit()

        # Track deployment started metric
        deployments_started_total.labels(provider=payload.provider).inc()

        # Track terminal state metrics if created with success/failed status
        if payload.status == "success":
            deployments_success_total.labels(provider=payload.provider).inc()
        elif payload.status == "failed":
            deployments_failed_total.labels(provider=payload.provider).inc()

        # Track duration if completed
        if payload.status in ["success", "failed"] and deployment.started_at and deployment.completed_at:
            duration = (deployment.completed_at - deployment.started_at).total_seconds()
            deployment_duration_seconds.labels(provider=payload.provider, status=payload.status).observe(duration)

        return {
            "job_id": payload.job_id,
            "project_id": str(project.id),
            "status": payload.status,
            "message": "Deployment report accepted.",
        }

    # Track previous status for metrics
    previous_status = existing.status

    existing.project_id = project.id
    existing.provider = payload.provider
    existing.status = payload.status
    existing.url = payload.url
    existing.error = payload.error
    existing.environment = payload.environment
    existing.branch = payload.branch
    existing.provider_metadata = payload.provider_metadata or existing.provider_metadata
    if payload.started_at is not None:
        existing.started_at = _parse_ts(payload.started_at)
    if payload.completed_at is not None:
        existing.completed_at = _parse_ts(payload.completed_at)

    await session.commit()

    # Track deployment lifecycle metrics on status transitions
    provider = payload.provider
    current_status = payload.status

    # Track success/failure when status changes to terminal state
    if previous_status != current_status:
        if current_status == "success":
            deployments_success_total.labels(provider=provider).inc()
        elif current_status == "failed":
            deployments_failed_total.labels(provider=provider).inc()

        # Track duration for completed deployments
        if current_status in ["success", "failed"] and existing.started_at and existing.completed_at:
            duration = (existing.completed_at - existing.started_at).total_seconds()
            deployment_duration_seconds.labels(provider=provider, status=current_status).observe(duration)

    return {
        "job_id": payload.job_id,
        "project_id": str(existing.project_id),
        "status": existing.status,
        "message": "Deployment report updated.",
    }


@router.post("/deployments/report", status_code=status.HTTP_200_OK)
async def report_agent_deployment(
    payload: AgentDeploymentReport,
    _: bool = Depends(require_agent_token),
    db: AsyncSession = Depends(db_session),
):
    return await upsert_agent_deployment_report(db, payload)
