import { Link } from 'react-router-dom';
import { Rocket, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card variant="glass" className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Rocket size={32} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">404</h1>
        <h2 className="mt-1 text-base font-semibold text-slate-200">Page Not Found</h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          The route you are trying to access does not exist on this NexusDeploy cluster or has been
          moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}
