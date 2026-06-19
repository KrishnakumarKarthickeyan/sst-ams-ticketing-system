'use client';

import React, { useEffect, useState } from 'react';
import { Bookmark, Plus, X, Check } from 'lucide-react';
import { listSavedViews, saveView, deleteView, type SavedView } from '../../lib/saved-views';

interface Props<F extends Record<string, unknown>> {
  /** Storage scope, e.g. "manager-desk". */
  scope: string;
  /** The current filter state to snapshot when saving. */
  currentFilters: F;
  /** Apply a saved view's filters back onto the page. */
  onApply: (filters: F) => void;
}

/**
 * Saved filter views — name the current filter combination and recall it later.
 * Presets live in localStorage (a UI preference). Reuses the tested saved-views
 * storage helpers; the active view is matched by deep-equal so it highlights.
 */
export function SavedViewsBar<F extends Record<string, unknown>>({ scope, currentFilters, onApply }: Props<F>) {
  const [views, setViews] = useState<SavedView<F>[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => { setViews(listSavedViews<F>(scope)); }, [scope]);

  const sameFilters = (f: F) => JSON.stringify(f) === JSON.stringify(currentFilters);

  const commit = () => {
    if (!name.trim()) { setAdding(false); return; }
    setViews(saveView<F>(scope, name, currentFilters));
    setName('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
        <Bookmark size={12} /> Saved Views
      </span>

      {views.map(v => {
        const active = sameFilters(v.filters);
        return (
          <span
            key={v.id}
            className={`group inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold transition ${
              active ? 'border-brand bg-brand/10 text-ink' : 'border-line bg-surface text-ink-secondary hover:bg-surface-muted'
            }`}
          >
            <button type="button" onClick={() => onApply(v.filters)} className="inline-flex items-center gap-1" title={`Apply "${v.name}"`}>
              {active && <Check size={11} className="text-brand" />}
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => setViews(deleteView<F>(scope, v.id))}
              aria-label={`Delete view ${v.name}`}
              className="opacity-50 hover:opacity-100"
            >
              <X size={11} />
            </button>
          </span>
        );
      })}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setAdding(false); setName(''); } }}
            placeholder="View name…"
            className="w-32 rounded border border-line bg-surface px-2 py-0.5 text-[11px] focus:outline-none focus:border-brand"
          />
          <button type="button" onClick={commit} aria-label="Save view" className="rounded border border-line p-1 hover:bg-surface-muted"><Check size={12} /></button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded border border-dashed border-line px-2 py-0.5 text-[11px] font-semibold text-ink-secondary hover:bg-surface-muted"
        >
          <Plus size={11} /> Save current
        </button>
      )}
    </div>
  );
}
