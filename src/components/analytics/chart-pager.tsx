'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * The ONE compact pagination pattern for top-N highlight charts. A chart shows
 * the top `pageSize` rows (already sorted by the caller); this hook slices them
 * into pages and <ChartPager> renders the ghost-button controls — placed in the
 * ChartCard `action` slot so the card body stays a fixed, compact height.
 */
export function useTopNPages<T>(rows: T[], pageSize = 8) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => rows.slice(safe * pageSize, safe * pageSize + pageSize), [rows, safe, pageSize]);
  return { page: safe, setPage, pageCount, pageRows, total: rows.length };
}

export function ChartPager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft size={14} />
      </Button>
      <span className="type-status whitespace-nowrap text-ink-muted">Page {page + 1}/{pageCount}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
