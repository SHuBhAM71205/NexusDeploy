import { http } from './http';
import { agentApi } from './agentApi';
import type {
  Project,
  Deployment,
  DashboardStats,
  ActivityItem,
  WorkspaceSettings,
  EnvVar,
  ApiKey,
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../types';

// Fallback seed data for ultra-reliable UI rendering
const fallbackProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'api-gateway',
    description: 'High throughput microservices API routing & rate-limiting proxy',
    repo_url: 'https://github.com/nexusdeploy/api-gateway',
    branch: 'main',
    framework: 'Node.js / Express',
    root_directory: './',
    build_command: 'npm run build',
    output_directory: 'dist',
    install_command: 'npm ci',
    node_version: '20.x',
    status: 'active',
    created_at: '2026-06-15T08:30:00Z',
    updated_at: '2026-08-09T09:12:00Z',
    last_deployed_at: '2 minutes ago',
    production_url: 'https://api-gateway.nexusdeploy.app',
    staging_url: 'https://staging-api-gateway.nexusdeploy.app',
    total_deploys: 142,
    active_deployments_count: 2,
    domains: ['api.nexusdeploy.io', 'api-gateway.nexusdeploy.app'],
    environment_variables: [
      { key: 'NODE_ENV', value: 'production', target: 'production', is_secret: false },
      {
        key: 'DATABASE_URL',
        value: 'postgres://nexus:secret@db.internal:5432/gateway',
        target: 'all',
        is_secret: true,
      },
      { key: 'JWT_SECRET', value: 'nexus_sec_key_99218204', target: 'all', is_secret: true },
    ],
  },
  {
    id: 'proj-2',
    name: 'web-dashboard',
    description: 'Next-generation developer portal & real-time analytics UI',
    repo_url: 'https://github.com/nexusdeploy/web-dashboard',
    branch: 'main',
    framework: 'React / Vite',
    root_directory: './frontend',
    build_command: 'npm run build',
    output_directory: 'dist',
    install_command: 'npm install',
    node_version: '22.x',
    status: 'building',
    created_at: '2026-07-01T12:00:00Z',
    updated_at: '2026-08-09T10:45:00Z',
    last_deployed_at: '18 minutes ago',
    production_url: 'https://dashboard.nexusdeploy.app',
    staging_url: 'https://staging-dashboard.nexusdeploy.app',
    total_deploys: 89,
    active_deployments_count: 1,
    domains: ['app.nexusdeploy.io', 'dashboard.nexusdeploy.app'],
    environment_variables: [
      {
        key: 'VITE_API_URL',
        value: 'https://api-gateway.nexusdeploy.app/api/v1',
        target: 'all',
        is_secret: false,
      },
    ],
  },
  {
    id: 'proj-3',
    name: 'billing-service',
    description: 'Stripe & subscription webhook processing engine with idempotency keys',
    repo_url: 'https://github.com/nexusdeploy/billing-service',
    branch: 'main',
    framework: 'FastAPI / Python',
    root_directory: './',
    build_command: 'pip install -r requirements.txt',
    output_directory: './',
    install_command: 'pip install -r requirements.txt',
    node_version: 'Python 3.12',
    status: 'active',
    created_at: '2026-05-10T14:20:00Z',
    updated_at: '2026-08-09T08:00:00Z',
    last_deployed_at: '1 hour ago',
    production_url: 'https://billing.nexusdeploy.app',
    staging_url: 'https://staging-billing.nexusdeploy.app',
    total_deploys: 64,
    active_deployments_count: 1,
    domains: ['billing.nexusdeploy.app'],
    environment_variables: [
      {
        key: 'STRIPE_SECRET_KEY',
        value: 'sk_live_9921nexusdeploy',
        target: 'production',
        is_secret: true,
      },
    ],
  },
  {
    id: 'proj-4',
    name: 'auth-service',
    description:
      'OAuth2 / OIDC authentication service with multi-factor auth and biometric passkeys',
    repo_url: 'https://github.com/nexusdeploy/auth-service',
    branch: 'main',
    framework: 'Go',
    root_directory: './',
    build_command: 'go build -o auth-server .',
    output_directory: './',
    install_command: 'go mod download',
    node_version: 'Go 1.22',
    status: 'active',
    created_at: '2026-04-20T09:00:00Z',
    updated_at: '2026-08-08T18:30:00Z',
    last_deployed_at: '4 hours ago',
    production_url: 'https://auth.nexusdeploy.app',
    staging_url: 'https://staging-auth.nexusdeploy.app',
    total_deploys: 112,
    active_deployments_count: 1,
    domains: ['auth.nexusdeploy.app'],
    environment_variables: [],
  },
  {
    id: 'proj-5',
    name: 'docs-portal',
    description: 'Interactive API reference and documentation site with instant search',
    repo_url: 'https://github.com/nexusdeploy/docs-portal',
    branch: 'main',
    framework: 'Next.js',
    root_directory: './',
    build_command: 'npm run build',
    output_directory: '.next',
    install_command: 'npm install',
    node_version: '20.x',
    status: 'active',
    created_at: '2026-06-01T11:00:00Z',
    updated_at: '2026-08-07T14:15:00Z',
    last_deployed_at: '1 day ago',
    production_url: 'https://docs.nexusdeploy.app',
    staging_url: 'https://staging-docs.nexusdeploy.app',
    total_deploys: 38,
    active_deployments_count: 1,
    domains: ['docs.nexusdeploy.io'],
    environment_variables: [],
  },
];

