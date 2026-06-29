import { getErrorMessage } from '@/lib/errors';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logUserAuditAction, verifyPasswordPolicy } from '@/app/actions/auth';
import { generateTemporaryPassword } from '@/lib/security/temp-password';
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
    const rl = checkRateLimit(request, 'reset-password', 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    // 1. Authenticate the requester via cookie session
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

    const { data: { user: requester }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !requester) {
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
    }

    // 2. Verify requester is a SuperAdmin or Manager in profiles table
    const { data: requesterProfile, error: reqProfErr } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', requester.id)
      .single();

    const allowedRequesterRoles = ['SuperAdmin', 'Manager'];
    if (reqProfErr || !requesterProfile || !allowedRequesterRoles.includes(requesterProfile.role)) {
      return NextResponse.json({ success: false, error: 'Access denied. Privileged role required.' }, { status: 403 });
    }

    // 3. Parse and validate target user parameters
    const { targetUserId, manualPassword } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Target user identity reference is required.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: false, error: 'Database service role key is missing.' }, { status: 500 });
    }

    // 4. Fetch target user profile
    const { data: targetProfile, error: targetProfErr } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('id', targetUserId)
      .single();

    if (targetProfErr || !targetProfile) {
      return NextResponse.json({ success: false, error: 'Target user profile not found.' }, { status: 404 });
    }

    // 5. Role-scoped authorization of the reset:
    //    • SuperAdmin may reset ANYONE (Consultant, Customer, Manager, SuperAdmin).
    //    • Manager may reset only Consultants and Customers (clients) — never other
    //      Managers or SuperAdmins.
    const targetableBy: Record<string, string[]> = {
      SuperAdmin: ['Consultant', 'Customer', 'Manager', 'SuperAdmin'],
      Manager: ['Consultant', 'Customer'],
    };
    const allowedTargets = targetableBy[requesterProfile.role] || [];
    if (!allowedTargets.includes(targetProfile.role)) {
      return NextResponse.json(
        { success: false, error: `A ${requesterProfile.role} is not permitted to reset a ${targetProfile.role}.` },
        { status: 403 },
      );
    }

    // 6. Generate or validate secure temporary password
    let tempPassword = '';
    if (manualPassword && manualPassword.trim() !== '') {
      const policy = await verifyPasswordPolicy(manualPassword);
      if (!policy.isValid) {
        // Log failed password reset audit
        await logUserAuditAction(targetProfile.email, 'Failed password reset', requesterProfile.email || 'SuperAdmin');
        return NextResponse.json({ success: false, error: policy.error }, { status: 400 });
      }
      tempPassword = manualPassword.trim();
    } else {
      tempPassword = generateTemporaryPassword();
    }

    // 7. Update target user password and metadata in Supabase Auth
    const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: tempPassword,
      ban_duration: 'none',
      user_metadata: { first_login_completed: false, force_password_change: true }
    });

    if (updateAuthErr) {
      // Log failed password reset audit
      await logUserAuditAction(targetProfile.email, 'Failed password reset', requesterProfile.email || 'SuperAdmin');
      return NextResponse.json({ success: false, error: `Auth update failed: ${updateAuthErr.message}` }, { status: 500 });
    }

    // 8. Update profiles table record
    const { error: updateDbErr } = await adminClient
      .from('profiles')
      .update({
        first_login_completed: false,
        force_password_change: true,
        password_changed_at: null,
        is_locked: false,
        failed_attempts: 0
      })
      .eq('id', targetUserId);

    if (updateDbErr) {
      return NextResponse.json({ success: false, error: `Profile update failed: ${updateDbErr.message}` }, { status: 500 });
    }

    // 9. Log audit event
    await logUserAuditAction(targetProfile.email, 'Password Reset', requesterProfile.email || 'SuperAdmin');

    return NextResponse.json({ success: true, tempPassword });
  } catch (err: unknown) {
    logError(err, { source: 'api:reset-password' });
    return NextResponse.json({ success: false, error: getErrorMessage(err) || 'An unexpected error occurred.' }, { status: 500 });
  }
}
