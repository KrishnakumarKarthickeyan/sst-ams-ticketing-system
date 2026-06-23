'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from './skeleton';

/**
 * At-a-glance workload distribution: four bucket cards (Idle / Healthy / Busy /
 * Overloaded), each with a count and the members that fall in that utilization
 * band. Colors are theme tokens (slate / emerald / amber / red — no neon).
 * Thresholds are configurable; defaults: <40 idle, 40–75 healthy, 75–90 busy,
 * >90 overloaded.
 */
export interface LoadItem {
  id: string;
  name: string;
  utilization: number;
}

export interface LoadThresholds {
  idle: number;     // < idle  → Idle
  healthy: number;  // < healthy → Healthy
  busy: number;     // <= busy → Busy, else Overloaded
}

const DEFAULT_THRESHOLDS: LoadThresholds = { idle: 40, healthy: 75, busy: 90 };

type BucketKey = 'idle' | 'healthy' | 'busy' | 'overloaded';

const BUCKET_META: { key: BucketKey; label: string; classes: string; dot: string }[] = [
  { key: 'idle', label: 'Idle', classes: 'border-line bg-surface-subtle', dot: 'bg-ink-muted' },
  { key: 'healthy', label: 'Healthy', classes: 'border-success-border bg-success-soft', dot: 'bg-success' },
  { key: 'busy', label: 'Busy', classes: 'border-warning-border bg-warning-soft', dot: 'bg-warning' },
  { key: 'overloaded', label: 'Overloaded', classes: 'border-critical-border bg-critical-soft', dot: 'bg-critical' },
];

function bucketOf(u: number, t: LoadThresholds): BucketKey {
  if (u < t.idle) return 'idle';
  if (u < t.healthy) return 'healthy';
  if (u <= t.busy) return 'busy';
  return 'overloaded';
}

const initials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || (name || '?').slice(0, 2).toUpperCase();
};

export function LoadBuckets({
  items,
  thresholds = DEFAULT_THRESHOLDS,
  maxAvatars = 5,
  loading = false,
  className,
}: {
  items: LoadItem[];
  thresholds?: LoadThresholds;
  maxAvatars?: number;
  loading?: boolean;
  className?: string;
}) {
  const grouped: Record<BucketKey, LoadItem[]> = { idle: [], healthy: [], busy: [], overloaded: [] };
  items.forEach(i => grouped[bucketOf(i.utilization, thresholds)].push(i));

  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {BUCKET_META.map(b => {
        const members = grouped[b.key].sort((x, y) => y.utilization - x.utilization);
        return (
          <div key={b.key} className={cn('rounded-lg border p-3 shadow-card', b.classes)}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 type-status font-semibold uppercase tracking-wider text-ink-secondary">
                <span className={cn('h-1.5 w-1.5 rounded-full', b.dot)} />
                {b.label}
              </span>
              <span className="type-num text-lg font-semibold text-ink">{loading ? '·' : members.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {loading ? (
                <Skeleton className="h-5 w-24" />
              ) : members.length === 0 ? (
                <span className="type-status text-ink-muted">None</span>
              ) : (
                <>
                  {members.slice(0, maxAvatars).map(m => (
                    <span
                      key={m.id}
                      title={`${m.name} · ${m.utilization}%`}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[9px] font-bold uppercase text-ink-secondary"
                    >
                      {initials(m.name)}
                    </span>
                  ))}
                  {members.length > maxAvatars && (
                    <span className="type-status text-ink-muted">+{members.length - maxAvatars}</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
