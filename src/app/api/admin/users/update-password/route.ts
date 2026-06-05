import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logUserAuditAction, verifyPasswordPolicy } from '@/app/actions/auth';

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

    // 2. Verify requester is a SuperAdmin in profiles table
    const { data: requesterProfile, error: reqProfErr } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', requester.id)
      .single();

    if (reqProfErr || requesterProfile?.role !== 'SuperAdmin') {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin privileges required.' }, { status: 403 });
    }

    // 3. Parse target user and password parameters
    const { targetUserId, newPassword, forcePasswordChange } = await request.json();
    if (!targetUserId || !newPassword) {
      return NextResponse.json({ success: false, error: 'Target user identity and new password are required.' }, { status: 400 });
    }

    // 4. Validate password policy
    const policy = await verifyPasswordPolicy(newPassword);
    if (!policy.isValid) {
      // Log failed update password audit
      const adminClientInit = getAdminClient();
      if (adminClientInit) {
        const { data: tp } = await adminClientInit.from('profiles').select('email').eq('id', targetUserId).maybeSingle();
        if (tp) {
          await logUserAuditAction(tp.email, 'Failed password update', requesterProfile.email || 'SuperAdmin');
        }
      }
      return NextResponse.json({ success: false, error: policy.error }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: false, error: 'Database service role key is missing.' }, { status: 500 });
    }

    // 5. Fetch target user profile
    const { data: targetProfile, error: targetProfErr } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('id', targetUserId)
      .single();

    if (targetProfErr || !targetProfile) {
      return NextResponse.json({ success: false, error: 'Target user profile not found.' }, { status: 404 });
    }

    // 6. Verify target user role is Manager, Customer (Client), or Consultant
    const allowedRoles = ['Manager', 'Customer', 'Consultant'];
    if (!allowedRoles.includes(targetProfile.role)) {
      return NextResponse.json({ success: false, error: 'Target user role must be Manager, Customer (Client), or Consultant.' }, { status: 400 });
    }

    // 7. Update target user password and metadata in Supabase Auth
    const isForce = !!forcePasswordChange;
    const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
      ban_duration: 'none',
      user_metadata: { first_login_completed: !isForce, force_password_change: isForce }
    });

    if (updateAuthErr) {
      await logUserAuditAction(targetProfile.email, 'Failed password update', requesterProfile.email || 'SuperAdmin');
      return NextResponse.json({ success: false, error: `Auth update failed: ${updateAuthErr.message}` }, { status: 500 });
    }

    // 8. Update profiles table record
    const { error: updateDbErr } = await adminClient
      .from('profiles')
      .update({
        first_login_completed: !isForce,
        force_password_change: isForce,
        password_changed_at: isForce ? null : new Date().toISOString(),
        is_locked: false,
        failed_attempts: 0
      })
      .eq('id', targetUserId);

    if (updateDbErr) {
      return NextResponse.json({ success: false, error: `Profile update failed: ${updateDbErr.message}` }, { status: 500 });
    }

    // 9. Log audit event
    const actionLabel = isForce ? 'Force password change' : 'Password Updated';
    await logUserAuditAction(targetProfile.email, actionLabel, requesterProfile.email || 'SuperAdmin');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API update-password exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
