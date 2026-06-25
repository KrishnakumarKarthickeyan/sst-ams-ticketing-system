/**
 * The single source of app version truth for the UI. Values are injected at
 * build time by next.config.ts (env) from package.json + git + the build clock,
 * so they update automatically every deploy — never edit a version string in a
 * component; bump package.json (`npm version …`) and the rest follows.
 */
export const version: string = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
export const gitSha: string = process.env.NEXT_PUBLIC_GIT_SHA ?? 'dev';
export const buildDate: string = process.env.NEXT_PUBLIC_BUILD_DATE ?? '';

/** Short, always-safe label, e.g. "v1.4.0". */
export const label = `v${version}`;

/** Longer label with the commit, e.g. "v1.4.0 · a1b2c3d". */
export const fullLabel = `v${version} · ${gitSha}`;

/** Human build date for tooltips, e.g. "12 Jun 2026, 14:32". Empty string if unknown. */
export const buildDateLabel: string = buildDate
  ? new Date(buildDate).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  : '';
