import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { notify, type NotifyEvent, type NotifyPayload } from '@/lib/notifications/dispatcher';

/**
 * Server seam for the single notification dispatcher. The client routes ALL
 * notification creation here (in-app + the selected Teams events). The Teams
 * webhook secret lives only on the server (dispatcher → teams.ts), so it is
 * never exposed to the browser.
 *
 * Requires an authenticated app session — this is not an open endpoint. Any
 * failure returns a soft 200 so a notify/Teams problem can never surface as a
 * failed user action (the client has already applied its optimistic in-app update).
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            /* no-op: this route does not mutate the session */
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { event?: NotifyEvent } & Partial<NotifyPayload>;
    const { event, ...payload } = body;
    if (!event || !Array.isArray(payload.recipients) || typeof payload.title !== 'string' || typeof payload.message !== 'string') {
      return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
    }

    await notify(event, payload as NotifyPayload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Soft-fail: never break the originating user action over a notification problem.
    console.error('[api/notify] error (swallowed):', err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
