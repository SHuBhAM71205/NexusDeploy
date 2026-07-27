## Goal
Define the final product vision and user experience (UX) flow of the **Nexus DevOps Platform** once all implementation phases are completed.

## Constraints
- **Local vs SaaS Execution**: Nexus runs locally/self-hosted in this workspace. Executing deployments on external cloud hosting (Render, Vercel) requires API tokens and configuration code.
- **Credential Security**: Storing and using cloud provider tokens/keys (Render, Vercel, GitHub) must be secure.
- **Resource Limitations**: Running multiple local instances of dashboards, backends, databases, and observability tools concurrently on a developer's workstation requires keeping components lightweight.

## Known context
- The user is building Nexus as a final-year CSE project.
- It is currently set up with a React frontend, FastAPI backend, Postgres database, and an observability stack (Prometheus, Grafana, Loki, Promtail).
- The user wants to know if the final project will be an automated workflow where a developer starts the app, selects options, and the app automatically handles repository creation, commit, push, cloud deployment, and observability configuration, rendering all access links at the end.

## Risks
- **Over-automation (Scope Creep)**: Automatically creating repos, pushing, and configuring cloud hosting across multiple providers (Render, Vercel, etc.) introduces high complexity and API dependency issues (rate limits, OAuth, billing).
- **Maintenance Overhead**: Maintaining API integrations with Vercel, Render, GitHub, Loki, Grafana, and Prometheus requires keeping up with active API changes of all these platforms.
- **Environment Specific Failures**: Docker daemon access, file paths, and local ports can differ across Windows/macOS/Linux.

## Options (2–4)

### Option 1: Full-Automation SaaS Platform ("The Vercel-like Orchestrator")
- **Concept**: A web app where the user signs up, links their GitHub account, enters Render/Vercel/Loki credentials, and inputs local repository paths. Nexus automatically:
  1. Creates a remote GitHub repo.
  2. Commits and pushes their local codebase.
  3. Deploys the frontend to Vercel and backend to Render.
  4. Configures Loki/Grafana and gives the user back the active live links.
- **Pros**: Massive wow factor. Feels like a real production SaaS platform.
- **Cons**: Extremely complex. Requires implementing GitHub OAuth, Vercel API, Render API, and orchestrating multiple asynchronous remote deployment states. High risk of failure due to API key configurations and rate limits.

### Option 2: Self-Hosted Codebase Bootstrapper & Local Dashboard ("The DevOps Control Center")
- **Concept**: Nexus runs locally. A user points it to a local folder and configures their deployment stack via UI toggle options (e.g. Deployment: Render + Vercel vs. Kubernetes vs. Docker Compose. Logs: Loki vs. Console). Nexus:
  1. Generates the necessary deployment configurations (e.g. Dockerfiles, Compose YAML, Kubernetes Manifests, GitHub Actions Workflows) and writes them directly into the user's project folder.
  2. Prompts the user to push their code to GitHub.
  3. Tracks the progress of the deployments (via GitHub API, Render Webhooks, or Kubernetes events) and aggregates metrics/logs inside the Nexus Dashboard.
- **Pros**: Pragmatic and highly robust. Solves the complex problem of code generation and orchestration without needing complex OAuth flows. Extremely useful for developers because it lets them control their own repository.
- **Cons**: Requires the user to run one manual git command (`git push`) to trigger the automation, but this is a normal developer workflow.

### Option 3: Observability & CI/CD Aggregator Dashboard ("The Single Pane of Glass")
- **Concept**: The user has already set up their deployments and repositories. They enter their API endpoints (Prometheus URL, Loki URL, GitHub Repo URL, SonarQube URL) into the Nexus settings. Nexus connects to these services and acts as a central aggregator displaying CI/CD pipeline runs, DORA metrics, code quality, and active logs in a unified UI.
- **Pros**: Clean, simple, and focuses entirely on the "observability" aspect. Very low risk of integration failure.
- **Cons**: Lacks the "automation/deployment" features, which might make it feel less like an end-to-end automation platform for a final-year project.

## Recommendation
**Option 2 (Self-Hosted Codebase Bootstrapper & Local Dashboard)** is recommended.
It perfectly balances the project's academic goals (System Design, Automation, Observability) with feasibility. It acts as a developer tool: generating Dockerfiles, Compose configs, and CI/CD pipelines automatically based on UI choices, letting the user trigger the build, and then aggregating all logs and metrics in a custom central dashboard.

## Acceptance criteria
- Defined the target user journey and product model for the final version of Nexus.
- Outlined how the automation of code generation, Git push, and cloud configuration will work.
- Persisted the brainstorm document to disk.
