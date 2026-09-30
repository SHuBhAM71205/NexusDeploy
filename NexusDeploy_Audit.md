# NexusDeploy Implementation Audit Report

This report outlines the **actual code implementation status** of the NexusDeploy repository as of this audit, distinguishing between fully functioning logic and heavily mocked endpoints.

## A. Repository Architecture
The relationship between components is unexpectedly split between a mocked state backend and a real Node.js deployment agent:
- **Frontend (React/Vite)**: Communicates with *both* the backend and the agent.
- **Backend (FastAPI, port 8000)**: Implements **real authentication** (PostgreSQL/Google OAuth) but uses a **completely fake in-memory `store.py`** to return mock data for Projects, Deployments, and Activities.
- **Agent (Node.js, port 3030)**: Contains the **real operational logic**. It receives deployment commands directly from the frontend, uses actual deployment platforms (Vercel CLI, Netlify CLI, Render API), pushes to GitHub, and streams WebSockets logs.

## B. Current Working Deployment Flow
The actual code execution path when a user deploys:
1. **Login**: Real JWT-based auth flows through `frontend/src/services/api.ts` -> `backend/app/api/routes/auth.py` -> `auth_controller.py` backed by PostgreSQL.
2. **Project Selection**: `frontend/src/pages/ProjectsPage.tsx` saves to the fake dictionary in `backend/app/db/store.py`.
3. **Deployment Trigger**: `api.triggerDeployment` (`frontend/src/services/api.ts`) intercepts the action.
4. **Real Agent Execution**: The frontend secretly sends a parallel payload to `http://localhost:3030/api/agent/deploy` (`agent/index.js`).
5. **Agent Action**: `agent/services/deployer.js` executes the actual pipeline (e.g. `npx vercel` or `api.render.com`).
6. **Fake Backend Execution**: The frontend then requests `POST /deployments/trigger` on the FastAPI backend, which ignores the actual agent response and generates a fake `DeploymentDetail` dict with hardcoded fake logs.
7. **UI Update**: `DeploymentsPage.tsx` reads the fake data. The real deployment occurred, but the UI is completely disconnected from its real status.

## C. Backend API Inventory
| Method | Route | Source File | Purpose | Implementation Status |
|--------|-------|-------------|---------|-----------------------|
| `POST` | `/auth/login`, `/register`, etc. | `routes/auth.py` | JWT/OAuth | **Implemented** (PostgreSQL) |
| `GET`  | `/projects`, `/{id}` | `routes/projects.py` | Fetch projects | **Mocked** (`store.py`) |
| `POST` | `/projects` | `routes/projects.py` | Create project | **Mocked** (`store.py`) |
| `PATCH`| `/projects/{id}` | `routes/projects.py` | Update project | **Mocked** (`store.py`) |
| `GET`  | `/deployments` | `routes/deployments.py`| List deployments | **Mocked** (`store.py`) |
| `POST` | `/deployments/trigger` | `routes/deployments.py`| Run deploy | **Mocked** (Hardcoded logs) |
| `POST` | `/deployments/rollback`| `routes/deployments.py`| Run rollback | **Mocked** (Hardcoded success)|
| `GET`  | `/activities` | `routes/activities.py` | List events | **Mocked** (`store.py`) |
| `GET`  | `/settings/*` | `routes/settings.py` | Get/Set keys | **Mocked** (`store.py`) |
| `GET`  | `/stats` | `routes/stats.py` | Dashboard stats| **Mocked** (`store.py`) |

## D. Agent / Deployment Inventory
The local Node agent at `agent/index.js` handles the heavy lifting:
- **`index.js`**: Defines routes (`/api/agent/deploy`, `/api/agent/git`) and hosts a WebSocket server for live logs (`/api/agent/deploy/logs`).
- **`deployer.js`**: **Implemented**. Contains actual deployment logic:
  - **Vercel**: `npx vercel --yes --prod`
  - **Netlify**: `npx netlify deploy --prod`
  - **Railway**: `npx railway up`
  - **Render**: Makes external HTTP calls to `https://api.render.com/v1/services`. Includes logic for splitting Frontend/Backend into separate services.
- **`git.js`**: **Implemented**. Authenticates and pushes codebase to GitHub via REST API and `git push`.
- **`bootstrapper.js`**: **Implemented**. Generates boilerplate `Dockerfile` and Kubernetes `deployment.yml`.
- **`logbridge.js`**: **Implemented**. Connects to Render's WebSocket to scrape logs and pushes them to the local Loki instance (`http://localhost:3100/loki/api/v1/push`).

