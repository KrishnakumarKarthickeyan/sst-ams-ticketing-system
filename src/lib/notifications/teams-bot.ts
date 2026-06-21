/**
 * SERVER-ONLY. Tier-2 Microsoft Teams bot ("Assist360").
 *
 * Unlike the Tier-1 webhook (which posts as the built-in "Workflows" Flow bot),
 * this posts proactively as a registered Bot Framework app, so the sender chip
 * reads "Assist360". It is fully optional: if MS_APP_ID / MS_APP_PASSWORD are
 * unset, isBotConfigured() is false and the dispatcher falls back to the webhook.
 *
 * Delivery model: the bot posts to EVERY chat it has been installed into (opt-in
 * by install). Each install/message stores a Bot Framework conversation reference
 * (src/app/api/teams/bot/route.ts → teams_bot_conversations); postCardViaBot()
 * fans a card out to all of them. Never throws.
 */
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  CardFactory,
  MessageFactory,
  type ConversationReference,
} from 'botbuilder';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const APP_ID = process.env.MS_APP_ID;
const APP_PASSWORD = process.env.MS_APP_PASSWORD;
const APP_TYPE = process.env.MS_APP_TYPE || 'MultiTenant'; // 'MultiTenant' | 'SingleTenant'
const APP_TENANT_ID = process.env.MS_APP_TENANT_ID || '';

/** True only when the bot credentials are present. Gate everything on this. */
export function isBotConfigured(): boolean {
  return !!(APP_ID && APP_PASSWORD);
}

let _adapter: CloudAdapter | null = null;

/** Shared CloudAdapter (handles Bot Connector auth for inbound + proactive). */
export function getBotAdapter(): CloudAdapter | null {
  if (!isBotConfigured()) return null;
  if (_adapter) return _adapter;
  const credentialFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: APP_ID,
    MicrosoftAppPassword: APP_PASSWORD,
    MicrosoftAppType: APP_TYPE,
    MicrosoftAppTenantId: APP_TENANT_ID,
  });
  const auth = new ConfigurationBotFrameworkAuthentication({}, credentialFactory);
  _adapter = new CloudAdapter(auth);
  return _adapter;
}

export function getBotAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Proactively post an Adaptive Card to every chat the bot is installed in.
 * Returns true if at least one delivery was attempted. Never throws.
 */
export async function postCardViaBot(adaptiveCard: unknown): Promise<boolean> {
  const adapter = getBotAdapter();
  const admin = getBotAdminClient();
  if (!adapter || !admin || !APP_ID) return false;

  let rows: { reference: Partial<ConversationReference> }[] = [];
  try {
    const { data, error } = await admin.from('teams_bot_conversations').select('reference');
    if (error) {
      console.error('[teams-bot] could not load conversation refs:', error.message);
      return false;
    }
    rows = (data as { reference: Partial<ConversationReference> }[]) ?? [];
  } catch (err) {
    console.error('[teams-bot] conversation ref query threw:', err);
    return false;
  }
  if (rows.length === 0) return false;

  const activity = MessageFactory.attachment(CardFactory.adaptiveCard(adaptiveCard));
  let attempted = false;
  for (const row of rows) {
    try {
      await adapter.continueConversationAsync(
        APP_ID,
        row.reference as ConversationReference,
        async (turnContext) => {
          await turnContext.sendActivity(activity);
        },
      );
      attempted = true;
    } catch (err) {
      console.error('[teams-bot] proactive send failed for a conversation:', err);
    }
  }
  return attempted;
}
