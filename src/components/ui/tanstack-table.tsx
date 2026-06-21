'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { EmptyState } from './empty-state';
import { cn } from '../../lib/utils';

/**
 * Reusable enterprise data table built on @tanstack/react-table — headless sort,
 * pagination, global filter and column visibility, rendered with the shared
 * shadcn Table primitives + EmptyState. The canonical grid for list views that
 * need client-side sort/paginate (≤100-user scale; no server round-trips).
 */
interface TanstackTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Optional free-text filter applied across all columns. */
  globalFilter?: string;
  pageSize?: number;
  columnVisibility?: VisibilityState;
  initialSort?: SortingState;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Whole-row click (e.g. navigate to detail). */
  onRowClick?: (row: T) => void;
  /** Per-row extra classes (e.g. escalation/locked highlight). */
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

export function TanstackTable<T>({
  columns,
  data,
  globalFilter = '',
  pageSize = 10,
  columnVisibility,
  initialSort = [],
  emptyTitle = 'No records found',
  emptyDescription = 'Nothing matches the current filters.',
  onRowClick,
  rowClassName,
  className,
}: TanstackTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSort);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, ...(columnVisibility ? { columnVisibility } : {}) },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className={cn('rounded-lg border border-line bg-surface shadow-card', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface-muted">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? <ChevronUp size={12} /> : dir === 'desc' ? <ChevronDown size={12} /> : <ChevronsUpDown size={12} className="text-ink-muted/60" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0">
                  <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} compact />
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn('hover:bg-surface-muted/60', onRowClick && 'cursor-pointer', rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11px] text-ink-secondary">
          <span className="tabular-nums">Showing {from}–{to} of {total}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-line hover:bg-surface-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 tabular-nums">Page {pageIndex + 1} / {table.getPageCount()}</span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-line hover:bg-surface-muted disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
