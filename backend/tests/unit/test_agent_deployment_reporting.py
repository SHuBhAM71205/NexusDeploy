import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
import pytest_asyncio
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
from app.api.routes.deployments import _load_loki_logs
from app.core.config import settings
from app.db.models import Base, Deployment, Project, User
from app.main import app
from app.db.session import db_session


@pytest_asyncio.fixture
async def sqlite_session():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
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
async def test_agent_report_creates_and_updates_deployment(sqlite_session):
    session: AsyncSession = sqlite_session
    user = User(email="agent-owner@example.com", name="Agent Owner")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    project = Project(
        owner_id=user.id,
        name="demo-api",
        platform="render",
        repo_url="https://github.com/nexusdeploy/demo-api",
        branch="main",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    payload = {
        "job_id": "job-123",
        "project_id": str(project.id),
        "provider": "render",
        "status": "started",
        "environment": "production",
        "branch": "main",
        "provider_metadata": {"backendId": "svc-1", "backendUrl": "https://api.example.com"},
    }

    created = await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(payload))
    assert created["status"] == "started"

    deployment = (await session.execute(
        __import__("sqlalchemy").select(Deployment).where(Deployment.job_id == "job-123")
    )).scalar_one()
    assert deployment.status == "started"
    assert deployment.project_id == project.id

    update = {
        "job_id": "job-123",
        "project_id": str(project.id),
        "provider": "render",
        "status": "success",
        "url": "https://demo.example.com",
        "provider_metadata": {"backendId": "svc-1", "backendUrl": "https://api.example.com", "frontendId": "site-1"},
        "started_at": "2026-09-27T12:00:00+00:00",
        "completed_at": "2026-09-27T12:05:00+00:00",
    }
    updated = await upsert_agent_deployment_report(session, AgentDeploymentReport.model_validate(update))

    rows = (await session.execute(__import__("sqlalchemy").select(Deployment).where(Deployment.job_id == "job-123"))).scalars().all()
    assert len(rows) == 1
    assert rows[0].status == "success"
    assert rows[0].url == "https://demo.example.com"
    assert rows[0].provider_metadata["frontendId"] == "site-1"
    assert updated["status"] == "success"
    
    # Verify no duplicate deployment records created
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_agent_report_rejects_unknown_project_or_unauthorized(sqlite_session):
    client = TestClient(app)
    missing = client.post(
        "/api/v1/agent/deployments/report",
        json={
            "job_id": "job-missing-project",
            "project_id": str(uuid4()),
            "provider": "vercel",
            "status": "started",
        },
        headers={"Authorization": f"Bearer {settings.AGENT_SERVICE_TOKEN}"},
    )
    assert missing.status_code == 404

    unauthorized = client.post(
        "/api/v1/agent/deployments/report",
        json={
            "job_id": "job-unauthorized",
            "project_id": str(uuid4()),
            "provider": "vercel",
            "status": "started",
        },
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert unauthorized.status_code == 401


@pytest.mark.asyncio
async def test_loki_deployment_logs_are_parsed(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "data": {
                    "result": [{
                        "stream": {"level": "error"},
                        "values": [["1780000000000000000", '{"job_id":"job-123","timestamp":"2026-09-30T12:00:00+00:00","message":"Build failed"}']],
                    }]
                }
            }

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url, params):
            assert "job_id = \"job-123\"" in params["query"]
            return FakeResponse()

    monkeypatch.setattr("app.api.routes.deployments.httpx.AsyncClient", FakeAsyncClient)
    deployment = Deployment(
        job_id="job-123",
        started_at=datetime(2026, 9, 30, tzinfo=timezone.utc),
    )

    logs = await _load_loki_logs(deployment)

    assert logs == [{
        "timestamp": "2026-09-30T12:00:00+00:00",
        "level": "error",
        "message": "Build failed",
    }]