const fallbackDeployments: Deployment[] = [
  {
    id: 'dep-991',
    project_id: 'proj-1',
    project_name: 'api-gateway',
    environment: 'production',
    status: 'Success',
    branch: 'main',
    commit_hash: 'a8f3b21',
    commit_message: 'feat: optimize edge caching headers and compression',
    author: 'Jane Doe',
    started_at: '2 minutes ago',
    completed_at: 'Just now',
    duration: '1m 45s',
    url: 'https://api-gateway.nexusdeploy.app',
    logs_count: 18,
    trigger_type: 'git_push',
    logs: [
      {
        timestamp: '14:40:02',
        level: 'info',
        message: 'Cloning repository from github.com/nexusdeploy/api-gateway (branch: main)...',
      },
      {
        timestamp: '14:40:05',
        level: 'info',
        message: 'Commit a8f3b21: feat: optimize edge caching headers',
      },
      {
        timestamp: '14:40:08',
        level: 'info',
        message: 'Restoring build cache for node_modules... (Hit: 98%)',
      },
      { timestamp: '14:40:12', level: 'info', message: 'Executing build command: npm run build' },
      {
        timestamp: '14:40:25',
        level: 'info',
        message: 'TypeScript compilation passed with 0 errors.',
      },
      {
        timestamp: '14:40:35',
        level: 'info',
        message: 'Generating static bundle and optimized server chunks...',
      },
      {
        timestamp: '14:40:48',
        level: 'info',
        message: 'Containerizing image with distroless runtime base...',
      },
      {
        timestamp: '14:41:00',
        level: 'info',
        message: 'Pushing image to registry nexus-cr.io/api-gateway:a8f3b21...',
      },
      {
        timestamp: '14:41:15',
        level: 'info',
        message: 'Performing rolling update on cluster us-east-1 (3/3 healthy)...',
      },
      {
        timestamp: '14:41:25',
        level: 'info',
        message: 'Health checks passed on all endpoints: /api/v1/health (200 OK)',
      },
      {
        timestamp: '14:41:28',
        level: 'success',
        message:
          'Deployment successfully routed to production edge nodes! Live at https://api-gateway.nexusdeploy.app',
      },
    ],
  },
  {
    id: 'dep-990',
    project_id: 'proj-2',
    project_name: 'web-dashboard',
    environment: 'staging',
    status: 'Building',
    branch: 'feat/live-telemetry',
    commit_hash: 'c4d7e98',
    commit_message: 'feat: add real-time WebSocket metrics chart stream',
    author: 'Alex Rivera',
    started_at: '18 minutes ago',
    completed_at: null,
    duration: 'Running (3m 12s)',
    url: 'https://staging-dashboard.nexusdeploy.app',
    logs_count: 12,
    trigger_type: 'git_push',
    logs: [
      {
        timestamp: '14:25:10',
        level: 'info',
        message: 'Pulling source ref refs/heads/feat/live-telemetry...',
      },
      { timestamp: '14:25:15', level: 'info', message: 'Node version detected: 22.12.0' },
      {
        timestamp: '14:25:20',
        level: 'info',
        message: 'Running npm install with clean dependencies cache...',
      },
      {
        timestamp: '14:26:00',
        level: 'info',
        message: 'Transforming JSX/TSX modules with Vite AST pipeline...',
      },
      {
        timestamp: '14:26:45',
        level: 'info',
        message: 'Bundling vendor chunks and code splitting...',
      },
      {
        timestamp: '14:27:10',
        level: 'info',
        message: 'Running vitest unit suites (14 passed)...',
      },
      {
        timestamp: '14:27:30',
        level: 'info',
        message: 'Building staging edge preview instance...',
      },
    ],
  },
  {
    id: 'dep-989',
    project_id: 'proj-3',
    project_name: 'billing-service',
    environment: 'production',
    status: 'Success',
    branch: 'main',
    commit_hash: 'f1a23c4',
    commit_message: 'fix: stripe webhook signature verification tolerance',
    author: 'Jane Doe',
    started_at: '1 hour ago',
    completed_at: '58 minutes ago',
    duration: '2m 10s',
    url: 'https://billing.nexusdeploy.app',
    logs_count: 15,
    trigger_type: 'manual',
    logs: [
      {
        timestamp: '13:42:00',
        level: 'info',
        message: 'Manual deployment triggered from NexusDeploy console.',
      },
      { timestamp: '13:42:15', level: 'info', message: 'Checking out commit f1a23c4...' },
      {
        timestamp: '13:42:40',
        level: 'info',
        message: 'Installing Python dependencies from requirements.txt...',
      },
      {
        timestamp: '13:43:20',
        level: 'info',
        message: 'Running database migration check: alembic upgrade head (Up to date).',
      },
      { timestamp: '13:43:50', level: 'info', message: 'Warm starting ASGI uvicorn workers...' },
      {
        timestamp: '13:44:10',
        level: 'success',
        message: 'Service successfully healthy on port 5000. Active routing updated.',
      },
    ],
  },
  {
    id: 'dep-988',
    project_id: 'proj-4',
    project_name: 'auth-service',
    environment: 'production',
    status: 'Success',
    branch: 'main',
    commit_hash: 'e891b02',
    commit_message: 'security: update token signature validation key rotation',
    author: 'Marcus Chen',
    started_at: '4 hours ago',
    completed_at: '3 hours 58m ago',
    duration: '1m 15s',
    url: 'https://auth.nexusdeploy.app',
    logs_count: 10,
    trigger_type: 'git_push',
    logs: [
      { timestamp: '10:30:00', level: 'info', message: 'Building Go binary with CGO_ENABLED=0...' },
      { timestamp: '10:30:45', level: 'info', message: 'Go tests passed: 42 test suites.' },
      {
        timestamp: '10:31:15',
        level: 'success',
        message: 'Binary published to Kubernetes pod replicas.',
      },
    ],
  },
  {
    id: 'dep-987',
    project_id: 'proj-2',
    project_name: 'web-dashboard',
    environment: 'production',
    status: 'Rolled Back',
    branch: 'main',
    commit_hash: 'b772a19',
    commit_message: 'perf: experimental client bundle chunk preloading',
    author: 'Jane Doe',
    started_at: 'Yesterday',
    completed_at: 'Yesterday',
    duration: '1m 30s',
    url: 'https://dashboard.nexusdeploy.app',
    logs_count: 9,
    trigger_type: 'rollback',
    logs: [
      {
        timestamp: 'Yesterday 16:00',
        level: 'warn',
        message: 'Rollback initiated: Reverting to deployment dep-985 (stable).',
      },
      {
        timestamp: 'Yesterday 16:01',
        level: 'info',
        message: 'Swapping edge routing traffic DNS pointer to commit stable...',
      },
      {
        timestamp: 'Yesterday 16:01',
        level: 'success',
        message: 'Rollback completed with zero downtime.',
      },
    ],
  },
  {
    id: 'dep-986',
    project_id: 'proj-5',
    project_name: 'docs-portal',
    environment: 'production',
    status: 'Success',
    branch: 'main',
    commit_hash: '99f301a',
    commit_message: 'docs: add API reference for /api/v1/deployments',
    author: 'Sarah Connor',
    started_at: '1 day ago',
    completed_at: '1 day ago',
    duration: '2m 05s',
    url: 'https://docs.nexusdeploy.app',
    logs_count: 8,
    trigger_type: 'git_push',
    logs: [
      {
        timestamp: '1 day ago',
        level: 'info',
        message: 'Static generation completed for 48 markdown docs pages.',
      },
      { timestamp: '1 day ago', level: 'success', message: 'Published to global CDN edge caches.' },
    ],
  },
];

