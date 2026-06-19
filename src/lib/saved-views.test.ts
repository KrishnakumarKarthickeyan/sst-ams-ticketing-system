// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { listSavedViews, saveView, deleteView } from './saved-views';

beforeEach(() => window.localStorage.clear());

describe('saved-views', () => {
  it('saves and lists a view scoped by key', () => {
    saveView('manager-desk', 'My Crit', { priority: 'Critical' });
    const views = listSavedViews('manager-desk');
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe('My Crit');
    expect(views[0].filters).toEqual({ priority: 'Critical' });
    // a different scope is isolated
    expect(listSavedViews('admin-desk')).toHaveLength(0);
  });

  it('overwrites by case-insensitive name (no duplicates)', () => {
    saveView('s', 'View A', { a: 1 });
    const next = saveView('s', 'view a', { a: 2 });
    expect(next).toHaveLength(1);
    expect(next[0].filters).toEqual({ a: 2 });
  });

  it('ignores blank names', () => {
    expect(saveView('s', '   ', { a: 1 })).toHaveLength(0);
  });

  it('deletes by id', () => {
    const after = saveView('s', 'X', {});
    const removed = deleteView('s', after[0].id);
    expect(removed).toHaveLength(0);
  });

  it('newest first', () => {
    saveView('s', 'first', {});
    saveView('s', 'second', {});
    expect(listSavedViews('s').map(v => v.name)).toEqual(['second', 'first']);
  });
});
