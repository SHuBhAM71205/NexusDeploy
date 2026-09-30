# NexusDeploy

> NexusDeploy is an open-source application deployment platform.

> It is designed to automate the process of building, deploying, and
managing applications across different infrastructure providers.

> The goal is to provide developers with a simple deployment workflow.

> while keeping the underlying infrastructure reliable, extensible,
and provider-independent.

![License](https://img.shields.io/github/license/SHuBhAM71205/NexusDeploy)
![Contributors](https://img.shields.io/github/contributors/SHuBhAM71205/NexusDeploy)
![Issues](https://img.shields.io/github/issues/SHuBhAM71205/NexusDeploy)
![Stars](https://img.shields.io/github/stars/SHuBhAM71205/NexusDeploy)
![Last Commit](https://img.shields.io/github/last-commit/SHuBhAM71205/NexusDeploy)

---

## Table of Contents

- [Overview](#Overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

# Overview

NexusDeploy is an open-source deployment platform designed to simplify application deployment and infrastructure management.

Our goal is to provide developers with a streamlined workflow for deploying applications while maintaining reliability, scalability, and security.

The project emphasizes:

- Clean architecture
- Modular design
- Automation
- Developer productivity
- Community-driven development

---

# Features

Current and planned features include:

- Deployment automation
- Project management
- Environment management
- Build pipeline integration
- Deployment history
- Rollback support
- Authentication & authorization
- Dashboard and monitoring
- Logging
- Notifications
- Plugin architecture
- API support

---

# Architecture

- The project follows a modular architecture.
- Detailed architecture documentation is available inside:
[docs/architecture/](./docs/architecture)

---

# Project Structure

```
NexusDeploy/
├── .agent/                                # Repository-specific agent instructions and workflows
│   ├── rules/
│   │   └── superpowers.md
│   ├── skills/
│   │   ├── superpowers-brainstorm/SKILL.md
│   │   ├── superpowers-debug/SKILL.md
│   │   ├── superpowers-finish/SKILL.md
│   │   ├── superpowers-plan/SKILL.md
│   │   ├── superpowers-python-automation/SKILL.md
│   │   ├── superpowers-rest-automation/SKILL.md
│   │   ├── superpowers-review/SKILL.md
│   │   ├── superpowers-tdd/SKILL.md
│   │   └── superpowers-workflow/
│   │       ├── SKILL.md
│   │       └── scripts/
│   │           ├── record_activation.py
│   │           ├── spawn_subagent.py
│   │           └── write_artifact.py
│   └── workflows/
│       ├── superpowers-brainstorm.md
│       ├── superpowers-debug.md
│       ├── superpowers-execute-plan-parallel.md
│       ├── superpowers-execute-plan.md
│       ├── superpowers-finish.md
│       ├── superpowers-reload.md
│       ├── superpowers-review.md
│       └── superpowers-write-plan.md
├── .github/                               # GitHub ownership, issue templates, and CI workflows
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   ├── docs_report.yml
│   │   ├── feature_request.yml
│   │   └── perfomance.yml
│   ├── pull_request_template.md
│   └── workflows/
│       ├── ci.yml
│       └── frontend-ci.yml
├── .idea/                                 # IntelliJ IDEA project configuration
│   ├── .gitignore
│   ├── inspectionProfiles/profiles_settings.xml
│   ├── modules.xml
│   ├── NexusDeploy.iml
│   ├── nexusdeploy-backend.iml
│   ├── prettier.xml
│   └── vcs.xml
├── agent/                                 # Nested Node.js host-agent repository
│   ├── .github/workflows/ci-cd.yml
│   ├── .gitignore
│   ├── .vercel/
│   │   ├── project.json
│   │   └── README.txt
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── index.js                           # Agent API and deployment orchestration
│   ├── k8s/
│   │   ├── deployment.yml
│   │   └── service.yml
│   ├── monitoring/prometheus.yml
│   ├── package.json
│   ├── package-lock.json
│   ├── projects.json
│   └── services/
│       ├── bootstrapper.js
│       ├── deployer.js
│       ├── detector.js
│       ├── git.js
│       ├── keychain.js
│       ├── logbridge.js
│       └── projects.js
├── artifacts/superpowers/                 # Project planning and execution notes
│   ├── brainstorm.md
│   ├── execution.md
│   ├── finish.md
│   └── plan.md
├── backend/                               # FastAPI application and supporting services
│   ├── .dockerignore
│   ├── .env                               # Local environment settings; do not commit secrets
│   ├── .python-version
│   ├── alembic.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── controllers/
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth_controller.py
│   │   │   ├── dependencies/.gitkeep
│   │   │   ├── middleware/
│   │   │   │   ├── jwt.py
│   │   │   │   ├── limiter.py
│   │   │   │   └── redis_cache.py
│   │   │   ├── models/auth_model.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── activities.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── deployments.py
│   │   │   │   ├── health.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── settings.py
│   │   │   │   └── stats.py
│   │   │   └── services/
│   │   │       ├── auth_services.py
│   │   │       └── user_services.py
│   │   ├── core/
│   │   │   ├── celery.py
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   ├── reddis.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── migrations/
│   │   │   │   ├── README
│   │   │   │   ├── env.py
│   │   │   │   ├── script.py.mako
│   │   │   │   └── versions/
│   │   │   │       ├── 5ebebf6ef3d5_initial_migration.py
│   │   │   │       ├── 74d1b57c5899_initial_migration.py
│   │   │   │       ├── 7ab37ca9d1af_initial_migration.py
│   │   │   │       └── d2bc5540dcb3_initial_migration.py
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── Base.py
│   │   │   │   ├── RefreshToken.py
│   │   │   │   └── User.py
│   │   │   ├── session.py
│   │   │   └── store.py
│   │   ├── integrations/
│   │   │   ├── github/.gitkeep
│   │   │   ├── minio/.gitkeep
│   │   │   ├── qdrant/.gitkeep
│   │   │   └── render/.gitkeep
│   │   ├── main.py                       # FastAPI application entry point
│   │   ├── schemas/
│   │   │   ├── activity.py
│   │   │   ├── deployment.py
│   │   │   ├── project.py
│   │   │   └── stats.py
│   │   ├── services/
│   │   │   ├── ai/.gitkeep
│   │   │   ├── auth/.gitkeep
│   │   │   ├── deployment/.gitkeep
│   │   │   ├── github/.gitkeep
│   │   │   └── providers/.gitkeep
│   │   └── utils/.gitkeep
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── eg.env.example
│   ├── monitoring/
│   │   ├── grafana-dashboards.yml
│   │   ├── grafana-datasource.yml
│   │   ├── loki-config.yml
│   │   └── promtail-config.yml
│   ├── pyproject.toml
│   ├── README.md
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── integration/.gitkeep
│   │   ├── test.py
│   │   └── unit/test_auth_sessions.py
│   └── uv.lock
├── docs/
│   ├── api/api_docs.md
│   ├── architecture/
│   │   ├── Activity_diag.svg
│   │   ├── arch.png
│   │   ├── Component_diagram.svg
│   │   ├── DFD lev 2.svg
│   │   ├── DFD_deployment_lev2.svg
│   │   ├── DFD_level1.svg
│   │   ├── DFD_monitoring.svg
│   │   ├── Nexus_ER.png
│   │   ├── sequence.svg
│   │   ├── sstate.png
│   │   └── Use Case diagram.svg
│   └── src/
│       ├── activity.wsd
│       ├── arch.wsd
│       ├── class_diagram.wsd
│       ├── DFD_s_diag.wsd
│       ├── e.wsd
│       ├── sequence.uwd
│       └── state_diag.wsd
├── frontend/                              # React, TypeScript, and Vite web application
│   ├── .gitignore
│   ├── .prettierignore
│   ├── .prettierrc.json
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── src/
│   │   ├── app/App.tsx
│   │   ├── components/
│   │   │   ├── auth/AuthModal.tsx
│   │   │   ├── dashboard/ClusterHealthCard.tsx
│   │   │   ├── deployments/DeploymentLogsModal.tsx
│   │   │   ├── layout/AppShell.tsx
│   │   │   ├── projects/ProjectSettingsDrawer.tsx
│   │   │   ├── settings/ApiKeySecretModal.tsx
│   │   │   └── ui/
│   │   │       ├── Badge.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── CommandSearchModal.tsx
│   │   │       ├── FolderPickerModal.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── NewProjectModal.tsx
│   │   │       ├── RollbackModal.tsx
│   │   │       ├── TerminalLogs.tsx
│   │   │       ├── TokenPromptModal.tsx
│   │   │       └── TriggerDeployModal.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── features/dashboard/
│   │   │   ├── DashboardPage.test.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── lib/
│   │   │   ├── env.ts
│   │   │   └── utils.ts
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── DeploymentsPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   ├── agentApi.ts
│   │   │   ├── api.ts
│   │   │   └── http.ts
│   │   ├── styles/index.css
│   │   ├── test/setup.ts
│   │   ├── types/index.ts
│   │   └── vite-env.d.ts
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .gitignore
├── CODE_OF_CONDUCT.md
├── CONTRIUTING.md
├── LICENCE.md
├── README.md
├── run.bat                                # Starts backend, agent, and frontend on Windows
├── start.bat
└── start-nexus.bat
```

This lists the project's visible source, documentation, and configuration files. Git metadata, installed dependencies, virtual environments, build output, caches, and the compiled agent executable are omitted. The agent directory is also a nested Git repository.

---

# Tech Stack

## Frontend

- React
- TypeScript
- Tailwind CSS

## Backend

- Node.js
- Express
- TypeScript

## Database

- PostgreSQL

## DevOps

- Docker
- GitHub Actions

---

# Getting Started

Clone the repository.

```bash
git clone https://github.com/SHuBhAM71205/NexusDeploy.git
```

Move into the project.

```bash
cd NexusDeploy
```

---

# Installation

Backend

```bash
cd backend

# install dependencies
uv venv .venv

uv sync

```

Frontend

```bash
cd frontend

# install dependencies
```

---

# Configuration

Create environment files.

Backend

```
# edit this .env with backend/.env.example and add you api keys and secretes and pwd

backend/.env
```

Frontend

```
frontend/.env
```

Configuration examples will be provided in future releases.

---

# Running the Project

Backend
### to start the backend locally
- start the docker Desktop or docker services
```bash
# build docker container
docker compose build

# run all docker containers
docker compose up

# backend container is running you can access it through local host 
```
- to run code of backend locally without docker 
  - as there are many services like redis and postgres run on docker so start all acontainers

```bash
# you can use uv or pip to start the backend

## to start the venv 

./.venv/Scripts/activate

## to start backend

### using the uv

uv run uvicorn backend.app.main:app -host <host> -port <port_num>

```
Frontend

```bash
# start frontend
```

Development server URLs

```
Frontend: http://localhost:3000

Backend: http://<host>:<port>
```

---

# Development Workflow

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Write or update tests.
5. Update documentation if necessary.
6. Submit a Pull Request.

For detailed contribution guidelines, see:
[CONTRIBUTING.md](./CONTRIUTING.md)


---

# Documentation

Additional documentation can be found inside the `docs/` directory.

Topics include:

- Architecture
- API documentation
- ADRs (Architecture Decision Records)
- Development guides

---

# Roadmap

The roadmap will evolve as the project grows.

Planned milestones include:

- Authentication
- Deployment engine
- Monitoring dashboard
- CLI
- Plugin system
- Kubernetes support
- Cloud provider integrations

---

# Contributing

We welcome contributions from developers of all experience levels.

 - To get started with contributing to project 

- Please read: [CONTRIBUTING.md](./CONTRIUTING.md)
  

before opening issues or pull requests.

---

# Code of Conduct

This project follows our [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md).

Please help us build a welcoming and respectful community.

---

# License

This project is licensed under the MIT License.

See the [LICENCE](./LICENCE.md) file for details.

---

# Acknowledgements

Thanks to everyone who contributes to NexusDeploy.

Every **_issue, pull request, suggestion, and discussion_** helps improve the project.