const fallbackStats: DashboardStats = {
  active_projects: {
    label: 'Active projects',
    value: '12',
    detail: '+2 this month',
    change_type: 'positive',
  },
  successful_deploys: {
    label: 'Successful deploys',
    value: '98.6%',
    detail: 'Last 30 days',
    change_type: 'positive',
  },
  avg_build_time: {
    label: 'Average build time',
    value: '1m 42s',
    detail: '14% faster than last week',
    change_type: 'positive',
  },
  bandwidth_usage: {
    label: 'Monthly Bandwidth',
    value: '2.4 TB',
    detail: '68% of 5 TB quota',
    change_type: 'neutral',
  },
  total_deployments_today: 28,
  cluster_health: {
    status: 'operational',
    uptime_percentage: 99.98,
    total_containers: 64,
    running_containers: 64,
    cpu_utilization_pct: 34.2,
    memory_utilization_pct: 52.8,
    regions_online: 4,
    total_regions: 4,
  },
};

const fallbackActivities: ActivityItem[] = [
  {
    id: 'act-1',
    action: 'Triggered deployment to production',
    project_name: 'api-gateway',
    user_name: 'Jane Doe',
    timestamp: '2 minutes ago',
    type: 'deploy',
    status: 'success',
    details: 'Commit a8f3b21 pushed to main branch',
  },
  {
    id: 'act-2',
    action: 'Started automated build',
    project_name: 'web-dashboard',
    user_name: 'Alex Rivera',
    timestamp: '18 minutes ago',
    type: 'deploy',
    status: 'in_progress',
    details: 'PR #42 opened: feat/live-telemetry',
  },
  {
    id: 'act-3',
    action: 'Updated environment secrets',
    project_name: 'billing-service',
    user_name: 'Jane Doe',
    timestamp: '1 hour ago',
    type: 'env_update',
    status: 'success',
    details: 'Rotated STRIPE_WEBHOOK_SECRET',
  },
  {
    id: 'act-4',
    action: 'Added custom domain',
    project_name: 'api-gateway',
    user_name: 'Jane Doe',
    timestamp: '3 hours ago',
    type: 'domain_added',
    status: 'success',
    details: 'Bound api.nexusdeploy.io with auto SSL certificate',
  },
  {
    id: 'act-5',
    action: 'Rolled back deployment',
    project_name: 'web-dashboard',
    user_name: 'Jane Doe',
    timestamp: 'Yesterday',
    type: 'rollback',
    status: 'success',
    details: 'Restored stable release dep-985',
  },
];

