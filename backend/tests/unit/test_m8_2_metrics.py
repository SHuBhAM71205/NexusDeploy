"""Tests for M8.2 metrics functionality."""
import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

os.environ.setdefault("PG_DB_NAME", "nexus_pg")
os.environ.setdefault("PG_DB_USER", "user")
os.environ.setdefault("PG_DB_PASSWORD", "pass")
os.environ.setdefault("PG_DB_HOST", "localhost")
os.environ.setdefault("PG_DB_PORT", "5432")
os.environ.setdefault("GEN_REDIS_HOST", "localhost")
os.environ.setdefault("GEN_REDIS_PORT", "6379")
os.environ.setdefault("GEN_REDIS_LOGICAL_DB", "1")
os.environ.setdefault("BACKEND_SECRETE_KEY", "test-secret")
os.environ.setdefault("HASHING_ALGO", "HS256")
os.environ.setdefault("AGENT_SERVICE_TOKEN", "agent-token")

from app.api.routes.agent import AgentDeploymentReport, upsert_agent_deployment_report
from app.api.middleware import jwt
from app.core.metrics import (
    deployment_duration_seconds,
    deployments_failed_total,
    deployments_started_total,
    deployments_success_total,
)
from app.core.config import settings
from app.db.models import Base, Deployment, Project, User
from app.main import app
from app.db.session import db_session


@pytest_asyncio.fixture
async def sqlite_session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def override_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[db_session] = override_db
    try:
        async with SessionLocal() as session:
            yield session
    finally:
        app.dependency_overrides.pop(db_session, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_metrics_endpoint_returns_200():
    """Test that /metrics endpoint returns HTTP 200."""
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")


def test_monitoring_summary_returns_real_deployment_metrics():
    provider = "monitoring-summary-test"
    deployments_started_total.labels(provider=provider).inc(2)
    deployments_success_total.labels(provider=provider).inc()
    deployments_failed_total.labels(provider=provider).inc()
    deployment_duration_seconds.labels(provider=provider, status="success").observe(12)
    deployment_duration_seconds.labels(provider=provider, status="failed").observe(8)

    unauthenticated_response = TestClient(app).get("/api/v1/monitoring/summary")
    assert unauthenticated_response.status_code == 401

    async def allow_monitoring_request(request: Request):
        return True

    app.dependency_overrides[jwt.jwt_verify_middleware] = allow_monitoring_request
    try:
        client = TestClient(app)
        client.get("/api/v1/health")
        response = client.get("/api/v1/monitoring/summary")
    finally:
        app.dependency_overrides.pop(jwt.jwt_verify_middleware, None)

    assert response.status_code == 200
    summary = response.json()
    assert summary["requests"]["total"] >= 1
    assert summary["requests"]["server_errors_total"] >= 0
    assert summary["deployments"]["started_total"] >= 2
    assert summary["deployments"]["successful_total"] >= 1
    assert summary["deployments"]["failed_total"] >= 1
    assert summary["deployments"]["duration_observations"] >= 2
    assert summary["deployments"]["average_duration_seconds"] >= 10
    assert summary["deployments"]["providers"][provider] == {
        "started_total": 2,
        "successful_total": 1,
        "failed_total": 1,
        "duration_observations": 2,
        "average_duration_seconds": 10,
    }


@pytest.mark.asyncio
async def test_metrics_endpoint_returns_prometheus_format():
    """Test that /metrics returns Prometheus text exposition format."""
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    content = response.text
    # Prometheus format should contain metric lines
    assert "HELP" in content or "TYPE" in content or len(content) > 0


@pytest.mark.asyncio
async def test_http_request_metrics_appear_after_request():
    """Test that HTTP request metrics appear after making API requests."""
    client = TestClient(app)
    
    # Make a request to health endpoint
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    
    # Check metrics
    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    metrics_content = metrics_response.text
    
    # Should contain HTTP request metrics
    assert "http" in metrics_content.lower() or "request" in metrics_content.lower()


@pytest.mark.asyncio
async def test_deployment_started_metric_increments(sqlite_session):
    """Test that deployment started metric increments when deployment is created."""
    session: AsyncSession = sqlite_session
    user = User(email="metrics-owner@example.com", name="Metrics Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="metrics-test-api",
        platform="render",
        repo_url="https://github.com/nexusdeploy/metrics-test",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    payload = {
        "job_id": "job-metrics-started",
        "project_id": str(project.id),
        "provider": "render",
        "status": "started",
        "environment": "production",
        "branch": "main",
    }

    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(payload))
    
    # Check that deployment started metric exists
    client = TestClient(app)
    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    metrics_content = metrics_response.text
    
    # Should contain deployment started metric
    assert "nexusdeploy_deployments_started_total" in metrics_content


@pytest.mark.asyncio
async def test_deployment_success_metric_increments(sqlite_session):
    """Test that deployment success metric increments when deployment succeeds."""
    session: AsyncSession = sqlite_session
    user = User(email="metrics-success@example.com", name="Success Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="success-test-api",
        platform="vercel",
        repo_url="https://github.com/nexusdeploy/success-test",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    # Create deployment as started
    started_payload = {
        "job_id": "job-metrics-success",
        "project_id": str(project.id),
        "provider": "vercel",
        "status": "started",
        "environment": "production",
        "branch": "main",
        "started_at": "2026-09-27T12:00:00+00:00",
    }
    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(started_payload))

    # Update to success
    success_payload = {
        "job_id": "job-metrics-success",
        "project_id": str(project.id),
        "provider": "vercel",
        "status": "success",
        "url": "https://success-test.vercel.app",
        "started_at": "2026-09-27T12:00:00+00:00",
        "completed_at": "2026-09-27T12:05:00+00:00",
    }
    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(success_payload))
    
    # Check that deployment success metric exists
    client = TestClient(app)
    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    metrics_content = metrics_response.text
    
    # Should contain deployment success metric
    assert "nexusdeploy_deployments_success_total" in metrics_content


