# Assist360 Teams bot (Tier 2)

A registered Bot Framework app so alerts post as **"Assist360"** (not the
"Workflows" Flow bot). One-way / notification-only. When `MS_APP_ID` +
`MS_APP_PASSWORD` are set the dispatcher posts via this bot to every chat that has
installed it; otherwise it falls back to the Tier-1 webhook automatically.

Files here: `manifest.json`, `color.png` (192×192), `outline.png` (32×32). Replace
the icons with your own brand art any time (same dimensions).

## 1. Apply the migration (RUN MANUALLY)
In Supabase SQL Editor, run `supabase/migrations/20260621000000_teams_bot_conversations.sql`
(stores the bot's per-chat conversation references for proactive posting).

## 2. Create the Azure Bot + app registration
1. **Azure Portal → Create a resource → "Azure Bot"**.
   - Type of App: **Multi Tenant** (simplest) — or Single Tenant.
   - Creation type: **Create new Microsoft App ID** → note the generated **App ID** = `MS_APP_ID`.
2. Open the bot → **Configuration → Microsoft App ID → Manage Password** (opens the
   Entra app) → **Certificates & secrets → New client secret** → copy the **Value** =
   `MS_APP_PASSWORD` (you only see it once).
3. Back on the bot → **Configuration → Messaging endpoint**:
   `https://<your-app-domain>/api/teams/bot` → **Apply**.
4. Bot → **Channels → Microsoft Teams** → enable.

## 3. Set the env vars (server-only, never committed)
In Vercel (and `.env.local` for local) — see `.env.example`:
```
MS_APP_ID=<App ID>
MS_APP_PASSWORD=<client secret value>
MS_APP_TYPE=MultiTenant            # or SingleTenant
MS_APP_TENANT_ID=                  # required only for SingleTenant
APP_BASE_URL=https://<your-app-domain>
```
Redeploy so the route picks them up.

## 4. Package & upload the Teams app
1. In `manifest.json`, replace **both** `REPLACE_WITH_MS_APP_ID` with your `MS_APP_ID`,
   and set the `websiteUrl` / `validDomains` to your domain.
2. Zip the three files **at the root** of the zip (not inside a folder):
   ```
   cd teams-app && zip ../assist360-teams.zip manifest.json color.png outline.png
   ```
3. **Teams → Apps → Manage your apps → Upload an app → Upload a custom app**
   (or Teams admin center → **Manage apps → Upload new app** to publish org-wide).

## 5. Install & test
1. Open the **Assist360** app in Teams → **Add** (personal scope) — or add it to a
   group chat. You should get: *"✅ Assist360 is connected…"*. That install stores the
   conversation reference.
2. Trigger any Teams event (raise a Critical ticket, a customer escalation, etc.).
   The card now arrives from **Assist360** (check the sender chip).

## Notes
- The bot posts to **every chat it's installed in** (opt-in by install) — no
  per-user email mapping. Add it to a shared group chat to reach the whole team.
- `isNotificationOnly: true` — it never expects commands; it only pushes alerts.
- To revert to the webhook, just unset `MS_APP_ID` / `MS_APP_PASSWORD`.
