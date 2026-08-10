from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class EnvVar(BaseModel):
    key: str
    value: str
    target: str = "all"  # production, staging, preview, all
    is_secret: bool = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    repo_url: str
    branch: str = "main"
    framework: str = "React"
    root_directory: str = "./"
    build_command: str = "npm run build"
    output_directory: str = "dist"
    install_command: str = "npm install"
    node_version: str = "20.x"

class ProjectCreate(ProjectBase):
    environment_variables: Optional[List[EnvVar]] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    branch: Optional[str] = None
    framework: Optional[str] = None
    build_command: Optional[str] = None
    output_directory: Optional[str] = None
    install_command: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    status: str = "active"  # active, paused, failed, building
    created_at: str
    updated_at: str
    last_deployed_at: Optional[str] = None
    production_url: Optional[str] = None
    staging_url: Optional[str] = None
    total_deploys: int = 0
    active_deployments_count: int = 0
    domains: List[str] = []
    environment_variables: List[EnvVar] = []
