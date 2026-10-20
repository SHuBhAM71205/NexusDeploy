import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { AuthPage } from '../components/auth/AuthModal';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { DeploymentsPage } from '../pages/DeploymentsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

const ProjectDashboardPage = lazy(() => import('../pages/ProjectDashboardPage').then((module) => ({ default: module.ProjectDashboardPage })));

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div role="status" className="grid min-h-screen place-items-center text-sm text-slate-500">Checking session...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading project dashboard...</div>}><ProjectDashboardPage /></Suspense>} />
            <Route path="/deployments" element={<DeploymentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
