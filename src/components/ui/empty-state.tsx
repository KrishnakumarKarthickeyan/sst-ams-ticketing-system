import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Canonical empty state — icon, one-line headline, supporting copy, optional
 * action. Used by tables, lists and panels instead of bare "no data" strings.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-16',
        className
      )}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-muted">
          <Icon size={18} className="text-ink-muted" />
        </div>
      )}
      <p className="type-widget mt-3 text-ink">{title}</p>
      {description && <p className="type-meta mt-1 max-w-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
