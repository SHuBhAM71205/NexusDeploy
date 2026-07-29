import { Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<Placeholder title="Projects" />} />
        <Route path="deployments" element={<Placeholder title="Deployments" />} />
        <Route path="settings" element={<Placeholder title="Settings" />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>;
}
