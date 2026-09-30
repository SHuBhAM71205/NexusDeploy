import uuid
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.middleware import jwt
from app.core.config import settings
from app.db.models import Deployment, Project
from app.db.session import db_session
from app.schemas.deployment import DeploymentDetail, DeploymentResponse, DeploymentTrigger, RollbackRequest

router = APIRouter(prefix="/deployments", tags=["Deployments"])


async def _load_loki_logs(deployment: Deployment) -> list[dict[str, str]]:
    start_at = deployment.started_at or deployment.created_at
    start_ns = str(int(start_at.timestamp() * 1_000_000_000))
    end_ns = str(int(datetime.now(timezone.utc).timestamp() * 1_000_000_000))
    query = f'{{service="nexusdeploy-agent"}} | json | job_id = "{deployment.job_id}"'

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"{settings.LOKI_URL.rstrip('/')}/loki/api/v1/query_range",
                params={"query": query, "start": start_ns, "end": end_ns, "direction": "forward", "limit": 1000},
            )
            response.raise_for_status()
            streams = response.json().get("data", {}).get("result", [])
    except (httpx.HTTPError, ValueError):
        return []

    logs = []
    for stream in streams:
        for timestamp_ns, line in stream.get("values", []):
            try:
                entry = json.loads(line)
            except (TypeError, json.JSONDecodeError):
                entry = {"message": line}
            timestamp = entry.get("timestamp") or datetime.fromtimestamp(
                int(timestamp_ns) / 1_000_000_000, timezone.utc
            ).isoformat()
            logs.append({
                "timestamp": timestamp,
                "level": stream.get("stream", {}).get("level", "info"),
                "message": str(entry.get("message", line)),
            })
    return logs


def _deployment_to_response(deployment: Deployment) -> DeploymentResponse:
    provider_metadata = deployment.provider_metadata or {}
    project_name = deployment.project.name if deployment.project is not None else ""
    logs = provider_metadata.get("logs") if isinstance(provider_metadata.get("logs"), list) else []
    trigger_type = provider_metadata.get("triggerType") or provider_metadata.get("trigger_type") or "manual"
    commit_hash = provider_metadata.get("commitHash") or provider_metadata.get("commit_hash")
    commit_message = provider_metadata.get("commitMessage") or provider_metadata.get("commit_message")
    author = provider_metadata.get("author")

    duration = None
    if deployment.started_at and deployment.completed_at:
        duration = str(deployment.completed_at - deployment.started_at)

    return DeploymentResponse(
        id=str(deployment.id),
        project_id=str(deployment.project_id),
        project_name=project_name,
        environment=deployment.environment,
        status=deployment.status,
        branch=deployment.branch,
        commit_hash=commit_hash,
        commit_message=commit_message,
        author=author,
        started_at=deployment.started_at.isoformat() if deployment.started_at else None,
        completed_at=deployment.completed_at.isoformat() if deployment.completed_at else None,
        duration=duration,
        url=deployment.url,
        logs_count=len(logs),
        trigger_type=trigger_type,
        provider=deployment.provider,
        error=deployment.error,
        provider_metadata=provider_metadata,
    )


@router.get("", response_model=List[DeploymentResponse])
async def list_deployments(
    request: Request,
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    environment: Optional[str] = Query(None, description="Filter by environment (production, staging, preview)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(db_session),
    _: bool = Depends(jwt.jwt_verify_middleware),
):
    user_id = uuid.UUID(str(request.state.user_id))
    query = (
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Project.owner_id == user_id)
        .options(selectinload(Deployment.project))
        .order_by(Deployment.created_at.desc())
    )
    if project_id:
        query = query.where(Deployment.project_id == uuid.UUID(project_id))
    if environment:
        query = query.where(Deployment.environment == environment)
    if status:
        query = query.where(Deployment.status == status)

    result = await db.execute(query)
    deployments = result.scalars().all()
    return [_deployment_to_response(deployment) for deployment in deployments]


@router.get("/{deployment_id}", response_model=DeploymentDetail)
async def get_deployment_detail(deployment_id: str, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    deployment = await db.get(Deployment, uuid.UUID(deployment_id))
    if deployment is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    project = await db.get(Project, deployment.project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Deployment not found")
    await db.refresh(deployment, attribute_names=["project"])
    response = DeploymentDetail.model_validate(_deployment_to_response(deployment).model_dump())
    provider_metadata = deployment.provider_metadata or {}
    response.logs = await _load_loki_logs(deployment)
    if not response.logs:
        response.logs = provider_metadata.get("logs", []) if isinstance(provider_metadata.get("logs"), list) else []
    return response


@router.post("/trigger", response_model=DeploymentDetail, status_code=201)
async def trigger_deployment(payload: DeploymentTrigger, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    project = await db.get(Project, uuid.UUID(payload.project_id))
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")

    deployment = Deployment(
        project_id=project.id,
        job_id=f"manual-{uuid.uuid4()}",
        provider=(project.platform or "vercel").lower(),
        status="started",
        environment=payload.environment or "production",
        branch=payload.branch or project.branch,
        url=None,
        error=None,
        provider_metadata={
            "triggerType": payload.trigger_type,
            "commitMessage": payload.commit_message,
            "branch": payload.branch or project.branch,
        },
        started_at=datetime.now(timezone.utc),
    )
    db.add(deployment)
    await db.commit()
    await db.refresh(deployment)
    await db.refresh(deployment, attribute_names=["project"])
    response = DeploymentDetail.model_validate(_deployment_to_response(deployment).model_dump())
    response.logs = []
    return response


@router.post("/rollback", response_model=DeploymentDetail)
async def rollback_deployment(payload: RollbackRequest, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    target = await db.get(Deployment, uuid.UUID(payload.deployment_id))
    if target is None:
        raise HTTPException(status_code=404, detail="Target deployment not found for rollback")
    project = await db.get(Project, target.project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Target deployment not found for rollback")

    rollback = Deployment(
        project_id=project.id,
        job_id=f"rollback-{uuid.uuid4()}",
        provider=(project.platform or target.provider or "vercel").lower(),
        status="started",
        environment=payload.target_environment or "production",
        branch=target.branch,
        url=target.url,
        started_at=datetime.now(timezone.utc),
        provider_metadata={
            "triggerType": "rollback",
            "rollbackOf": str(target.id),
            "targetEnvironment": payload.target_environment or "production",
        },
    )
    db.add(rollback)
    await db.commit()
    await db.refresh(rollback)
    await db.refresh(rollback, attribute_names=["project"])
    response = DeploymentDetail.model_validate(_deployment_to_response(rollback).model_dump())
    response.logs = []
    return response
