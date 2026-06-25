This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Microsoft Teams notifications (Tier 1: one-way, app → channel)

Selected domain events are mirrored to a Microsoft Teams channel as Adaptive Cards,
in addition to the in-app notifications. There is a **single dispatcher**
(`src/lib/notifications/dispatcher.ts`, reached through the `POST /api/notify`
route); the only module that talks to Teams is `src/lib/notifications/teams.ts`.

**Events posted to Teams** (everything else stays in-app only):
SLA breached · SLA at-risk · escalation raised · escalation acknowledged ·
new Critical ticket · closure pending approval.

### Create the channel webhook (Workflows / Power Automate)

This integration uses the **supported Workflows path**, not the deprecated Office 365
connector:

1. In Microsoft Teams, open the target **channel → ⋯ (More options) → Workflows**.
2. Choose the template **"Post to a channel when a webhook request is received."**
3. Confirm the Team and Channel, then **Add workflow**. Teams generates an
   **HTTP POST URL** — this is your webhook URL.
4. Copy that URL. The app posts an Adaptive Card wrapped in the
   `{ type: "message", attachments: [...] }` envelope this trigger expects.

### Store the URL as a server-only secret

- Set **`TEAMS_WEBHOOK_URL`** to the webhook URL **without** a `NEXT_PUBLIC_` prefix
  (it is server-only and must never reach the browser or the repo).
  - **Vercel:** Project → Settings → Environment Variables → add `TEAMS_WEBHOOK_URL`
    (and `APP_BASE_URL`, your public app URL for the card's deep link).
  - **Local:** add both to `.env.local` (git-ignored). See `.env.example`.
- Leave `TEAMS_WEBHOOK_URL` **unset** to disable Teams delivery entirely — the app
  then sends in-app notifications only (every Teams send becomes a silent no-op).

Teams delivery is fire-and-forget: a webhook outage is logged and swallowed and can
never block or fail a user's ticket action.

### Optional Tier 2 — custom "Assist360" bot

The webhook posts as Microsoft's built-in **"Workflows"** Flow bot (its name can't be
changed). To have alerts post as a bot named **"Assist360"** instead, register a Bot
Framework app and set `MS_APP_ID` / `MS_APP_PASSWORD` — the dispatcher then posts via
the bot to every chat it's installed in, and falls back to the webhook when those are
unset. Full runbook (Azure Bot, app registration, manifest, install): **`teams-app/README.md`**.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## App version & releases

The version shown in the UI (sidebar footer for every role, the login page, and each Profile
page's "About this build") comes from **one source** and updates **automatically every deploy** —
never edit a version string in a component.

- **Canonical version** = `package.json` `"version"`.
- At build, `next.config.ts` injects three values (no manual edits):
  - `NEXT_PUBLIC_APP_VERSION` ← `package.json` version
  - `NEXT_PUBLIC_GIT_SHA` ← `VERCEL_GIT_COMMIT_SHA` (on Vercel) or `git rev-parse --short HEAD` (local), else `dev`
  - `NEXT_PUBLIC_BUILD_DATE` ← the build timestamp
- The UI reads these only via `src/lib/version.ts` (`label` = `v1.4.0`, `fullLabel` = `v1.4.0 · a1b2c3d`).

### Bump the version on a release

```bash
npm version patch   # 1.4.0 → 1.4.1   (bug fixes)
npm version minor   # 1.4.0 → 1.5.0   (new features)
npm version major   # 1.4.0 → 2.0.0   (breaking changes)
```

`npm version …` updates `package.json` **and** creates a git tag. Then push and deploy — the new
`vX.Y.Z` shows everywhere automatically. Even **without** a version bump, the displayed git SHA and
build date change on every deploy, so each release is always distinguishable.
