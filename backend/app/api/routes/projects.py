import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.db.store import store
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, EnvVar

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    search: Optional[str] = Query(None, description="Search by project name or framework"),
    framework: Optional[str] = Query(None, description="Filter by framework"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    projects = list(store.projects.values())
    if search:
        s = search.lower()
        projects = [p for p in projects if s in p["name"].lower() or s in p["framework"].lower() or (p.get("description") and s in p["description"].lower())]
    if framework:
        projects = [p for p in projects if framework.lower() in p["framework"].lower()]
    if status:
        projects = [p for p in projects if p["status"].lower() == status.lower()]
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    if project_id not in store.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return store.projects[project_id]

@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreate):
    new_id = f"proj-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    slug = payload.name.lower().replace(" ", "-").replace("_", "-")
    
    project_data = {
        "id": new_id,
        "name": payload.name,
        "description": payload.description or f"{payload.name} cloud deployment",
        "repo_url": payload.repo_url,
        "branch": payload.branch or "main",
        "framework": payload.framework or "React",
        "root_directory": payload.root_directory or "./",
        "build_command": payload.build_command or "npm run build",
        "output_directory": payload.output_directory or "dist",
        "install_command": payload.install_command or "npm install",
        "node_version": payload.node_version or "20.x",
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "last_deployed_at": "Just now",
        "production_url": f"https://{slug}.nexusdeploy.app",
        "staging_url": f"https://staging-{slug}.nexusdeploy.app",
        "total_deploys": 1,
        "active_deployments_count": 1,
        "domains": [f"{slug}.nexusdeploy.app"],
        "environment_variables": [v.model_dump() for v in (payload.environment_variables or [])]
    }
    
    store.projects[new_id] = project_data

    # Create initial deployment record
    dep_id = f"dep-{uuid.uuid4().hex[:6]}"
    store.deployments.insert(0, {
        "id": dep_id,
        "project_id": new_id,
        "project_name": payload.name,
        "environment": "production",
        "status": "Success",
        "branch": payload.branch or "main",
        "commit_hash": uuid.uuid4().hex[:7],
        "commit_message": "chore: initial project initialization",
        "author": "Jane Doe",
        "started_at": "Just now",
        "completed_at": "Just now",
        "duration": "48s",
        "url": f"https://{slug}.nexusdeploy.app",
        "logs_count": 8,
        "trigger_type": "manual",
        "logs": [
            {"timestamp": "Just now", "level": "info", "message": f"Initialized project {payload.name}"},
            {"timestamp": "Just now", "level": "info", "message": f"Framework preset detected: {payload.framework}"},
            {"timestamp": "Just now", "level": "success", "message": f"Initial production build live at https://{slug}.nexusdeploy.app"}
        ]
    })

    # Log activity
    store.activities.insert(0, {
        "id": f"act-{uuid.uuid4().hex[:6]}",
        "action": f"Created new project '{payload.name}'",
        "project_name": payload.name,
        "user_name": "Jane Doe",
        "timestamp": "Just now",
        "type": "project_created",
        "status": "success",
        "details": f"Connected to repo: {payload.repo_url}"
    })

    return project_data

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate):
    if project_id not in store.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    proj = store.projects[project_id]
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        proj[k] = v
    proj["updated_at"] = datetime.now(timezone.utc).isoformat()
    return proj

@router.delete("/{project_id}")
def delete_project(project_id: str):
    if project_id not in store.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    deleted = store.projects.pop(project_id)
    return {"message": f"Project '{deleted['name']}' deleted successfully", "id": project_id}

@router.post("/{project_id}/env", response_model=List[EnvVar])
def update_env_vars(project_id: str, vars: List[EnvVar]):
    if project_id not in store.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    store.projects[project_id]["environment_variables"] = [v.model_dump() for v in vars]
    
    store.activities.insert(0, {
        "id": f"act-{uuid.uuid4().hex[:6]}",
        "action": "Updated environment variables",
        "project_name": store.projects[project_id]["name"],
        "user_name": "Jane Doe",
        "timestamp": "Just now",
        "type": "env_update",
        "status": "success",
        "details": f"Saved {len(vars)} environment variables"
    })
    
    return vars
