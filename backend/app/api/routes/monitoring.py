from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from prometheus_client import REGISTRY
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.middleware import jwt
from app.db.models import Deployment, Project
from app.db.session import db_session

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

_COUNTER_SAMPLES = {
    "nexusdeploy_deployments_started_total": "started_total",
    "nexusdeploy_deployments_success_total": "successful_total",
    "nexusdeploy_deployments_failed_total": "failed_total",
}
_DURATION_COUNT_SAMPLE = "nexusdeploy_deployment_duration_seconds_count"
_DURATION_SUM_SAMPLE = "nexusdeploy_deployment_duration_seconds_sum"
_REQUEST_TOTAL_SAMPLE = "http_requests_total"


@router.get("/summary")
def get_monitoring_summary(_: bool = Depends(jwt.jwt_verify_middleware)):
    providers: dict[str, dict[str, int | float]] = {}
    requests = {"total": 0, "server_errors_total": 0}

    for metric_family in REGISTRY.collect():
        for sample in metric_family.samples:
            if sample.name == _REQUEST_TOTAL_SAMPLE:
                requests["total"] += int(sample.value)
                if int(sample.labels.get("status", "0")) >= 500:
                    requests["server_errors_total"] += int(sample.value)
                continue

            if sample.name not in _COUNTER_SAMPLES and sample.name not in {
                _DURATION_COUNT_SAMPLE,
                _DURATION_SUM_SAMPLE,
            }:
                continue

            provider = sample.labels.get("provider", "unknown")
            values = providers.setdefault(
                provider,
                {
                    "started_total": 0,
                    "successful_total": 0,
                    "failed_total": 0,
                    "duration_observations": 0,
                    "duration_total_seconds": 0.0,
                },
            )

            if sample.name in _COUNTER_SAMPLES:
                values[_COUNTER_SAMPLES[sample.name]] += sample.value
            elif sample.name == _DURATION_COUNT_SAMPLE:
                values["duration_observations"] += sample.value
            else:
                values["duration_total_seconds"] += sample.value

    def summarize(values: dict[str, int | float]) -> dict[str, int | float | None]:
        observations = int(values["duration_observations"])
        return {
            "started_total": int(values["started_total"]),
            "successful_total": int(values["successful_total"]),
            "failed_total": int(values["failed_total"]),
            "duration_observations": observations,
            "average_duration_seconds": (
                values["duration_total_seconds"] / observations if observations else None
            ),
        }

    totals = {
        key: sum(values[key] for values in providers.values())
        for key in (
            "started_total",
            "successful_total",
            "failed_total",
            "duration_observations",
            "duration_total_seconds",
        )
    }

    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "requests": requests,
        "deployments": {
            **summarize(totals),
            "providers": {provider: summarize(values) for provider, values in providers.items()},
        },
    }


@router.get("/projects/{project_id}/summary")
async def get_project_monitoring_summary(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(db_session),
    _: bool = Depends(jwt.jwt_verify_middleware),
):
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc

    project = await db.get(Project, project_uuid)
    if project is None or project.owner_id != uuid.UUID(str(request.state.user_id)):
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Deployment).where(Deployment.project_id == project_uuid)
    )
    deployment_rows = result.scalars().all()
    providers: dict[str, dict[str, int | float]] = {}
    for deployment in deployment_rows:
        values = providers.setdefault(
            deployment.provider,
            {
                "started_total": 0,
                "successful_total": 0,
                "failed_total": 0,
                "duration_observations": 0,
                "duration_total_seconds": 0.0,
            },
        )
        values["started_total"] += 1
        if deployment.status == "success":
            values["successful_total"] += 1
        elif deployment.status == "failed":
            values["failed_total"] += 1
        if deployment.started_at and deployment.completed_at:
            values["duration_observations"] += 1
            values["duration_total_seconds"] += (
                deployment.completed_at - deployment.started_at
            ).total_seconds()

    def summarize(values: dict[str, int | float]) -> dict[str, int | float | None]:
        observations = int(values["duration_observations"])
        return {
            "started_total": int(values["started_total"]),
            "successful_total": int(values["successful_total"]),
            "failed_total": int(values["failed_total"]),
            "duration_observations": observations,
            "average_duration_seconds": (
                values["duration_total_seconds"] / observations if observations else None
            ),
        }

    totals = {
        key: sum(values[key] for values in providers.values())
        for key in (
            "started_total",
            "successful_total",
            "failed_total",
            "duration_observations",
            "duration_total_seconds",
        )
    }
    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "deployment_records",
        "deployments": {
            **summarize(totals),
            "providers": {provider: summarize(values) for provider, values in providers.items()},
        },
    }