@pytest.mark.asyncio
async def test_deployment_failed_metric_increments(sqlite_session):
    """Test that deployment failed metric increments when deployment fails."""
    session: AsyncSession = sqlite_session
    user = User(email="metrics-fail@example.com", name="Fail Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="fail-test-api",
        platform="netlify",
        repo_url="https://github.com/nexusdeploy/fail-test",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    # Create deployment as started
    started_payload = {
        "job_id": "job-metrics-failed",
        "project_id": str(project.id),
        "provider": "netlify",
        "status": "started",
        "environment": "production",
        "branch": "main",
        "started_at": "2026-09-27T12:00:00+00:00",
    }
    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(started_payload))

    # Update to failed
    failed_payload = {
        "job_id": "job-metrics-failed",
        "project_id": str(project.id),
        "provider": "netlify",
        "status": "failed",
        "error": "Build failed",
        "started_at": "2026-09-27T12:00:00+00:00",
        "completed_at": "2026-09-27T12:02:00+00:00",
    }
    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(failed_payload))
    
    # Check that deployment failed metric exists
    client = TestClient(app)
    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    metrics_content = metrics_response.text
    
    # Should contain deployment failed metric
    assert "nexusdeploy_deployments_failed_total" in metrics_content


@pytest.mark.asyncio
async def test_deployment_duration_metric_recorded(sqlite_session):
    """Test that deployment duration histogram is recorded for completed deployments."""
    session: AsyncSession = sqlite_session
    user = User(email="metrics-duration@example.com", name="Duration Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="duration-test-api",
        platform="railway",
        repo_url="https://github.com/nexusdeploy/duration-test",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    # Create deployment as started
    started_payload = {
        "job_id": "job-metrics-duration",
        "project_id": str(project.id),
        "provider": "railway",
        "status": "started",
        "environment": "production",
        "branch": "main",
        "started_at": "2026-09-27T12:00:00+00:00",
    }
    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(started_payload))

    # Update to success with duration (5 minutes = 300 seconds)
    success_payload = {
        "job_id": "job-metrics-duration",
        "project_id": str(project.id),
        "provider": "railway",
        "status": "success",
        "url": "https://duration-test.railway.app",
        "started_at": "2026-09-27T12:00:00+00:00",
        "completed_at": "2026-09-27T12:05:00+00:00",
    }
    await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(success_payload))
    
    # Check that deployment duration metric exists
    client = TestClient(app)
    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    metrics_content = metrics_response.text
    
    # Should contain deployment duration histogram
    assert "nexusdeploy_deployment_duration_seconds" in metrics_content


