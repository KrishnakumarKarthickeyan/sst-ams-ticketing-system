'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
import { version, gitSha, label, fullLabel, buildDateLabel } from '../../lib/version';

/**
 * App version indicator. Reads ONLY from src/lib/version.ts (build-injected) —
 * never hardcode a version anywhere else.
 *  - compact: small muted `v1.4.0`.
 *  - full:    `v1.4.0 · a1b2c3d` with a tooltip (version / commit / build date).
 */
export function AppVersion({
  variant = 'compact',
  className,
}: {
  variant?: 'compact' | 'full';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <span className={cn('type-num select-none text-[11px] text-muted-foreground', className)} title={fullLabel}>
        {label}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('type-num cursor-default select-none text-[11px] text-muted-foreground', className)}>
            {fullLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-left">
          <div className="space-y-0.5">
            <div>Version: v{version}</div>
            <div>Commit: {gitSha}</div>
            {buildDateLabel && <div>Built: {buildDateLabel}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
