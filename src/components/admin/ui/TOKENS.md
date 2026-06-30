# SuperAdmin Design System — tokens & components (scoped)

Skill-driven (`ui-ux-pro-max`). All styles are nested under `.admin-shell` (injected once by
`src/app/admin/layout.tsx`), so they apply **only** to SuperAdmin content and cannot bleed into
Manager / Consultant / Customer screens. Fully reversible: delete `src/components/admin/**` and
revert the two-line admin-layout change to restore the app exactly.

## Palette (skill: B2B Service "data-dense dashboard", WCAG AA — no purple)
| Token | Value | Role |
|---|---|---|
| `--ak-ink` | `#0F172A` | primary text / navy |
| `--ak-ink2` | `#475569` | secondary text |
| `--ak-ink3` | `#8A93A3` | muted / axes |
| `--ak-line` / `--ak-line2` | `#E7EAF0` / `#DCE0E8` | hairline / strong border |
| `--ak-panel` / `--ak-panel2` | `#FFFFFF` / `#F6F8FB` | card / subtle fill |
| `--ak-bg` | `#F7F9FC` | page ground |
| `--ak-accent` | `#0E63C9` | single blue accent (skill #0369A1, AA-tuned) |
| `--ak-amber` | `#C2730C` | amber highlight (skill #D97706) |
| `--ak-success` / `--ak-warning` / `--ak-critical` | `#0F7A4F` / `#B8690C` / `#C5392B` | status |

**Severity ramp** (Critical→High→Medium→Low), always paired with text/icon (never color-only):
`#C5392B` → `#C2730C` → `#0E63C9` → `#64748B`.

**Chart categorical** (`ADMIN_CATEGORICAL`): blue/cyan/teal/slate/amber — harmonious, no neon/purple.

## Scale
- Type: 11 / 12 / 13 / 14 / 23–26px; weights 560 / 640 / 680; tabular numerals for all data.
- Radius 14px cards, 8–10px controls. Elevation: single soft shadow token `--ak-shadow`.
- Spacing rhythm: 14px grid gap, 18px card padding, `space-y-6` between sections.
- Motion 150–300ms; `prefers-reduced-motion` disables all transitions/animations.

## Components (`admin-kit.tsx`)
`AdminPageHeader`, `AdminSegmented`, `AdminButton`, `AdminCard`, `AdminStat` (KPI), `AdminGauge`
(radial), `AdminSparkline`, `AdminBullet` (utilization vs target), `AdminLoadBuckets`
(idle/healthy/busy/overloaded), `AdminPill` / `SeverityPill`, `AdminEmpty`, `AdminDataTable`
(generic, sortable with `aria-sort`, top-N + pagination), `AdminGrid`.

Chart constants (`admin-theme.ts`): `ADMIN`, `SEVERITY`, `ADMIN_CATEGORICAL`, `ADMIN_SEMANTIC`,
`ADMIN_TOOLTIP`, `ADMIN_AXIS`, `ADMIN_GRID` — so admin charts carry **zero hardcoded hex**.
