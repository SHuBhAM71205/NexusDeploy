import { useState, useEffect } from 'react';
import {
  Boxes,
  LayoutDashboard,
  Rocket,
  Settings,
  Search,
  Plus,
  Bell,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import type { Project, Deployment } from '../../types';
import { NewProjectModal } from '../ui/NewProjectModal';
import { TriggerDeployModal } from '../ui/TriggerDeployModal';
import { CommandSearchModal } from '../ui/CommandSearchModal';
import { AuthModal } from '../auth/AuthModal';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: Boxes },
  { to: '/deployments', label: 'Deployments', icon: Rocket },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isTriggerDeployOpen, setIsTriggerDeployOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const { user, openAuthModal, logout } = useAuth();

  const loadData = async () => {
    try {
      const [projs, deps] = await Promise.all([api.getProjects(), api.getDeployments()]);
      setProjects(projs);
      setDeployments(deps);
    } catch {
      // Handled by service fallbacks
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    try {
      const created = await api.createProject(data);
      notify(`Project "${created.name}" deployed successfully!`);
      loadData();
    } catch {
      notify('Failed to create project');
    }
  };

  const handleTriggerDeploy = async (data: { project_id: string; environment: string; branch: string; commit_message: string }) => {
    try {
      const dep = await api.triggerDeployment(data);
      notify(`Deployment ${dep.id} triggered for ${dep.project_name}!`);
      loadData();
    } catch {
      notify('Failed to trigger deployment');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#0b0f19] dark:text-slate-100 md:grid md:grid-cols-[16rem_1fr]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 shadow-2xl shadow-indigo-500/10 backdrop-blur-md dark:border-indigo-500/40 dark:bg-slate-900/95 dark:text-white">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="flex flex-col justify-between border-b border-slate-200 bg-white px-4 py-5 text-slate-600 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-300 md:min-h-screen md:border-r md:border-b-0 backdrop-blur-lg">
        <div>
          {/* Brand Logo */}
          <div className="mb-6 flex items-center justify-between px-2">
            <a className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 dark:text-white" href="/">
              <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 font-extrabold text-white shadow-md shadow-indigo-500/25">
                N
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">NexusDeploy</span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Cloud Orchestration</span>
              </div>
            </a>
          </div>

          {/* New Project Button */}
          <div className="px-2 mb-5">
            <button
              type="button"
              onClick={() => setIsNewProjectOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[0.98]"
            >
              <Plus size={14} /> New Project
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Main navigation">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 dark:bg-indigo-600/15 dark:text-indigo-300 dark:border-indigo-500/30'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white',
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </div>
                {label === 'Projects' && projects.length > 0 && (
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {projects.length}
                  </span>
                )}
                {label === 'Deployments' && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    Live
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: System Status */}
        <div className="mt-8 space-y-3 px-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cluster Status</span>
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">All Systems Operational</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">4/4 Edge Regions Online</p>
          </div>

          <a
            href="http://localhost:5000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            <span>Swagger API Docs</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 sm:px-8 backdrop-blur-md transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-950/80">
          {/* Search Trigger */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
            >
              <Search size={14} className="text-slate-400" />
              <span>Search projects, deployments...</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsTriggerDeployOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 transition"
            >
              <Rocket size={13} /> Trigger Deploy
            </button>

            {/* Theme Toggle Button */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'rounded-lg p-1.5 text-xs transition',
                  theme === 'light'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
                title="Light Mode"
                aria-label="Light mode"
              >
                <Sun size={15} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'rounded-lg p-1.5 text-xs transition',
                  theme === 'dark'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
                title="Dark Mode"
                aria-label="Dark mode"
              >
                <Moon size={15} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={cn(
                  'rounded-lg p-1.5 text-xs transition',
                  theme === 'system'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
                title="System Theme"
                aria-label="System theme"
              >
                <Laptop size={15} />
              </button>
            </div>

            {/* Notifications Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:text-slate-800 transition dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-white"
                aria-label="View notifications"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-950" />
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-2 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Notifications</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 cursor-pointer">Mark all read</span>
                  </div>
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 dark:bg-slate-950/60 dark:border-slate-800">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Deploy Succeeded</span>
                        <span className="text-[10px] text-slate-400">2m ago</span>
                      </div>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-[11px]">api-gateway (main) is live on production edge.</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 dark:bg-slate-950/60 dark:border-slate-800">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-amber-600 dark:text-amber-300">Build in progress</span>
                        <span className="text-[10px] text-slate-400">18m ago</span>
                      </div>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-[11px]">web-dashboard PR #42 started compiling.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth Action */}
            {user ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="grid size-6 place-items-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-[11px] font-bold text-white uppercase">
                  {user.username ? user.username.substring(0, 2) : 'US'}
                </span>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                    {user.full_name || user.username}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {user.role || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  title="Sign Out"
                  className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition"
              >
                <UserIcon size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />

      <TriggerDeployModal
        isOpen={isTriggerDeployOpen}
        onClose={() => setIsTriggerDeployOpen(false)}
        projects={projects}
        onSubmit={handleTriggerDeploy}
      />

      <CommandSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        projects={projects}
        deployments={deployments}
      />

      <AuthModal />
    </div>
  );
}
