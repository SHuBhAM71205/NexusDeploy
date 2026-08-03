import { Boxes, ChevronDown, LayoutDashboard, Rocket, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: Boxes },
  { to: '/deployments', label: 'Deployments', icon: Rocket },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b bg-slate-950 px-4 py-5 text-slate-300 md:min-h-screen md:border-r md:border-b-0">
        <a className="mb-9 flex items-center gap-2 px-2 text-lg font-semibold text-white" href="/">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-500 font-bold">
            N
          </span>
          NexusDeploy
        </a>
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-800 hover:text-white',
                  isActive && 'bg-slate-800 text-white',
                )
              }
            >
              <Icon size={18} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex h-16 items-center justify-between border-b bg-white px-5 sm:px-8">
          <div className="text-sm text-slate-500">
            Workspace / <span className="font-medium text-slate-900">Acme Inc.</span>
          </div>
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-slate-100"
            type="button"
          >
            <span className="grid size-7 place-items-center rounded-full bg-indigo-100 text-xs text-indigo-700">
              JD
            </span>
            <span className="hidden sm:inline">Jane Doe</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </header>
        <main className="mx-auto max-w-7xl p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
