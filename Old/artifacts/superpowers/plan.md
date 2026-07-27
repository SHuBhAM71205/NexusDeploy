# Implementation Plan - Integrating Frontend Project Bootstrapper

## Goal
Add the missing **Project Bootstrapper** UI to the Nexus DevOps React frontend, integrating it with the backend's `/api/bootstrap` service. This will allow users to dynamically scaffold Docker configurations, Kubernetes manifests, and GitHub Actions CI/CD workflows for their projects directly from the web interface.

## Assumptions
- The backend container `nexus-backend` is configured to run at `http://localhost:8000` and exposing `/api/bootstrap`.
- The backend's `resolve_path` maps the Windows host path `d:/sem7project1trial1` to the container's `/workspace` directory, allowing project creation inside the current workspace.
- The frontend is a React application built with Vite/Nginx running at `http://localhost:3000`.

## Plan

### Step 1: Create the `BootstrapPanel` Component
- **Files**: `frontend/src/components/BootstrapPanel.jsx` (New File)
- **Change**: Implement a new premium UI component for project bootstrapping:
  - Form inputs: Project Name / Path (default: `d:/sem7project1trial1/test-bootstrap-app`), Stack Type (React, Node, Fullstack, Static), and switches/checkboxes for Docker, Kubernetes, and CI/CD.
  - Interactive submission: Triggers `POST http://localhost:8000/api/bootstrap`.
  - Rich output display: Shows the list of successfully generated files, target directory, and a detailed feedback panel.
- **Verify**: Inspect component structure and code.

### Step 2: Integrate `BootstrapPanel` into the Main Application
- **Files**: `frontend/src/App.jsx`
- **Change**:
  - Import the new `BootstrapPanel` component.
  - Add a new "Project Bootstrapper" tab to the sidebar navigation (using Lucide-React `Wrench` or `FolderPlus` icon).
  - Add the corresponding conditional rendering block for the `activeTab === 'bootstrapper'`.
- **Verify**: Verify that the sidebar updates correctly and navigating to the "Project Bootstrapper" tab renders the new panel.

### Step 3: Run and Rebuild the Frontend Container
- **Files**: None
- **Change**: Rebuild the frontend container to apply the React changes and verify service status.
- **Verify**: Run `docker-compose up -d --build frontend` to rebuild and run the frontend.

### Step 4: Perform End-to-End Scaffolding Test
- **Files**: None
- **Change**: Use the new UI tab in the browser to bootstrap a dummy project at `d:/sem7project1trial1/test-bootstrap-app`.
- **Verify**:
  - Check that the UI shows a successful scaffolding report with the generated files list.
  - Verify on the file system that `test-bootstrap-app/` has been created with all the expected template files: `Dockerfile`, `docker-compose.yml`, `monitoring/prometheus.yml`, `k8s/deployment.yml`, `k8s/service.yml`, and `.github/workflows/ci-cd.yml`.

## Risks & mitigations
- **Risk**: File path resolution issues between the Windows host and the backend Docker container workspace mount.
- **Mitigation**: Pre-populate the target path in the UI with a valid subfolder pattern that starts with the mapped root (e.g. `d:/sem7project1trial1/test-bootstrap-app`) which the backend already knows how to resolve.
- **Risk**: The frontend container does not reflect changes dynamically due to production build/caching in Nginx container.
- **Mitigation**: Rebuild the frontend service using `docker-compose build frontend` and restart it.

## Rollback plan
- Revert modifications to `frontend/src/App.jsx` and delete `frontend/src/components/BootstrapPanel.jsx`. Clean up any test bootstrapped directories (e.g., `test-bootstrap-app`).
