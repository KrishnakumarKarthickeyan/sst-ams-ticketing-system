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

function generateTemporaryPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const getRand = (str: string) => str[Math.floor(Math.random() * str.length)];
  
  const chars = [
    getRand(uppers),
    getRand(lowers),
    getRand(numbers),
    getRand(specials)
  ];
  
  const allChars = uppers + lowers + numbers + specials;
  for (let i = 4; i < 10; i++) {
    chars.push(getRand(allChars));
  }
  
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

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

    // 5. Verify target user role is Manager, Customer (Client), or Consultant
    const allowedRoles = ['Manager', 'Customer', 'Consultant'];
    if (!allowedRoles.includes(targetProfile.role)) {
      return NextResponse.json({ success: false, error: 'Target user role must be Manager, Customer (Client), or Consultant.' }, { status: 400 });
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
  } catch (err: any) {
    console.error('API reset-password exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
