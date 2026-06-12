'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download,
  ChevronLeft, ChevronRight, Inbox, type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from './dropdown-menu';
import { Checkbox } from './checkbox';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** value used for sorting and CSV export; omit to disable sorting */
  sortValue?: (row: T) => string | number;
  /** value used for CSV export when it differs from sortValue */
  exportValue?: (row: T) => string | number;
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** column can be hidden via the column picker (default true) */
  hideable?: boolean;
  defaultHidden?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** wires row hover/click; rendered links inside cells still work */
  onRowClick?: (row: T) => void;
  /** marks a row as visually urgent (left border accent) */
  rowAccent?: (row: T) => 'critical' | 'warning' | null;
  /* selection + bulk actions */
  selectable?: boolean;
  bulkActions?: (selectedKeys: string[], clear: () => void) => React.ReactNode;
  /* empty state */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  /* chrome */
  exportName?: string; // enables CSV export when set
  pageSize?: number;   // 0 disables pagination
  toolbar?: React.ReactNode; // left side of the table toolbar (filters etc.)
  className?: string;
}

function toCsv<T>(columns: DataTableColumn<T>[], rows: T[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = columns.map(c => esc(typeof c.header === 'string' ? c.header : c.key));
  const lines = rows.map(r =>
    columns.map(c => esc((c.exportValue ?? c.sortValue)?.(r) ?? '')).join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

/**
 * Canonical enterprise table: sticky header, sorting, column visibility,
 * pagination, row selection with bulk actions, CSV export, and standard
 * loading/empty states. Pages supply columns + rows; the grammar is shared.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  rowAccent,
  selectable = false,
  bulkActions,
  emptyIcon = Inbox,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  exportName,
  pageSize = 25,
  toolbar,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter(c => c.defaultHidden).map(c => c.key))
  );
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visibleColumns = columns.filter(c => !hidden.has(c.key));

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = sv(a);
      const vb = sv(b);
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const paged = pageSize > 0 ? sorted.slice(safePage * pageSize, (safePage + 1) * pageSize) : sorted;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const pageKeys = paged.map(rowKey);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
  const togglePage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageKeys.forEach(k => next.delete(k));
      else pageKeys.forEach(k => next.add(k));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const handleExport = () => {
    const csv = toCsv(columns.filter(c => c.sortValue || c.exportValue), sorted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hideableColumns = columns.filter(c => c.hideable !== false);

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface shadow-card', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted/60 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {selectable && selected.size > 0 && bulkActions ? (
            <>
              <span className="type-status font-semibold text-ink">{selected.size} selected</span>
              {bulkActions(Array.from(selected), clearSelection)}
            </>
          ) : (
            toolbar ?? (
              <span className="type-status type-num text-ink-muted">
                {loading ? 'Loading…' : `${sorted.length} record${sorted.length === 1 ? '' : 's'}`}
              </span>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {exportName && (
            <button
              onClick={handleExport}
              disabled={loading || sorted.length === 0}
              className="type-status inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
            >
              <Download size={12} />
              Export
            </button>
          )}
          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="type-status inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink">
                  <Columns3 size={12} />
                  Columns
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="type-status text-ink-muted">Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={!hidden.has(col.key)}
                    onCheckedChange={checked => {
                      setHidden(prev => {
                        const next = new Set(prev);
                        if (checked) next.delete(col.key);
                        else next.add(col.key);
                        return next;
                      });
                    }}
                    className="type-meta"
                  >
                    {typeof col.header === 'string' ? col.header : col.key}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-line bg-surface-muted">
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <Checkbox checked={allPageSelected} onCheckedChange={togglePage} aria-label="Select page" />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'type-status px-3 py-2.5 font-semibold tracking-wider text-ink-muted uppercase',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.sortValue ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-ink',
                        sortKey === col.key && 'text-ink'
                      )}
                    >
                      {col.header}
                      {sortKey !== col.key && <ArrowUpDown size={11} className="opacity-50" />}
                      {sortKey === col.key && sortDir === 'asc' && <ArrowUp size={11} />}
                      {sortKey === col.key && sortDir === 'desc' && <ArrowDown size={11} />}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>}
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-3 py-3">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)}>
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              paged.map(row => {
                const key = rowKey(row);
                const accent = rowAccent?.(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'transition-colors hover:bg-surface-muted/70',
                      onRowClick && 'cursor-pointer',
                      accent === 'critical' && 'shadow-[inset_2px_0_0_var(--color-critical)]',
                      accent === 'warning' && 'shadow-[inset_2px_0_0_var(--color-warning)]'
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(key)}
                          onCheckedChange={checked => {
                            setSelected(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {visibleColumns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          'type-meta px-3 py-3 text-ink-secondary',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && pageCount > 1 && !loading && (
        <div className="flex items-center justify-between border-t border-line bg-surface-muted/60 px-3 py-2">
          <span className="type-status type-num text-ink-muted">
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="cursor-pointer rounded-md border border-line bg-surface p-1.5 text-ink-secondary transition-colors hover:bg-surface-subtle disabled:cursor-default disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="type-status type-num px-2 text-ink-secondary">
              {safePage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="cursor-pointer rounded-md border border-line bg-surface p-1.5 text-ink-secondary transition-colors hover:bg-surface-subtle disabled:cursor-default disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
