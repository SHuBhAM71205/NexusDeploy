import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, Clock, AlertTriangle, RotateCcw } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'building' | 'failed' | 'queued' | 'rollback' | 'neutral' | 'indigo' | 'emerald' | 'amber';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();

  if (s === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-medium">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
        Success
      </span>
    );
  }

  if (s === 'building') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
        Building
      </span>
    );
  }

  if (s === 'rolled back' || s === 'rollback') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300 px-2.5 py-0.5 text-xs font-medium">
        <RotateCcw size={12} className="text-purple-600 dark:text-purple-400" />
        Rolled Back
      </span>
    );
  }

  if (s === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 px-2.5 py-0.5 text-xs font-medium">
        <AlertTriangle size={12} className="text-rose-600 dark:text-rose-400" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-0.5 text-xs font-medium">
      <Clock size={12} />
      {status}
    </span>
  );
}

export function EnvironmentBadge({ env }: { env: string }) {
  const e = env.toLowerCase();
  if (e === 'production') {
    return (
      <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 px-2 py-0.5 text-xs font-medium">
        Production
      </span>
    );
  }
  if (e === 'staging') {
    return (
      <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 px-2 py-0.5 text-xs font-medium">
        Staging
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium">
      Preview
    </span>
  );
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    neutral: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
    building: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400',
    queued: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    rollback: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors',
        variantStyles[variant] || variantStyles.neutral,
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
