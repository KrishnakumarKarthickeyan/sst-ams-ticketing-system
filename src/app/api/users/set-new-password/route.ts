import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logUserAuditAction, verifyPasswordPolicy } from '@/app/actions/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logError } from '@/lib/observability/log-error';

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request: Request) {
  try {
    // 0. Rate limit (abuse / brute-force guard) — per IP, single-instance window.
    const rl = checkRateLimit(request, 'set-new-password', 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    // 1. Authenticate user using browser cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
    }

    // 2. Fetch user's profile to verify first-login / force-password-change state
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('email, first_login_completed, force_password_change')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    const needsPasswordChange = profile.first_login_completed === false || profile.force_password_change === true;
    if (!needsPasswordChange) {
      return NextResponse.json({ success: false, error: 'Password change not required.' }, { status: 400 });
    }

    // 3. Parse and validate new password
    const { newPassword } = await request.json();
    if (!newPassword) {
      return NextResponse.json({ success: false, error: 'New password is required.' }, { status: 400 });
    }

    const policy = await verifyPasswordPolicy(newPassword);
    if (!policy.isValid) {
      return NextResponse.json({ success: false, error: policy.error }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: false, error: 'Database service role key is missing.' }, { status: 500 });
    }

    // 4. Update credentials and user metadata via admin API (Service Role)
    const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: { first_login_completed: true, force_password_change: false }
    });

    if (updateAuthErr) {
      return NextResponse.json({ success: false, error: `Auth update failed: ${updateAuthErr.message}` }, { status: 500 });
    }

    // 5. Update profiles record
    const { error: updateDbErr } = await adminClient
      .from('profiles')
      .update({
        first_login_completed: true,
        force_password_change: false,
        password_changed_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateDbErr) {
      return NextResponse.json({ success: false, error: `Profile update failed: ${updateDbErr.message}` }, { status: 500 });
    }

    // 6. Log audit event
    await logUserAuditAction(profile.email, 'User changed password', profile.email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logError(err, { source: 'api:set-new-password' });
    return NextResponse.json({ success: false, error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
