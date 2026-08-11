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

├── backend/
├── frontend/
├── docs/
│   ├── adr/
│   ├── api/
│   └── architecture/
├── scripts/
├── .github/
├── README.md
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

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
