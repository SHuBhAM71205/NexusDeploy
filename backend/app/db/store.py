import time
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

class DataStore:
    def __init__(self):
        self._init_data()

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _init_data(self):
        self.projects: Dict[str, Dict[str, Any]] = {
            "proj-1": {
                "id": "proj-1",
                "name": "api-gateway",
                "description": "High throughput microservices API routing & rate-limiting proxy",
                "repo_url": "https://github.com/nexusdeploy/api-gateway",
                "branch": "main",
                "framework": "Node.js / Express",
                "root_directory": "./",
                "build_command": "npm run build",
                "output_directory": "dist",
                "install_command": "npm ci",
                "node_version": "20.x",
                "status": "active",
                "created_at": "2026-06-15T08:30:00Z",
                "updated_at": "2026-08-09T09:12:00Z",
                "last_deployed_at": "2 minutes ago",
                "production_url": "https://api-gateway.nexusdeploy.app",
                "staging_url": "https://staging-api-gateway.nexusdeploy.app",
                "total_deploys": 142,
                "active_deployments_count": 2,
                "domains": ["api.nexusdeploy.io", "api-gateway.nexusdeploy.app"],
                "environment_variables": [
                    {"key": "NODE_ENV", "value": "production", "target": "production", "is_secret": False},
                    {"key": "DATABASE_URL", "value": "postgres://nexus:secret@db.internal:5432/gateway", "target": "all", "is_secret": True},
                    {"key": "JWT_SECRET", "value": "nexus_sec_key_99218204", "target": "all", "is_secret": True},
                    {"key": "RATE_LIMIT_MAX", "value": "1000", "target": "production", "is_secret": False},
                ]
            },
            "proj-2": {
                "id": "proj-2",
                "name": "web-dashboard",
                "description": "Next-generation developer portal & real-time analytics UI",
                "repo_url": "https://github.com/nexusdeploy/web-dashboard",
                "branch": "main",
                "framework": "React / Vite",
                "root_directory": "./frontend",
                "build_command": "npm run build",
                "output_directory": "dist",
                "install_command": "npm install",
                "node_version": "22.x",
                "status": "building",
                "created_at": "2026-07-01T12:00:00Z",
                "updated_at": "2026-08-09T10:45:00Z",
                "last_deployed_at": "18 minutes ago",
                "production_url": "https://dashboard.nexusdeploy.app",
                "staging_url": "https://staging-dashboard.nexusdeploy.app",
                "total_deploys": 89,
                "active_deployments_count": 1,
                "domains": ["app.nexusdeploy.io", "dashboard.nexusdeploy.app"],
                "environment_variables": [
                    {"key": "VITE_API_URL", "value": "https://api-gateway.nexusdeploy.app/api/v1", "target": "all", "is_secret": False},
                    {"key": "VITE_SENTRY_DSN", "value": "https://public@sentry.io/123", "target": "production", "is_secret": False},
                ]
            },
            "proj-3": {
                "id": "proj-3",
                "name": "billing-service",
                "description": "Stripe & subscription webhook processing engine with idempotency keys",
                "repo_url": "https://github.com/nexusdeploy/billing-service",
                "branch": "main",
                "framework": "FastAPI / Python",
                "root_directory": "./",
                "build_command": "pip install -r requirements.txt",
                "output_directory": "./",
                "install_command": "pip install -r requirements.txt",
                "node_version": "Python 3.12",
                "status": "active",
                "created_at": "2026-05-10T14:20:00Z",
                "updated_at": "2026-08-09T08:00:00Z",
                "last_deployed_at": "1 hour ago",
                "production_url": "https://billing.nexusdeploy.app",
                "staging_url": "https://staging-billing.nexusdeploy.app",
                "total_deploys": 64,
                "active_deployments_count": 1,
                "domains": ["billing.nexusdeploy.app"],
                "environment_variables": [
                    {"key": "STRIPE_SECRET_KEY", "value": "sk_live_9921nexusdeploy", "target": "production", "is_secret": True},
                    {"key": "STRIPE_WEBHOOK_SECRET", "value": "whsec_884102941", "target": "production", "is_secret": True},
                ]
            },
            "proj-4": {
                "id": "proj-4",
                "name": "auth-service",
                "description": "OAuth2 / OIDC authentication service with multi-factor auth and biometric passkeys",
                "repo_url": "https://github.com/nexusdeploy/auth-service",
                "branch": "main",
                "framework": "Go",
                "root_directory": "./",
                "build_command": "go build -o auth-server .",
                "output_directory": "./",
                "install_command": "go mod download",
                "node_version": "Go 1.22",
                "status": "active",
                "created_at": "2026-04-20T09:00:00Z",
                "updated_at": "2026-08-08T18:30:00Z",
                "last_deployed_at": "4 hours ago",
                "production_url": "https://auth.nexusdeploy.app",
                "staging_url": "https://staging-auth.nexusdeploy.app",
                "total_deploys": 112,
                "active_deployments_count": 1,
                "domains": ["auth.nexusdeploy.app"],
                "environment_variables": [
                    {"key": "OAUTH_CLIENT_ID", "value": "nexus_auth_client_prod", "target": "all", "is_secret": False},
                    {"key": "OAUTH_CLIENT_SECRET", "value": "secret_sec_auth_991823", "target": "all", "is_secret": True},
                ]
            },
            "proj-5": {
                "id": "proj-5",
                "name": "docs-portal",
                "description": "Interactive API reference and documentation site with instant search",
                "repo_url": "https://github.com/nexusdeploy/docs-portal",
                "branch": "main",
                "framework": "Next.js",
                "root_directory": "./",
                "build_command": "npm run build",
                "output_directory": ".next",
                "install_command": "npm install",
                "node_version": "20.x",
                "status": "active",
                "created_at": "2026-06-01T11:00:00Z",
                "updated_at": "2026-08-07T14:15:00Z",
                "last_deployed_at": "1 day ago",
                "production_url": "https://docs.nexusdeploy.app",
                "staging_url": "https://staging-docs.nexusdeploy.app",
                "total_deploys": 38,
                "active_deployments_count": 1,
                "domains": ["docs.nexusdeploy.io"],
                "environment_variables": []
            }
        }

        self.deployments: List[Dict[str, Any]] = [
            {
                "id": "dep-991",
                "project_id": "proj-1",
                "project_name": "api-gateway",
                "environment": "production",
                "status": "Success",
                "branch": "main",
                "commit_hash": "a8f3b21",
                "commit_message": "feat: optimize edge caching headers and compression",
                "author": "Jane Doe",
                "started_at": "2 minutes ago",
                "completed_at": "Just now",
                "duration": "1m 45s",
                "url": "https://api-gateway.nexusdeploy.app",
                "logs_count": 18,
                "trigger_type": "git_push",
                "logs": [
                    {"timestamp": "14:40:02", "level": "info", "message": "Cloning repository from github.com/nexusdeploy/api-gateway (branch: main)..."},
                    {"timestamp": "14:40:05", "level": "info", "message": "Commit a8f3b21: feat: optimize edge caching headers"},
                    {"timestamp": "14:40:08", "level": "info", "message": "Restoring build cache for node_modules... (Hit: 98%)"},
                    {"timestamp": "14:40:12", "level": "info", "message": "Executing build command: npm run build"},
                    {"timestamp": "14:40:25", "level": "info", "message": "TypeScript compilation passed with 0 errors."},
                    {"timestamp": "14:40:35", "level": "info", "message": "Generating static bundle and optimized server chunks..."},
                    {"timestamp": "14:40:48", "level": "info", "message": "Containerizing image with distroless runtime base..."},
                    {"timestamp": "14:41:00", "level": "info", "message": "Pushing image to registry nexus-cr.io/api-gateway:a8f3b21..."},
                    {"timestamp": "14:41:15", "level": "info", "message": "Performing rolling update on cluster us-east-1 (3/3 healthy)..."},
                    {"timestamp": "14:41:25", "level": "info", "message": "Health checks passed on all endpoints: /api/v1/health (200 OK)"},
                    {"timestamp": "14:41:28", "level": "success", "message": "Deployment successfully routed to production edge nodes! Live at https://api-gateway.nexusdeploy.app"}
                ]
            },
            {
                "id": "dep-990",
                "project_id": "proj-2",
                "project_name": "web-dashboard",
                "environment": "staging",
                "status": "Building",
                "branch": "feat/live-telemetry",
                "commit_hash": "c4d7e98",
                "commit_message": "feat: add real-time WebSocket metrics chart stream",
                "author": "Alex Rivera",
                "started_at": "18 minutes ago",
                "completed_at": None,
                "duration": "Running (3m 12s)",
                "url": "https://staging-dashboard.nexusdeploy.app",
                "logs_count": 12,
                "trigger_type": "git_push",
                "logs": [
                    {"timestamp": "14:25:10", "level": "info", "message": "Pulling source ref refs/heads/feat/live-telemetry..."},
                    {"timestamp": "14:25:15", "level": "info", "message": "Node version detected: 22.12.0"},
                    {"timestamp": "14:25:20", "level": "info", "message": "Running npm install with clean dependencies cache..."},
                    {"timestamp": "14:26:00", "level": "info", "message": "Transforming JSX/TSX modules with Vite AST pipeline..."},
                    {"timestamp": "14:26:45", "level": "info", "message": "Bundling vendor chunks and code splitting..."},
                    {"timestamp": "14:27:10", "level": "info", "message": "Running vitest unit suites (14 passed)..."},
                    {"timestamp": "14:27:30", "level": "info", "message": "Building staging edge preview instance..."}
                ]
            },
            {
                "id": "dep-989",
                "project_id": "proj-3",
                "project_name": "billing-service",
                "environment": "production",
                "status": "Success",
                "branch": "main",
                "commit_hash": "f1a23c4",
                "commit_message": "fix: stripe webhook signature verification tolerance",
                "author": "Jane Doe",
                "started_at": "1 hour ago",
                "completed_at": "58 minutes ago",
                "duration": "2m 10s",
                "url": "https://billing.nexusdeploy.app",
                "logs_count": 15,
                "trigger_type": "manual",
                "logs": [
                    {"timestamp": "13:42:00", "level": "info", "message": "Manual deployment triggered from NexusDeploy console."},
                    {"timestamp": "13:42:15", "level": "info", "message": "Checking out commit f1a23c4..."},
                    {"timestamp": "13:42:40", "level": "info", "message": "Installing Python dependencies from requirements.txt..."},
                    {"timestamp": "13:43:20", "level": "info", "message": "Running database migration check: alembic upgrade head (Up to date)."},
                    {"timestamp": "13:43:50", "level": "info", "message": "Warm starting ASGI uvicorn workers..."},
                    {"timestamp": "13:44:10", "level": "success", "message": "Service successfully healthy on port 5000. Active routing updated."}
                ]
            },
            {
                "id": "dep-988",
                "project_id": "proj-4",
                "project_name": "auth-service",
                "environment": "production",
                "status": "Success",
                "branch": "main",
                "commit_hash": "e891b02",
                "commit_message": "security: update token signature validation key rotation",
                "author": "Marcus Chen",
                "started_at": "4 hours ago",
                "completed_at": "3 hours 58m ago",
                "duration": "1m 15s",
                "url": "https://auth.nexusdeploy.app",
                "logs_count": 10,
                "trigger_type": "git_push",
                "logs": [
                    {"timestamp": "10:30:00", "level": "info", "message": "Building Go binary with CGO_ENABLED=0..."},
                    {"timestamp": "10:30:45", "level": "info", "message": "Go tests passed: 42 test suites."},
                    {"timestamp": "10:31:15", "level": "success", "message": "Binary published to Kubernetes pod replicas."}
                ]
            },
            {
                "id": "dep-987",
                "project_id": "proj-2",
                "project_name": "web-dashboard",
                "environment": "production",
                "status": "Rolled Back",
                "branch": "main",
                "commit_hash": "b772a19",
                "commit_message": "perf: experimental client bundle chunk preloading",
                "author": "Jane Doe",
                "started_at": "Yesterday",
                "completed_at": "Yesterday",
                "duration": "1m 30s",
                "url": "https://dashboard.nexusdeploy.app",
                "logs_count": 9,
                "trigger_type": "rollback",
                "logs": [
                    {"timestamp": "Yesterday 16:00", "level": "warn", "message": "Rollback initiated: Reverting to deployment dep-985 (stable)."},
                    {"timestamp": "Yesterday 16:01", "level": "info", "message": "Swapping edge routing traffic DNS pointer to commit stable..."},
                    {"timestamp": "Yesterday 16:01", "level": "success", "message": "Rollback completed with zero downtime."}
                ]
            },
            {
                "id": "dep-986",
                "project_id": "proj-5",
                "project_name": "docs-portal",
                "environment": "production",
                "status": "Success",
                "branch": "main",
                "commit_hash": "99f301a",
                "commit_message": "docs: add API reference for /api/v1/deployments",
                "author": "Sarah Connor",
                "started_at": "1 day ago",
                "completed_at": "1 day ago",
                "duration": "2m 05s",
                "url": "https://docs.nexusdeploy.app",
                "logs_count": 8,
                "trigger_type": "git_push",
                "logs": [
                    {"timestamp": "1 day ago", "level": "info", "message": "Static generation completed for 48 markdown docs pages."},
                    {"timestamp": "1 day ago", "level": "success", "message": "Published to global CDN edge caches."}
                ]
            }
        ]

        self.activities: List[Dict[str, Any]] = [
            {
                "id": "act-1",
                "action": "Triggered deployment to production",
                "project_name": "api-gateway",
                "user_name": "Jane Doe",
                "timestamp": "2 minutes ago",
                "type": "deploy",
                "status": "success",
                "details": "Commit a8f3b21 pushed to main branch"
            },
            {
                "id": "act-2",
                "action": "Started automated build",
                "project_name": "web-dashboard",
                "user_name": "Alex Rivera",
                "timestamp": "18 minutes ago",
                "type": "deploy",
                "status": "in_progress",
                "details": "PR #42 opened: feat/live-telemetry"
            },
            {
                "id": "act-3",
                "action": "Updated environment secrets",
                "project_name": "billing-service",
                "user_name": "Jane Doe",
                "timestamp": "1 hour ago",
                "type": "env_update",
                "status": "success",
                "details": "Rotated STRIPE_WEBHOOK_SECRET"
            },
            {
                "id": "act-4",
                "action": "Added custom domain",
                "project_name": "api-gateway",
                "user_name": "Jane Doe",
                "timestamp": "3 hours ago",
                "type": "domain_added",
                "status": "success",
                "details": "Bound api.nexusdeploy.io with auto SSL certificate"
            },
            {
                "id": "act-5",
                "action": "Rolled back deployment",
                "project_name": "web-dashboard",
                "user_name": "Jane Doe",
                "timestamp": "Yesterday",
                "type": "rollback",
                "status": "success",
                "details": "Restored stable release dep-985"
            }
        ]

store = DataStore()
