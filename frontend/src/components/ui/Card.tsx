import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive' | 'subtle';
}

export function Card({ className, variant = 'glass', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200',
        variant === 'glass' &&
          'border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-xl',
        variant === 'interactive' &&
          'border border-slate-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-indigo-500/40 dark:hover:bg-slate-900',
        variant === 'default' &&
          'border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        variant === 'subtle' &&
          'border border-slate-100 bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-950/50',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
