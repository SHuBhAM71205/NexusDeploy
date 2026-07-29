import { Activity, CheckCircle2, Clock3, Rocket } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const stats = [
  { label: 'Active projects', value: '12', detail: '+2 this month', icon: Rocket },
  { label: 'Successful deploys', value: '98.6%', detail: 'Last 30 days', icon: CheckCircle2 },
  { label: 'Average build time', value: '3m 42s', detail: '14% faster', icon: Clock3 },
];

const deployments = [
  ['api-gateway', 'production', '2 minutes ago', 'Success'],
  ['web-dashboard', 'staging', '18 minutes ago', 'Building'],
  ['billing-service', 'production', '1 hour ago', 'Success'],
];

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-indigo-600">Tuesday, July 29</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Good morning, Jane</h1><p className="mt-2 text-slate-500">Here is what is happening across your projects.</p></div>
        <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">New project</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, detail, icon: Icon }) => <Card key={label} className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon size={20} /></span></div><p className="mt-4 text-xs font-medium text-emerald-600">{detail}</p></Card>)}
      </div>
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold text-slate-950">Recent deployments</h2><p className="mt-0.5 text-sm text-slate-500">Your latest production activity.</p></div><Activity className="text-slate-400" size={20} /></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Project</th><th className="px-5 py-3 font-medium">Environment</th><th className="px-5 py-3 font-medium">Started</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody>{deployments.map(([project, environment, started, status]) => <tr className="border-t" key={`${project}-${started}`}><td className="px-5 py-4 font-medium text-slate-900">{project}</td><td className="px-5 py-4 text-slate-600">{environment}</td><td className="px-5 py-4 text-slate-600">{started}</td><td className="px-5 py-4"><span className={status === 'Success' ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'}>{status}</span></td></tr>)}</tbody></table></div></Card>
    </div>
  );
}
