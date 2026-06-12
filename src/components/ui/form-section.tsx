import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Sectioned form scaffolding: a titled block with description and a
 * consistent field grid. Forms compose these instead of ad-hoc divs.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6', className)}>
      <div className="mb-4 border-b border-line pb-3">
        <h3 className="type-section text-ink">{title}</h3>
        {description && <p className="type-meta mt-0.5 text-ink-muted">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** A labelled field wrapper; spans one column by default. */
export function FormField({
  label,
  required,
  hint,
  error,
  children,
  span = 1,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  span?: 1 | 2;
  className?: string;
}) {
  return (
    <div className={cn(span === 2 && 'sm:col-span-2', className)}>
      <label className="type-meta mb-1.5 block font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-critical">*</span>}
      </label>
      {children}
      {hint && !error && <p className="type-status mt-1 text-ink-muted">{hint}</p>}
      {error && <p className="type-status mt-1 font-medium text-critical">{error}</p>}
    </div>
  );
}
