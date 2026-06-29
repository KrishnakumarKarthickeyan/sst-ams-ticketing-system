'use client';

import { useEffect } from 'react';

/**
 * Global safety net against the well-known Radix UI bug where a closing
 * Dialog/AlertDialog that contained a Select / Popover / Dropdown leaves
 * `pointer-events: none` stuck on <body>. The modal visually closes but the
 * whole page stays dimmed and unclickable until a manual refresh.
 *
 * We watch <body> for that orphaned style and clear it the moment no Radix
 * overlay is actually open. While a real modal IS open Radix legitimately sets
 * pointer-events:none to block the background — we only intervene when nothing
 * is open, so background-blocking for live modals is preserved.
 *
 * This complements the per-handler try/catch/finally fixes: even if a future
 * handler forgets to reset state, the screen can never stay frozen.
 */
export function OverlayGuard() {
  useEffect(() => {
    // Any of these present === an overlay is genuinely open; leave the lock alone.
    const OPEN_SELECTORS = [
      '[data-state="open"][role="dialog"]',
      '[data-state="open"][role="alertdialog"]',
      '[data-state="open"][role="menu"]',
      '[data-state="open"][role="listbox"]',
      '[data-radix-popper-content-wrapper]',
    ].join(',');

    const unfreezeIfOrphaned = () => {
      if (document.body.style.pointerEvents !== 'none') return;
      if (document.querySelector(OPEN_SELECTORS)) return; // a modal/popover is open — keep the lock
      document.body.style.pointerEvents = '';
    };

    // React to body style mutations (Radix toggles the inline style) and to
    // user intent (pointer/key). On intent we check synchronously — at pointerdown
    // an about-to-open dialog hasn't locked <body> yet, so a stale lock clears
    // immediately — plus a macrotask follow-up to catch a lock left by a close
    // handler that runs on this same interaction.
    const observer = new MutationObserver(unfreezeIfOrphaned);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    const onIntent = () => { unfreezeIfOrphaned(); setTimeout(unfreezeIfOrphaned, 0); };
    window.addEventListener('pointerdown', onIntent, true);
    window.addEventListener('keydown', onIntent, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('pointerdown', onIntent, true);
      window.removeEventListener('keydown', onIntent, true);
    };
  }, []);

  return null;
}
