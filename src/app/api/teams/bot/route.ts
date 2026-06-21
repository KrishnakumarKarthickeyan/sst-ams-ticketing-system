import { TurnContext } from 'botbuilder';
import { getBotAdapter, getBotAdminClient } from '@/lib/notifications/teams-bot';

/**
 * Tier-2 Microsoft Teams bot messaging endpoint ("Assist360").
 *
 * This is the URL you register as the bot's "Messaging endpoint" in Azure
 * (https://<app>/api/teams/bot). The Bot Connector POSTs activities here; the
 * CloudAdapter validates the inbound JWT. On install / message we persist the
 * Bot Framework conversation reference (teams_bot_conversations) so the server
 * can later post alerts proactively into that chat. No-op (503) until the bot
 * credentials (MS_APP_ID / MS_APP_PASSWORD) are configured.
 */
export const runtime = 'nodejs';

// Minimal shim adapting botbuilder's process(req,res,logic) to App Router.
type ShimRes = {
  status: (c: number) => ShimRes;
  send: (b: unknown) => ShimRes;
  header: () => ShimRes;
  set: () => ShimRes;
  end: () => ShimRes;
};

export async function POST(request: Request) {
  const adapter = getBotAdapter();
  if (!adapter) return new Response('Bot not configured', { status: 503 });

  const body = await request.json().catch(() => ({}));
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  let statusCode = 200;
  let responseBody: unknown = undefined;
  const res: ShimRes = {
    status(c: number) { statusCode = c; return res; },
    send(b: unknown) { responseBody = b; return res; },
    header() { return res; },
    set() { return res; },
    end() { return res; },
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await adapter.process(({ body, headers, method: 'POST' } as any), (res as any), async (context) => {
      const activity = context.activity;
      const ref = TurnContext.getConversationReference(activity);

      const admin = getBotAdminClient();
      if (admin && ref.conversation?.id) {
        await admin.from('teams_bot_conversations').upsert(
          {
            conversation_id: ref.conversation.id,
            reference: ref,
            user_name: activity.from?.name ?? null,
            user_aad_id: activity.from?.aadObjectId ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'conversation_id' },
        );
      }

      const installedAdd = activity.type === 'installationUpdate' && activity.action === 'add';
      const botAdded =
        activity.type === 'conversationUpdate' &&
        (activity.membersAdded ?? []).some((m) => m.id === activity.recipient?.id);

      if (installedAdd || botAdded) {
        await context.sendActivity('✅ Assist360 is connected. You will receive SLA, escalation, new-Critical-ticket and closure-approval alerts in this chat.');
      } else if (activity.type === 'message') {
        await context.sendActivity('Assist360 here — operational alerts will arrive in this chat. No commands needed.');
      }
    });
  } catch (err) {
    console.error('[api/teams/bot] process error:', err);
    return new Response(null, { status: 500 });
  }

  return new Response(responseBody != null ? JSON.stringify(responseBody) : null, {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
