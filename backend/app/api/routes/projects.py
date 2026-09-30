import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.middleware import jwt
from app.db.models import Project
from app.db.session import db_session
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Projects"])


def _as_iso(value) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()


def _project_to_response(project: Project) -> ProjectResponse:
    deployments = project.deployments or []
    total_deploys = len(deployments)
    active_deployments_count = sum(
        1 for deployment in deployments if deployment.status.lower() in {"started", "running", "queued", "building"}
    )
    last_deployed_at = None
    for deployment in deployments:
        candidate = deployment.completed_at or deployment.started_at
        if candidate is not None and (last_deployed_at is None or candidate > last_deployed_at):
            last_deployed_at = candidate

    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        repo_url=project.repo_url,
        branch=project.branch,
        framework=project.framework,
        platform=project.platform,
        root_directory=project.root_directory or "./",
        build_command=project.build_command,
        output_directory=project.output_directory,
        install_command=project.install_command,
        node_version=project.node_version,
        status=project.status,
        created_at=_as_iso(project.created_at),
        updated_at=_as_iso(project.updated_at),
        last_deployed_at=_as_iso(last_deployed_at),
        production_url=None,
        staging_url=None,
        total_deploys=total_deploys,
        active_deployments_count=active_deployments_count,
        domains=[],
        environment_variables=[],
        owner_id=str(project.owner_id),
    )


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    request: Request,
    search: Optional[str] = Query(None, description="Search by project name or framework"),
    framework: Optional[str] = Query(None, description="Filter by framework"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(db_session),
    _: bool = Depends(jwt.jwt_verify_middleware),
):
    user_id = uuid.UUID(str(request.state.user_id))
    query = (
        select(Project)
        .where(Project.owner_id == user_id)
        .options(selectinload(Project.deployments))
        .order_by(Project.created_at.desc())
    )
    result = await db.execute(query)
    projects = result.scalars().all()

    if search:
        needle = search.lower()
        projects = [
            project for project in projects
            if needle in project.name.lower()
            or (project.framework and needle in project.framework.lower())
            or (project.description and needle in project.description.lower())
        ]
    if framework:
        projects = [project for project in projects if project.framework and framework.lower() in project.framework.lower()]
    if status:
        projects = [project for project in projects if project.status.lower() == status.lower()]
    return [_project_to_response(project) for project in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    project = await db.get(Project, uuid.UUID(project_id))
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.refresh(project, attribute_names=["deployments"])
    return _project_to_response(project)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(payload: ProjectCreate, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    project = Project(
        owner_id=user_id,
        name=payload.name,
        description=payload.description,
        platform=payload.platform or "vercel",
        repo_url=payload.repo_url,
        root_directory=payload.root_directory or "./",
        branch=payload.branch or "main",
        framework=payload.framework or "React",
        build_command=payload.build_command or "npm run build",
        output_directory=payload.output_directory or "dist",
        install_command=payload.install_command or "npm install",
        node_version=payload.node_version or "20.x",
        status="active",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    await db.refresh(project, attribute_names=["deployments"])
    return _project_to_response(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, payload: ProjectUpdate, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    project = await db.get(Project, uuid.UUID(project_id))
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(project, key, value)
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    await db.refresh(project, attribute_names=["deployments"])
    return _project_to_response(project)


@router.delete("/{project_id}")
async def delete_project(project_id: str, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    project = await db.get(Project, uuid.UUID(project_id))
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return {"message": f"Project '{project.name}' deleted successfully", "id": project_id}


@router.post("/{project_id}/env")
async def update_env_vars(project_id: str, request: Request, db: AsyncSession = Depends(db_session), _: bool = Depends(jwt.jwt_verify_middleware)):
    user_id = uuid.UUID(str(request.state.user_id))
    project = await db.get(Project, uuid.UUID(project_id))
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Environment variables must be synchronized through the host agent and deployment provider.",
    )
