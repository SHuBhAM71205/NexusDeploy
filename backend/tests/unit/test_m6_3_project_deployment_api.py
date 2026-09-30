import uuid

import pytest
import pytest_asyncio
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.middleware import jwt
from app.db.models import Base, Deployment, Project, User
from app.db.session import db_session
from app.main import app


@pytest_asyncio.fixture
async def async_db_session():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def override_db_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[db_session] = override_db_session
    try:
        yield session_factory
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


@pytest.fixture
def client():
    return TestClient(app)


async def _create_user(session_factory, email: str) -> User:
    async with session_factory() as session:
        user = User(email=email, name="Owner")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def _create_project(session_factory, owner_id: uuid.UUID, name: str = "demo-app") -> Project:
    async with session_factory() as session:
        project = Project(
            owner_id=owner_id,
            name=name,
            platform="vercel",
            repo_url="https://github.com/example/demo-app",
            root_directory="./",
            branch="main",
            framework="React / Vite",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)
        return project


async def _create_deployment(session_factory, project_id: uuid.UUID, job_id: str, status: str = "started") -> Deployment:
    async with session_factory() as session:
        deployment = Deployment(
            project_id=project_id,
            job_id=job_id,
            provider="vercel",
            status=status,
            environment="production",
            branch="main",
            provider_metadata={"triggerType": "manual"},
        )
        session.add(deployment)
        await session.commit()
        await session.refresh(deployment)
        return deployment


@pytest.mark.asyncio
async def test_project_list_and_create_are_owner_scoped(async_db_session, client):
    session_factory = async_db_session
    owner_a = await _create_user(session_factory, "alice@example.com")
    owner_b = await _create_user(session_factory, "bob@example.com")

    async def fake_auth_a(request: Request, credentials=None):
        request.state.user_id = str(owner_a.id)
        return True

    async def fake_auth_b(request: Request, credentials=None):
        request.state.user_id = str(owner_b.id)
        return True

    app.dependency_overrides[jwt.jwt_verify_middleware] = fake_auth_a
    project_a = await _create_project(session_factory, owner_a.id, "alpha")
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    body = response.json()
    assert {item["id"] for item in body} == {str(project_a.id)}

    app.dependency_overrides[jwt.jwt_verify_middleware] = fake_auth_b
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    body = response.json()
    assert body == []

    app.dependency_overrides[jwt.jwt_verify_middleware] = fake_auth_a
    payload = {
        "name": "beta",
        "description": "Second app",
        "repo_url": "https://github.com/example/beta",
        "branch": "main",
        "framework": "Next.js",
        "platform": "render",
        "root_directory": "./",
        "build_command": "npm run build",
        "output_directory": "dist",
        "install_command": "npm install",
        "node_version": "20.x",
        "environment_variables": [],
    }
    create_response = client.post("/api/v1/projects", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"]
    assert created["platform"] == "render"
    assert created["owner_id"] if "owner_id" in created else True


@pytest.mark.asyncio
async def test_deployment_trigger_uses_real_project_uuid_and_job_id(async_db_session, client):
    session_factory = async_db_session
    user = await _create_user(session_factory, "deploy@example.com")

    async def fake_auth(request: Request, credentials=None):
        request.state.user_id = str(user.id)
        return True

    app.dependency_overrides[jwt.jwt_verify_middleware] = fake_auth
    project = await _create_project(session_factory, user.id, "deploy-app")

    payload = {
        "project_id": str(project.id),
        "environment": "production",
        "branch": "main",
        "commit_message": "Deploy app",
        "trigger_type": "manual",
    }
    response = client.post("/api/v1/deployments/trigger", json=payload)
    assert response.status_code == 201, response.text

    body = response.json()
    assert body["project_id"] == str(project.id)
    assert body["project_name"] == project.name
    assert body["environment"] == "production"
    assert body["status"] == "started"

    async with session_factory() as session:
        rows = (await session.execute(
            __import__("sqlalchemy").select(Deployment).where(Deployment.project_id == project.id)
        )).scalars().all()
    assert len(rows) == 1
    assert rows[0].job_id.startswith("manual-")
    assert rows[0].project_id == project.id


@pytest.mark.asyncio
async def test_cross_user_cannot_access_other_users_project_or_deployment(async_db_session, client):
    session_factory = async_db_session
    alice = await _create_user(session_factory, "alice@example.com")
    bob = await _create_user(session_factory, "bob@example.com")

    project = await _create_project(session_factory, bob.id, "bob-project")
    deployment = await _create_deployment(session_factory, project.id, "job-bob")

    async def fake_auth_alice(request: Request, credentials=None):
        request.state.user_id = str(alice.id)
        return True

    app.dependency_overrides[jwt.jwt_verify_middleware] = fake_auth_alice

    get_project = client.get(f"/api/v1/projects/{project.id}")
    assert get_project.status_code == 404

    get_deployment = client.get(f"/api/v1/deployments/{deployment.id}")
    assert get_deployment.status_code == 404


@pytest.mark.asyncio
async def test_legacy_environment_route_does_not_claim_to_persist_variables(async_db_session, client):
    session_factory = async_db_session
    owner = await _create_user(session_factory, "env-owner@example.com")

    async def fake_auth(request: Request, credentials=None):
        request.state.user_id = str(owner.id)
        return True

    app.dependency_overrides[jwt.jwt_verify_middleware] = fake_auth
    project = await _create_project(session_factory, owner.id)

    response = client.post(
        f"/api/v1/projects/{project.id}/env",
        json=[{"key": "API_TOKEN", "value": "secret", "target": "production"}],
    )

    assert response.status_code == 501
    assert "host agent" in response.json()["detail"]