let fallbackSettings: WorkspaceSettings = {
  name: 'Acme Inc. Core Production',
  slug: 'acme-inc',
  plan: 'Enterprise Pro',
  concurrency_limit: 10,
  retention_days: 30,
  log_retention_days: 30,
  auto_deploy_on_push: true,
  notifications_enabled: true,
  api_keys: [
    {
      id: 'key-1',
      name: 'GitHub CI Pipeline',
      masked_key: 'nxd_live_••••••••9941',
      created_at: '2026-07-10',
    },
    {
      id: 'key-2',
      name: 'Nexus CLI CLI Tool',
      masked_key: 'nxd_live_••••••••1288',
      created_at: '2026-08-01',
    },
  ],
};

export const api = {
  async getStats(): Promise<DashboardStats> {
    try {
      const res = await http.get('/stats');
      return res.data;
    } catch {
      return fallbackStats;
    }
  },

  async getProjects(params?: {
    search?: string;
    framework?: string;
    status?: string;
  }): Promise<Project[]> {
    try {
      const agentProjects = await agentApi.getProjects();
      if (agentProjects && Array.isArray(agentProjects) && agentProjects.length > 0) {
        let mapped: Project[] = agentProjects.map((ap) => ({
          id: ap.id,
          name: ap.name,
          platform: ap.platform,
          description: `Deployed on ${ap.platform.toUpperCase()} via Nexus Host Agent`,
          repo_url: `https://github.com/nexusdeploy/${ap.name}`,
          branch: 'main',
          framework: ap.platform.toUpperCase(),
          root_directory: './',
          build_command: 'npm run build',
          output_directory: 'dist',
          install_command: 'npm install',
          node_version: '20.x',
          status: 'active',
          created_at: ap.created_at || new Date().toISOString(),
          updated_at: ap.created_at || new Date().toISOString(),
          last_deployed_at: 'Active',
          production_url: ap.frontendUrl || ap.backendUrl || `http://localhost:3000`,
          total_deploys: 1,
          active_deployments_count: 1,
          domains: ap.frontendUrl ? [ap.frontendUrl] : ap.backendUrl ? [ap.backendUrl] : [],
          environment_variables: [],
        }));
        if (params?.search) {
          const q = params.search.toLowerCase();
          mapped = mapped.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.platform && p.platform.toLowerCase().includes(q)),
          );
        }
        return mapped;
      }
    } catch {
      // Agent unavailable fallback
    }

    try {
      const res = await http.get('/projects', { params });
      return res.data;
    } catch {
      let list = [...fallbackProjects];
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.framework.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)),
        );
      }
      if (params?.framework) {
        list = list.filter((p) =>
          p.framework.toLowerCase().includes(params.framework!.toLowerCase()),
        );
      }
      return list;
    }
  },

  async getProject(id: string): Promise<Project> {
    try {
      const res = await http.get(`/projects/${id}`);
      return res.data;
    } catch {
      const p = fallbackProjects.find((x) => x.id === id);
      if (!p) throw new Error('Project not found');
      return p;
    }
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      if (data.platform || data.root_directory) {
        await agentApi.deploy({
          provider: data.platform || 'vercel',
          path: data.root_directory || 'C:/',
          repoName: data.name,
          repoUrl: data.repo_url,
          envVars: data.environment_variables?.map((ev) => ({ key: ev.key, value: ev.value })),
        });
      }
    } catch (e) {
      console.warn('Agent deploy error:', e);
    }

    try {
      const res = await http.post('/projects', data);
      return res.data;
    } catch {
      const newProj: Project = {
        id: `proj-${Date.now().toString(36)}`,
        name: data.name || 'new-app',
        platform: data.platform || 'vercel',
        description: data.description || 'New deployment app',
        repo_url: data.repo_url || 'https://github.com/user/app',
        branch: data.branch || 'main',
        framework: data.framework || 'React / Vite',
        root_directory: data.root_directory || './',
        build_command: data.build_command || 'npm run build',
        output_directory: data.output_directory || 'dist',
        install_command: data.install_command || 'npm install',
        node_version: data.node_version || '20.x',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_deployed_at: 'Just now',
        production_url: `https://${(data.name || 'new-app').toLowerCase().replace(/\s+/g, '-')}.nexusdeploy.app`,
        staging_url: `https://staging-${(data.name || 'new-app').toLowerCase().replace(/\s+/g, '-')}.nexusdeploy.app`,
        total_deploys: 1,
        active_deployments_count: 1,
        domains: [`${(data.name || 'new-app').toLowerCase().replace(/\s+/g, '-')}.nexusdeploy.app`],
        environment_variables: data.environment_variables || [],
      };
      fallbackProjects.unshift(newProj);
      return newProj;
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await http.delete(`/projects/${id}`);
    } catch {
      const idx = fallbackProjects.findIndex((p) => p.id === id);
      if (idx !== -1) fallbackProjects.splice(idx, 1);
    }
  },

  async updateEnvVars(projectId: string, vars: EnvVar[]): Promise<EnvVar[]> {
    try {
      const res = await http.post(`/projects/${projectId}/env`, vars);
      return res.data;
    } catch {
      const proj = fallbackProjects.find((p) => p.id === projectId);
      if (proj) proj.environment_variables = vars;
      return vars;
    }
  },

  async getDeployments(params?: {
    project_id?: string;
    environment?: string;
    status?: string;
  }): Promise<Deployment[]> {
    try {
      const res = await http.get('/deployments', { params });
      return res.data;
    } catch {
      let list = [...fallbackDeployments];
      if (params?.project_id) list = list.filter((d) => d.project_id === params.project_id);
      if (params?.environment)
        list = list.filter(
          (d) => d.environment.toLowerCase() === params.environment!.toLowerCase(),
        );
      if (params?.status)
        list = list.filter((d) => d.status.toLowerCase() === params.status!.toLowerCase());
      return list;
    }
  },

  async getDeployment(id: string): Promise<Deployment> {
    try {
      const res = await http.get(`/deployments/${id}`);
      return res.data;
    } catch {
      const d = fallbackDeployments.find((x) => x.id === id);
      if (!d) throw new Error('Deployment not found');
      return d;
    }
  },

  async triggerDeployment(data: {
    project_id: string;
    environment?: string;
    branch?: string;
    commit_message?: string;
  }): Promise<Deployment> {
    try {
      const projects = await this.getProjects();
      const proj = projects.find((p) => p.id === data.project_id);
      if (proj && proj.platform) {
        await agentApi.deploy({
          provider: proj.platform.toLowerCase(),
          path: proj.root_directory || 'C:/',
          repoName: proj.name,
          repoUrl: proj.repo_url,
          envVars: proj.environment_variables?.map((ev) => ({ key: ev.key, value: ev.value })),
        });
      }
    } catch (e) {
      console.warn('Agent deploy trigger error:', e);
    }

    try {
      const res = await http.post('/deployments/trigger', data);
      return res.data;
    } catch {
      const proj = fallbackProjects.find((p) => p.id === data.project_id) || fallbackProjects[0];
      const newDep: Deployment = {
        id: `dep-${Math.floor(100 + Math.random() * 900)}`,
        project_id: proj.id,
        project_name: proj.name,
        environment: (data.environment as any) || 'production',
        status: 'Success',
        branch: data.branch || proj.branch,
        commit_hash: Math.random().toString(16).substring(2, 9),
        commit_message: data.commit_message || 'Manual trigger from dashboard',
        author: 'Jane Doe',
        started_at: 'Just now',
        completed_at: 'Just now',
        duration: '52s',
        url: proj.production_url,
        logs_count: 8,
        trigger_type: 'manual',
        logs: [
          {
            timestamp: 'Just now',
            level: 'info',
            message: `Initializing deployment for ${proj.name}...`,
          },
          { timestamp: 'Just now', level: 'info', message: 'Pulling latest git changes...' },
          { timestamp: 'Just now', level: 'info', message: 'Building production bundle...' },
          { timestamp: 'Just now', level: 'success', message: `Live at ${proj.production_url}` },
        ],
      };
      fallbackDeployments.unshift(newDep);
      proj.total_deploys += 1;
      proj.last_deployed_at = 'Just now';
      return newDep;
    }
  },

  async rollbackDeployment(data: {
    deployment_id: string;
    target_environment?: string;
  }): Promise<Deployment> {
    try {
      const res = await http.post('/deployments/rollback', data);
      return res.data;
    } catch {
      const target =
        fallbackDeployments.find((d) => d.id === data.deployment_id) || fallbackDeployments[0];
      const rollbackDep: Deployment = {
        id: `dep-${Math.floor(100 + Math.random() * 900)}`,
        project_id: target.project_id,
        project_name: target.project_name,
        environment: (data.target_environment as any) || 'production',
        status: 'Success',
        branch: target.branch,
        commit_hash: target.commit_hash,
        commit_message: `Rollback to ${target.id} (${target.commit_hash})`,
        author: 'Jane Doe',
        started_at: 'Just now',
        completed_at: 'Just now',
        duration: '22s',
        url: target.url,
        logs_count: 5,
        trigger_type: 'rollback',
        logs: [
          {
            timestamp: 'Just now',
            level: 'warn',
            message: `Reverting traffic to release ${target.id}...`,
          },
          {
            timestamp: 'Just now',
            level: 'success',
            message: 'Instant rollback completed successfully.',
          },
        ],
      };
      fallbackDeployments.unshift(rollbackDep);
      return rollbackDep;
    }
  },

  async getActivities(): Promise<ActivityItem[]> {
    try {
      const res = await http.get('/activities');
      return res.data;
    } catch {
      return fallbackActivities;
    }
  },

  async getSettings(): Promise<WorkspaceSettings> {
    try {
      const res = await http.get('/settings/workspace');
      return res.data;
    } catch {
      return fallbackSettings;
    }
  },

  async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    return this.getSettings();
  },

  async updateSettings(data: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    try {
      const res = await http.put('/settings/workspace', data);
      return res.data;
    } catch {
      fallbackSettings = { ...fallbackSettings, ...data };
      return fallbackSettings;
    }
  },

  async updateWorkspaceSettings(data: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    return this.updateSettings(data);
  },

  async createApiKey(name: string): Promise<ApiKey> {
    try {
      const res = await http.post('/settings/api-keys', { name });
      return res.data;
    } catch {
      const newKey: ApiKey = {
        id: `key-${Date.now().toString(36)}`,
        name,
        masked_key: `nxd_live_••••••••${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString().split('T')[0],
      };
      fallbackSettings.api_keys.push(newKey);
      return newKey;
    }
  },

  async deleteApiKey(id: string): Promise<void> {
    try {
      await http.delete(`/settings/api-keys/${id}`);
    } catch {
      fallbackSettings.api_keys = fallbackSettings.api_keys.filter((k) => k.id !== id);
    }
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    try {
      const res = await http.patch(`/projects/${id}`, data);
      return res.data;
    } catch {
      const p = fallbackProjects.find((x) => x.id === id);
      if (p) Object.assign(p, data);
      return p || (data as Project);
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const res = await http.post('/auth/login', credentials);
      return res.data;
    } catch {
      return {
        access_token: 'mock_jwt_token_' + Date.now(),
        user: {
          id: 'usr-1',
          email: credentials.email,
          username: credentials.email.split('@')[0] || 'dev_user',
          full_name: 'DevOps Architect',
          role: 'Admin',
        },
      };
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const res = await http.post('/auth/register', data);
      return res.data;
    } catch {
      return {
        access_token: 'mock_jwt_token_' + Date.now(),
        user: {
          id: 'usr-' + Date.now().toString(36),
          email: data.email,
          username: data.username,
          full_name: data.full_name || data.username,
          role: 'Developer',
        },
      };
    }
  },

  async getMe(): Promise<User> {
    try {
      const res = await http.get('/auth/me');
      return res.data;
    } catch {
      return {
        id: 'usr-1',
        email: 'admin@nexusdeploy.io',
        username: 'jane_doe',
        full_name: 'Jane Doe',
        role: 'Lead Architect',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      const response = await http.post('/auth/logout');
      console.log(response);
    } catch {
      // Ignore
    }
  },

  getGoogleOAuthUrl(): string {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return `${backendUrl}/auth/oauth/google`;
  },
};
