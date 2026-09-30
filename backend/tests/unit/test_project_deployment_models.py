from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Base, Deployment, Project, User


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fks(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def _create_user(db: Session, email: str = "owner@example.com") -> User:
    user = User(email=email, name="Owner")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_project(db: Session, owner: User, name: str = "api-gateway") -> Project:
    project = Project(
        name=name,
        owner_id=owner.id,
        platform="vercel",
        repo_url="https://github.com/nexusdeploy/api-gateway",
        root_directory="D:/apps/api-gateway",
        branch="main",
        framework="React / Vite",
        status="active",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def test_project_can_be_created_with_user_relationship(session: Session):
    user = _create_user(session)
    project = _create_project(session, user)

    session.refresh(user)
    assert project.owner_id == user.id
    assert project.owner.email == user.email
    assert len(user.projects) == 1
    assert user.projects[0].id == project.id


def test_deployment_can_be_created_for_a_project(session: Session):
    user = _create_user(session)
    project = _create_project(session, user)
    started = datetime.now(timezone.utc)

    deployment = Deployment(
        project_id=project.id,
        job_id="job-abc-123",
        provider="vercel",
        status="running",
        environment="production",
        branch="main",
        url=None,
        error=None,
        provider_metadata={"frontendId": "prj_123"},
        started_at=started,
    )
    session.add(deployment)
    session.commit()
    session.refresh(deployment)

    assert deployment.project_id == project.id
    assert deployment.project.name == project.name
    assert deployment.job_id == "job-abc-123"
    assert deployment.provider_metadata["frontendId"] == "prj_123"


def test_multiple_deployments_belong_to_one_project(session: Session):
    user = _create_user(session)
    project = _create_project(session, user)

    first = Deployment(
        project_id=project.id,
        job_id="job-1",
        provider="vercel",
        status="success",
        environment="production",
    )
    second = Deployment(
        project_id=project.id,
        job_id="job-2",
        provider="vercel",
        status="failed",
        environment="staging",
        error="Build failed",
    )
    session.add_all([first, second])
    session.commit()
    session.refresh(project)

    assert {d.job_id for d in project.deployments} == {"job-1", "job-2"}
    assert len(project.deployments) == 2


def test_job_id_must_be_unique(session: Session):
    user = _create_user(session)
    project = _create_project(session, user)
    session.add(
        Deployment(
            project_id=project.id,
            job_id="job-unique",
            provider="render",
            status="started",
        )
    )
    session.commit()

    session.add(
        Deployment(
            project_id=project.id,
            job_id="job-unique",
            provider="render",
            status="running",
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_deployment_foreign_key_requires_existing_project(session: Session):
    session.add(
        Deployment(
            project_id=uuid4(),
            job_id="job-orphan",
            provider="netlify",
            status="started",
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_deleting_project_cascades_to_deployments(session: Session):
    user = _create_user(session)
    project = _create_project(session, user)
    session.add(
        Deployment(
            project_id=project.id,
            job_id="job-cascade",
            provider="railway",
            status="success",
        )
    )
    session.commit()

    session.delete(project)
    session.commit()

    assert session.query(Deployment).count() == 0
    assert session.query(Project).count() == 0


def test_deleting_user_cascades_to_projects(session: Session):
    user = _create_user(session)
    _create_project(session, user)

    session.delete(user)
    session.commit()

    assert session.query(Project).count() == 0
    assert session.query(User).count() == 0
