import os
import logging
import tempfile
import shutil

logger = logging.getLogger("nexus-bootstrapper")

# Templates definitions

DOCKERFILE_TEMPLATE = """# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
"""

DOCKER_COMPOSE_TEMPLATE = """version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:80"
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"

  prometheus:
    image: prom/prometheus:v2.52.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
"""

PROMETHEUS_TEMPLATE = """global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  - job_name: 'web-service'
    static_configs:
      - targets: ['web:80']
"""

CICD_TEMPLATE = """name: Scaffolder CI/CD Workflow

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run Build
        run: npm run build --if-present
"""

K8S_DEPLOYMENT_TEMPLATE = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: {app_name}-deployment
  labels:
    app: {app_name}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {app_name}
  template:
    metadata:
      labels:
        app: {app_name}
    spec:
      containers:
      - name: {app_name}
        image: {app_name}:latest
        ports:
        - containerPort: 80
"""

K8S_SERVICE_TEMPLATE = """apiVersion: v1
kind: Service
metadata:
  name: {app_name}-service
spec:
  selector:
    app: {app_name}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
"""

def resolve_path(user_path: str) -> str:
    # Get dynamic host workspace from environment (configured in docker-compose)
    host_workspace = os.getenv("HOST_WORKSPACE", "d:/sem7project1trial1").replace("\\", "/")
    
    # Normalize path
    p = user_path.replace("\\", "/")
    
    # Handle relative paths: if they don't start with a slash and don't have drive letters/colons
    if not p.startswith("/") and ":" not in p:
        p = f"/workspace/{p.lstrip('./')}"
        return p
        
    # Handle absolute paths:
    # If it starts with the host workspace prefix (case-insensitive check)
    if p.lower().startswith(host_workspace.lower()):
        p = "/workspace" + p[len(host_workspace):]
    else:
        # Fallback if user specified an absolute path outside workspace
        # Docker cannot write outside the mount, so we place it inside the workspace mount
        folder_name = p.rstrip("/").split("/")[-1] or "generated-devops-app"
        p = f"/workspace/{folder_name}"
        
    return p

def write_scaffold_files(target_dir: str, app_name: str, docker: bool, k8s: bool, cicd: bool) -> list:
    results = []
    
    if docker:
        # Write Dockerfile
        dockerfile_path = os.path.join(target_dir, "Dockerfile")
        with open(dockerfile_path, "w") as f:
            f.write(DOCKERFILE_TEMPLATE)
        results.append("Dockerfile")

        # Write docker-compose.yml
        compose_path = os.path.join(target_dir, "docker-compose.yml")
        with open(compose_path, "w") as f:
            f.write(DOCKER_COMPOSE_TEMPLATE)
        results.append("docker-compose.yml")

        # Write prometheus.yml under monitoring/
        mon_dir = os.path.join(target_dir, "monitoring")
        os.makedirs(mon_dir, exist_ok=True)
        prom_path = os.path.join(mon_dir, "prometheus.yml")
        with open(prom_path, "w") as f:
            f.write(PROMETHEUS_TEMPLATE)
        results.append("monitoring/prometheus.yml")

    if cicd:
        # Write GitHub Workflow
        workflow_dir = os.path.join(target_dir, ".github", "workflows")
        os.makedirs(workflow_dir, exist_ok=True)
        workflow_path = os.path.join(workflow_dir, "ci-cd.yml")
        with open(workflow_path, "w") as f:
            f.write(CICD_TEMPLATE)
        results.append(".github/workflows/ci-cd.yml")

    if k8s:
        # Write Kubernetes manifests
        k8s_dir = os.path.join(target_dir, "k8s")
        os.makedirs(k8s_dir, exist_ok=True)
        
        deploy_path = os.path.join(k8s_dir, "deployment.yml")
        with open(deploy_path, "w") as f:
            f.write(K8S_DEPLOYMENT_TEMPLATE.format(app_name=app_name))
        results.append("k8s/deployment.yml")

        service_path = os.path.join(k8s_dir, "service.yml")
        with open(service_path, "w") as f:
            f.write(K8S_SERVICE_TEMPLATE.format(app_name=app_name))
        results.append("k8s/service.yml")
        
    return results

def bootstrap_project(folder_path: str, stack: str, docker: bool, k8s: bool, cicd: bool) -> dict:
    target_dir = resolve_path(folder_path)
    app_name = os.path.basename(target_dir.rstrip("/")) or "nexus-app"
    
    try:
        os.makedirs(target_dir, exist_ok=True)
        results = write_scaffold_files(target_dir, app_name, docker, k8s, cicd)

        # Map container path back to host coordinate system for user display
        display_path = target_dir
        if target_dir.startswith("/workspace"):
            host_workspace = os.getenv("HOST_WORKSPACE", "d:/sem7project1trial1").replace("\\", "/")
            if folder_path.lower().startswith(host_workspace.lower()):
                host_prefix = folder_path[:len(host_workspace)]
            else:
                host_prefix = host_workspace
            display_path = target_dir.replace("/workspace", host_prefix, 1)

        logger.info(f"Successfully bootstrapped project at {target_dir} with {results}")
        return {
            "status": "success",
            "message": f"Successfully bootstrapped project at {folder_path}",
            "files": results,
            "resolved_path": display_path
        }

    except Exception as e:
        logger.error(f"Error bootstrapping project: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def bootstrap_project_zip(project_name: str, stack: str, docker: bool, k8s: bool, cicd: bool) -> str:
    temp_dir = tempfile.mkdtemp()
    try:
        safe_name = "".join([c if c.isalnum() or c in "-_" else "_" for c in project_name]) or "nexus-app"
        project_dir = os.path.join(temp_dir, safe_name)
        os.makedirs(project_dir, exist_ok=True)
        
        write_scaffold_files(project_dir, safe_name, docker, k8s, cicd)
        
        zip_archive_path = shutil.make_archive(project_dir, 'zip', root_dir=temp_dir, base_dir=safe_name)
        return zip_archive_path
    except Exception as e:
        logger.error(f"Failed to generate project ZIP: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise e
