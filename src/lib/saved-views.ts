/**
 * Saved filter views — named presets of a desk's filter state, persisted in
 * localStorage (a UI preference, not domain data). Pure storage helpers so the
 * load/save/dedup logic is unit-tested; the UI is a thin wrapper.
 */

export interface SavedView<F = Record<string, unknown>> {
  id: string;
  name: string;
  filters: F;
  createdAt: string;
}

const keyFor = (scope: string) => `sst_saved_views_${scope}`;
const MAX_VIEWS = 20;

function read<F>(scope: string): SavedView<F>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<F>(scope: string, views: SavedView<F>[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(scope), JSON.stringify(views.slice(0, MAX_VIEWS)));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function listSavedViews<F>(scope: string): SavedView<F>[] {
  return read<F>(scope);
}

/** Add (or overwrite by case-insensitive name) a view; returns the new list. */
export function saveView<F>(scope: string, name: string, filters: F): SavedView<F>[] {
  const trimmed = name.trim();
  if (!trimmed) return read<F>(scope);
  const existing = read<F>(scope).filter(v => v.name.toLowerCase() !== trimmed.toLowerCase());
  const view: SavedView<F> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    filters,
    createdAt: new Date().toISOString(),
  };
  const next = [view, ...existing];
  write(scope, next);
  return next;
}

export function deleteView<F>(scope: string, id: string): SavedView<F>[] {
  const next = read<F>(scope).filter(v => v.id !== id);
  write(scope, next);
  return next;
}
