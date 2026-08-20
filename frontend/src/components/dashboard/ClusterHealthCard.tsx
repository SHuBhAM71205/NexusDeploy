import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity, Server, ShieldCheck, Globe } from 'lucide-react';
import { Card } from '../ui/Card';

interface ClusterNode {
  region: string;
  name: string;
  latency: string;
  status: 'online' | 'degraded' | 'offline';
}

export function ClusterHealthCard() {
  const [cpuUsage, setCpuUsage] = useState(28);
  const [memoryUsage, setMemoryUsage] = useState(42);
  const [activeNodes] = useState<ClusterNode[]>([
    { region: 'us-east', name: 'US East (N. Virginia)', latency: '14ms', status: 'online' },
    { region: 'eu-west', name: 'EU West (Frankfurt)', latency: '22ms', status: 'online' },
    { region: 'ap-southeast', name: 'AP East (Tokyo)', latency: '48ms', status: 'online' },
    { region: 'sa-east', name: 'SA East (São Paulo)', latency: '86ms', status: 'online' },
  ]);

  useEffect(() => {
    // Subtle real-time fluctuation simulation
    const interval = setInterval(() => {
      setCpuUsage((prev) => Math.min(95, Math.max(15, prev + (Math.floor(Math.random() * 7) - 3))));
      setMemoryUsage((prev) =>
        Math.min(90, Math.max(30, prev + (Math.floor(Math.random() * 5) - 2))),
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card variant="glass" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
            <Server size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Global Edge Cluster Health
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={12} />
                HEALTHY
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kubernetes cluster nodes, container telemetry, and edge network latency.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
          <Globe size={14} className="text-indigo-500" />
          <span>4/4 Regions Online</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-indigo-500" />
              <span>CPU Allocation</span>
            </div>
            <span className="font-mono text-slate-900 dark:text-white font-bold">{cpuUsage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            <div className="flex items-center gap-2">
              <HardDrive size={15} className="text-violet-500" />
              <span>Memory Utilization</span>
            </div>
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {memoryUsage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
              style={{ width: `${memoryUsage}%` }}
            />
          </div>
        </div>

        {/* Network & Requests */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-emerald-500" />
              <span>Edge Throughput</span>
            </div>
            <span className="font-mono text-slate-900 dark:text-white font-bold">12.4k req/s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full w-[65%] bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>
        </div>
      </div>

      {/* Regional Edge Nodes Table */}
      <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
          Edge Region Nodes
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeNodes.map((node) => (
            <div
              key={node.region}
              className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs"
            >
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  {node.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ping: {node.latency}</span>
              </div>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
