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
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  repo_url: string;
  branch: string;
  framework: string;
  root_directory: string;
  build_command: string;
  output_directory: string;
  install_command: string;
  node_version: string;
  status: 'active' | 'building' | 'failed' | 'paused';
  created_at: string;
  updated_at: string;
  last_deployed_at?: string;
  production_url?: string;
  staging_url?: string;
  total_deploys: number;
  active_deployments_count: number;
  platform?: string;
  domains: string[];
  environment_variables: EnvVar[];
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
  environment: 'production' | 'staging' | 'preview';
  status: 'Success' | 'Building' | 'Failed' | 'Queued' | 'Rolled Back';
  branch: string;
  commit_hash: string;
  commit_message: string;
  author: string;
  started_at: string;
  completed_at?: string | null;
  duration?: string;
  url?: string;
  logs_count: number;
  trigger_type: 'manual' | 'git_push' | 'webhook' | 'rollback';
  logs?: LogLine[];
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

