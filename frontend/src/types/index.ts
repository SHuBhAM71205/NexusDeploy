export type Framework =
  | 'React / Vite'
  | 'Next.js'
  | 'Node.js / Express'
  | 'FastAPI / Python'
  | 'Go'
  | 'Rust'
  | 'Vue'
  | 'Static HTML';

export interface EnvVar {
  key: string;
  value: string;
  target?: 'all' | 'production' | 'staging' | 'preview';
  is_secret?: boolean;
  id?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  branch: string;
  framework: string | null;
  root_directory: string;
  build_command: string | null;
  output_directory: string | null;
  install_command: string | null;
  node_version: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  last_deployed_at: string | null;
  production_url: string | null;
  staging_url: string | null;
  total_deploys: number;
  active_deployments_count: number;
  platform: string | null;
  domains: string[];
  environment_variables: EnvVar[];
  owner_id: string | null;
}

export interface LogLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  project_name: string;
  environment: string;
  status: 'started' | 'running' | 'success' | 'failed';
  branch: string | null;
  commit_hash: string | null;
  commit_message: string | null;
  author: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration: string | null;
  url: string | null;
  logs_count: number;
  trigger_type: string | null;
  provider: string | null;
  error: string | null;
  provider_metadata: Record<string, unknown> | null;
  logs?: LogLine[];
  build_metrics?: Record<string, unknown> | null;
}

export interface StatMetric {
  label: string;
  value: string;
  detail: string;
  change_type: 'positive' | 'neutral' | 'negative';
}

export interface ClusterHealth {
  status: 'operational' | 'degraded' | 'maintenance';
  uptime_percentage: number;
  total_containers: number;
  running_containers: number;
  cpu_utilization_pct: number;
  memory_utilization_pct: number;
  regions_online: number;
  total_regions: number;
}

export interface DashboardStats {
  active_projects: StatMetric;
  successful_deploys: StatMetric;
  avg_build_time: StatMetric;
  bandwidth_usage: StatMetric;
  total_deployments_today: number;
  cluster_health: ClusterHealth;
}

export interface MonitoringProviderMetrics {
  started_total: number;
  successful_total: number;
  failed_total: number;
  duration_observations: number;
  average_duration_seconds: number | null;
}

export interface MonitoringSummary {
  updated_at: string;
  requests: {
    total: number;
    server_errors_total: number;
  };
  deployments: MonitoringProviderMetrics & {
    providers: Record<string, MonitoringProviderMetrics>;
  };
}

export interface ActivityItem {
  id: string;
  action: string;
  project_name: string;
  user_name: string;
  timestamp: string;
  type: 'deploy' | 'rollback' | 'env_update' | 'project_created' | 'domain_added';
  status: 'success' | 'in_progress' | 'failed';
  details?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  masked_key: string;
  created_at: string;
}

export interface WorkspaceSettings {
  name: string;
  slug?: string;
  plan: string;
  concurrency_limit: number;
  retention_days?: number;
  log_retention_days: number;
  auto_deploy_on_push?: boolean;
  notifications_enabled?: boolean;
  api_keys: ApiKey[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData {
  email: string;
  password?: string;
  username: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user?: User;
}

