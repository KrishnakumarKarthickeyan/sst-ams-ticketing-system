import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Canonical page header. Every screen opens with one of these — title left,
 * actions right, optional meta strip below. Replaces per-page ad-hoc headers.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-line pb-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="type-title text-ink">{title}</h1>
          {description && <p className="type-meta mt-1 max-w-2xl text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>}
    </div>
  );
}
