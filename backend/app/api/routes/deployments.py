import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.db.store import store
from app.schemas.deployment import DeploymentResponse, DeploymentDetail, DeploymentTrigger, RollbackRequest

router = APIRouter(prefix="/deployments", tags=["Deployments"])

@router.get("", response_model=List[DeploymentResponse])
def list_deployments(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    environment: Optional[str] = Query(None, description="Filter by environment (production, staging, preview)"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    deps = store.deployments
    if project_id:
        deps = [d for d in deps if d["project_id"] == project_id]
    if environment:
        deps = [d for d in deps if d["environment"].lower() == environment.lower()]
    if status:
        deps = [d for d in deps if d["status"].lower() == status.lower()]
    return deps

@router.get("/{deployment_id}", response_model=DeploymentDetail)
def get_deployment_detail(deployment_id: str):
    for d in store.deployments:
        if d["id"] == deployment_id:
            return d
    raise HTTPException(status_code=404, detail="Deployment not found")

@router.post("/trigger", response_model=DeploymentDetail, status_code=201)
def trigger_deployment(payload: DeploymentTrigger):
    if payload.project_id not in store.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = store.projects[payload.project_id]
    dep_id = f"dep-{uuid.uuid4().hex[:6]}"
    commit_hash = uuid.uuid4().hex[:7]
    
    new_deployment = {
        "id": dep_id,
        "project_id": payload.project_id,
        "project_name": project["name"],
        "environment": payload.environment,
        "status": "Success",
        "branch": payload.branch or project.get("branch", "main"),
        "commit_hash": commit_hash,
        "commit_message": payload.commit_message or "Manual deployment triggered from dashboard",
        "author": "Jane Doe",
        "started_at": "Just now",
        "completed_at": "Just now",
        "duration": "1m 12s",
        "url": project.get("production_url") if payload.environment == "production" else project.get("staging_url"),
        "logs_count": 9,
        "trigger_type": payload.trigger_type,
        "logs": [
            {"timestamp": "Just now", "level": "info", "message": f"Cloning repository {project['repo_url']} (ref: {payload.branch or 'main'})..."},
            {"timestamp": "Just now", "level": "info", "message": f"Installing dependencies with '{project.get('install_command', 'npm install')}'..."},
            {"timestamp": "Just now", "level": "info", "message": f"Running build script '{project.get('build_command', 'npm run build')}'..."},
            {"timestamp": "Just now", "level": "info", "message": "Compiling assets, tree shaking, and code splitting..."},
            {"timestamp": "Just now", "level": "info", "message": "Containerizing image and running vulnerability security audit (0 CVEs)..."},
            {"timestamp": "Just now", "level": "info", "message": f"Deploying container to region cluster us-east-1 ({payload.environment})..."},
            {"timestamp": "Just now", "level": "info", "message": "Configuring edge SSL certificate and DNS ingress..."},
            {"timestamp": "Just now", "level": "success", "message": f"Successfully live at {project.get('production_url')}"}
        ]
    }
    
    store.deployments.insert(0, new_deployment)
    project["total_deploys"] = project.get("total_deploys", 0) + 1
    project["last_deployed_at"] = "Just now"

    # Add activity
    store.activities.insert(0, {
        "id": f"act-{uuid.uuid4().hex[:6]}",
        "action": f"Deployed to {payload.environment}",
        "project_name": project["name"],
        "user_name": "Jane Doe",
        "timestamp": "Just now",
        "type": "deploy",
        "status": "success",
        "details": f"Commit {commit_hash}: {payload.commit_message}"
    })

    return new_deployment

@router.post("/rollback", response_model=DeploymentDetail)
def rollback_deployment(payload: RollbackRequest):
    target_dep = None
    for d in store.deployments:
        if d["id"] == payload.deployment_id:
            target_dep = d
            break
            
    if not target_dep:
        raise HTTPException(status_code=404, detail="Target deployment not found for rollback")
    
    proj_id = target_dep["project_id"]
    project = store.projects.get(proj_id, {"name": target_dep["project_name"]})
    
    rollback_dep_id = f"dep-{uuid.uuid4().hex[:6]}"
    rollback_dep = {
        "id": rollback_dep_id,
        "project_id": proj_id,
        "project_name": target_dep["project_name"],
        "environment": payload.target_environment,
        "status": "Success",
        "branch": target_dep["branch"],
        "commit_hash": target_dep["commit_hash"],
        "commit_message": f"Rollback to {target_dep['id']} ({target_dep['commit_hash']})",
        "author": "Jane Doe",
        "started_at": "Just now",
        "completed_at": "Just now",
        "duration": "28s",
        "url": target_dep.get("url"),
        "logs_count": 6,
        "trigger_type": "rollback",
        "logs": [
            {"timestamp": "Just now", "level": "warn", "message": f"Instant rollback initiated to target deployment {payload.deployment_id}"},
            {"timestamp": "Just now", "level": "info", "message": f"Switching active CDN traffic route pointer to stable release {target_dep['commit_hash']}..."},
            {"timestamp": "Just now", "level": "info", "message": "Validating health checks on stable pod replicas... (100% healthy)"},
            {"timestamp": "Just now", "level": "success", "message": "Rollback succeeded with 0 packet drops or downtime."}
        ]
    }
    
    store.deployments.insert(0, rollback_dep)
    
    store.activities.insert(0, {
        "id": f"act-{uuid.uuid4().hex[:6]}",
        "action": "Instant rollback executed",
        "project_name": target_dep["project_name"],
        "user_name": "Jane Doe",
        "timestamp": "Just now",
        "type": "rollback",
        "status": "success",
        "details": f"Reverted {payload.target_environment} to {payload.deployment_id}"
    })
    
    return rollback_dep