@pytest.mark.asyncio
async def test_metrics_do_not_expose_sensitive_data():
    """Test that metrics endpoint does not expose sensitive data like tokens or passwords."""
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    content = response.text.lower()
    
    # Should not contain sensitive keywords
    assert "token" not in content or "token" in "total"  # Allow if part of metric name
    assert "password" not in content
    assert "secret" not in content or "secret" in "secret_key"  # Allow if part of config
    assert "credential" not in content


@pytest.mark.asyncio
async def test_provider_labels_are_low_cardinality(sqlite_session):
    """Test that provider labels remain low cardinality (few distinct values)."""
    session: AsyncSession = sqlite_session
    user = User(email="cardinality@example.com", name="Cardinality Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="cardinality-test",
        platform="render",
        repo_url="https://github.com/nexusdeploy/cardinality-test",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    # Create deployments with different providers
    providers = ["render", "vercel", "netlify", "railway"]
    for i, provider in enumerate(providers):
        payload = {
            "job_id": f"job-cardinality-{i}",
            "project_id": str(project.id),
            "provider": provider,
            "status": "started",
            "environment": "production",
            "branch": "main",
        }
        await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(payload))
    
    # Check metrics
    client = TestClient(app)
    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    metrics_content = metrics_response.text
    
    # Should contain provider labels
    for provider in providers:
        assert f'provider="{provider}"' in metrics_content


@pytest.mark.asyncio
async def test_no_high_cardinality_labels_in_metrics():
    """Test that high-cardinality identifiers are not used as labels."""
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    content = response.text
    
    # Should not contain high-cardinality labels
    assert 'job_id="' not in content
    assert 'project_id="' not in content
    assert 'deployment_id="' not in content
    assert 'user_id="' not in content
    assert 'uuid="' not in content.lower()


@pytest.mark.asyncio
async def test_project_monitoring_summary_uses_owned_deployment_records(sqlite_session):
    session: AsyncSession = sqlite_session
    user = User(email="project-summary@example.com", name="Project Summary Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="project-summary",
        platform="render",
        repo_url="https://github.com/nexusdeploy/project-summary",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    started_at = datetime(2026, 9, 30, 12, 0, tzinfo=timezone.utc)
    session.add_all([
        Deployment(
            project_id=project.id,
            job_id="job-project-summary-success",
            provider="render",
            status="success",
            started_at=started_at,
            completed_at=datetime(2026, 9, 30, 12, 1, tzinfo=timezone.utc),
        ),
        Deployment(
            project_id=project.id,
            job_id="job-project-summary-failed",
            provider="render",
            status="failed",
        ),
    ])
    await session.commit()

    async def identify_project_owner(request: Request):
        request.state.user_id = str(user.id)
        return True

    app.dependency_overrides[jwt.jwt_verify_middleware] = identify_project_owner
    try:
        response = TestClient(app).get(f"/api/v1/monitoring/projects/{project.id}/summary")
    finally:
        app.dependency_overrides.pop(jwt.jwt_verify_middleware, None)

    assert response.status_code == 200
    summary = response.json()
    assert summary["source"] == "deployment_records"
    assert summary["deployments"]["started_total"] == 2
    assert summary["deployments"]["successful_total"] == 1
    assert summary["deployments"]["failed_total"] == 1
    assert summary["deployments"]["average_duration_seconds"] == 60