## E. Frontend Integration
- **`ProjectsPage.tsx`, `DeploymentsPage.tsx`, `DashboardPage.tsx`**: UI is fully built.
- **`api.ts` & `agentApi.ts`**: Handle API bridging. `api.ts` maintains an extreme level of hardcoded fallback arrays (e.g. `fallbackDeployments`) if the mocked backend fails.
- **Disconnected UI**: The `DeploymentLogsModal.tsx` and `TerminalLogs.tsx` render static `deployment.logs` arrays. The Agent's WebSocket server at `ws://localhost:3030/api/agent/deploy/logs` is completely ignored by the frontend. 

## F. Monitoring Audit
- **Prometheus**: **Broken**. `backend/docker-compose.yml` attempts to mount `backend/monitoring/prometheus.yml`, but this file does not exist. Docker will mount it as a directory, causing the Prometheus container to crash. (However, a valid `prometheus.yml` exists under `agent/monitoring/`).
- **Grafana**: **Configuration only**. `grafana-dashboards.yml` and `grafana-datasource.yml` are present, but with Prometheus failing, dashboards will be empty.
- **Loki & Promtail**: **Implemented**. `loki-config.yml` is present. The Agent's `logbridge.js` actively forwards Render deployment logs directly to Loki.
- **Flow**: Deployed App (Render) -> WebSocket (`logbridge.js`) -> Loki -> Grafana. 

## G. Docker Audit
- **`backend/docker-compose.yml`**: Defines `backend`, `postgres`, `pg_admin`, `prometheus`, `grafana`, `loki`, `promtail`. 
- **`agent/docker-compose.yml`**: A smaller stub mapping a web instance and Prometheus.
- Both composes exist, but the backend compose is the primary one started via `run.bat`.

## H. Environment/Configuration Audit
- **Frontend Variables**: Vite environment files (`.env`) are parsed and securely excluded.
- **Backend Configuration**: Heavily reliant on Pydantic `Settings` (e.g., `PG_DB_USER`, `PG_DB_PASSWORD`, `BACKEND_SECRETE_KEY`, `REACT_APP_FRONTEND_HOST`).
- **Secret Handling**: The agent stores deployment tokens (GitHub, Render) using `keychain.js`. The UI never receives plaintext credentials.

## I. Provider Support
| Provider | File | Method | Credentials | Status | Frontend Integrated |
|----------|------|--------|-------------|--------|---------------------|
| **Render** | `deployer.js` | REST API | Render PAT | **Implemented** | Yes (via Agent) |
| **Vercel** | `deployer.js` | Local CLI | Vercel Token | **Implemented** | Yes (via Agent) |
| **Netlify**| `deployer.js` | Local CLI | Netlify Token| **Implemented** | Yes (via Agent) |
| **Railway**| `deployer.js` | Local CLI | Railway Token| **Implemented** | Yes (via Agent) |
| **GitHub** | `git.js` | REST / CLI | GitHub PAT | **Implemented** | Yes (via Agent) |

## J. Kubernetes
Kubernetes is **not implemented** as an actual orchestration target. The files inside `agent/k8s/` and logic in `bootstrapper.js` merely generate scaffold `deployment.yml` and `service.yml` files for the user's local directory.

## K. Testing
Testing is extremely sparse:
- `backend/tests/unit/test_auth_sessions.py`: Tests JWT session refreshing.
- **Missing**: Zero tests for the `deployer.js` logic, zero tests for Git interactions, zero tests for `agentApi` integration.

## L. Cleanup Candidates
1. **`backend/app/db/store.py`**: The entirety of this file is mock data holding the application back from reality.
2. **`backend/app/api/routes/deployments.py` & `projects.py`**: The hardcoded string implementations need to be replaced with PostgreSQL logic.
3. **`frontend/src/services/api.ts`**: The extensive `fallbackDeployments` logic hiding backend errors.
4. **`backend/docker-compose.yml`**: The broken Prometheus mount path needs fixing to point to `../agent/monitoring/prometheus.yml`.

## M. Recommended Inspection Order
To begin migrating the mocked implementation to reality, inspect these files in order:
1. `backend/app/db/store.py` *(Understand the mock data structure)*
2. `backend/app/api/routes/deployments.py` *(See the fake trigger injection)*
3. `frontend/src/services/api.ts` *(See how it splits calls to backend vs agent)*
4. `agent/index.js` *(Review the WebSocket server broadcasting real logs)*
5. `frontend/src/components/deployments/DeploymentLogsModal.tsx` *(Needs to be rewired to the WebSocket)*
6. `backend/docker-compose.yml` *(To fix the Prometheus crash)*
