# Superpowers Brainstorm: NexusDeploy Backend vs Frontend Feature Gap & Integration Plan

## Goal
Comprehensive analysis of backend features and capabilities in NexusDeploy that are missing, partially connected, or underutilized in the frontend, along with structured options for bringing them to full usability.

## Constraints
- FastAPI backend routes and React / Vite frontend architecture are established.
- Changes should preserve existing dark-mode design system, responsive UI components, and mock fallback capabilities for reliable client-side presentation.
- Authentication changes must handle both JWT token storage/header injection and public vs protected route state transitions smoothly.

## Known context
- **Backend Stack**: FastAPI with async SQLAlchemy, Authlib OAuth (Google), Rate Limiter, In-Memory Store, JWT auth headers, and endpoints for Auth, Projects, Deployments, Settings, Stats, Activities, and Health.
- **Frontend Stack**: React 18 with Vite, React Router v6, Lucide icons, Vanilla CSS design tokens (`styles/index.css`), Axios HTTP client (`services/http.ts`), and API service layer (`services/api.ts`).
- **Current Gaps Identified**:
  1. **User Authentication & OAuth Flow**: Backend has complete `/auth/login`, `/auth/register`, `/auth/me`, `/auth/refresh`, `/auth/logout`, and `/auth/google` (OAuth2), but Frontend has zero authentication UI, login pages, profile badges, or auth state guards.
  2. **Deployment Logs & Observability Modal**: Backend provides detailed step-by-step logs (`DeploymentDetail.logs`), but frontend `DeploymentsPage.tsx` only shows high-level deployment status without an interactive log terminal viewer.
  3. **Environment Variables & Project Settings Drawer**: Backend supports GET/PATCH `/projects/{id}` and POST `/projects/{id}/env`, but frontend `ProjectsPage.tsx` lacks an environment variable editor modal and project settings drawer.
  4. **Infrastructure & Cluster Health Metrics**: Backend `/stats` returns container count, CPU utilization (34.2%), memory utilization (52.8%), uptime (99.98%), and region status, but frontend `DashboardPage.tsx` omits cluster health visualization.
  5. **API Key Generation & Secret Display**: Backend returns the raw secret API key string (`nx_live_...`) upon `POST /settings/api-keys`, but frontend lacks a "One-Time Secret Reveal & Copy" dialog.

## Risks
- Introducing strict authentication guards without a fallback or guest mode could complicate local development testing.
- Real-time log streaming could cause UI re-render thrashing if log entries are appended rapidly without state batching.
- Adding complex modal forms might clutter the UI if not designed with smooth transitions and modern drawer layouts.

## Options (2–4)

### Option 1: Full Tiered Integration (Recommended)
Implement all 5 missing feature modules systematically:
- **Module A: Authentication & Profile System**: Auth context/state, Login/Register pages, Google OAuth login trigger, and Top Navigation profile badge with logout.
- **Module B: Interactive Deployment Log Terminal**: Slide-over or modal Terminal drawer in `DeploymentsPage` to inspect step-by-step build logs, filter by level (`info`, `warn`, `success`), and copy logs.
- **Module C: Project Configuration & Env Vars Drawer**: Project detail modal with tabbed views for General Settings (Build Command, Output Dir, Root Dir) and Environment Variables Manager (Key/Value pairs, secret toggles, target environments).
- **Module D: Cluster & Infrastructure Telemetry Dashboard**: Add a dedicated "Cluster Health & Metrics" visual card/section in `DashboardPage` displaying CPU/Memory meters, container count, and regional node status pills.
- **Module E: API Key Secret Reveal Modal**: Secure modal upon API Key creation showing full key once with copy-to-clipboard functionality.

### Option 2: Core Operations Focus (Deployments + Projects + Metrics)
Focus exclusively on DevOps operations:
- Implement Deployment Logs Terminal Viewer.
- Implement Project Settings & Environment Variables Manager.
- Implement Cluster Health Telemetry Widget.
*(Postpone Auth UI and API Key secret modal).*

### Option 3: Authentication & Security Focus
Focus strictly on User Access & Security:
- Implement full Auth flow (Login, Register, OAuth redirect handler, Auth guard).
- Implement API Key generation with secret reveal modal.
- Implement User Profile view & audit log.

## Recommendation
Select **Option 1 (Full Tiered Integration)** to turn NexusDeploy into a complete, end-to-end usable DevOps dashboard platform with fully connected frontend and backend capabilities.

## Acceptance criteria
1. **Auth & OAuth**: Users can log in, register, or initiate Google OAuth, view user profile in header, and log out. Auth header `Authorization: Bearer <token>` attached to API calls when logged in.
2. **Deployment Terminal**: Clicking any deployment row in `DeploymentsPage` opens a slick log terminal displaying timestamped step logs with level filtering and copy button.
3. **Project Settings & Env Vars**: Users can edit project settings (build commands, output directory) and manage environment variables directly from a modal/drawer.
4. **Cluster Metrics**: `DashboardPage` displays live Cluster Health (CPU/Memory gauges, operational node counts, uptime).
5. **API Key Reveal**: Creating an API key displays the newly generated raw key in a one-time secure copy modal.
