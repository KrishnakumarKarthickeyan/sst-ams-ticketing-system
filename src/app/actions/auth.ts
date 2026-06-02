'use server';

import { createClient } from '@supabase/supabase-js';

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

export async function createAuthUser(email: string, password: string, fullName: string, role: string) {
  const client = getAdminClient();
  if (!client) {
    return { success: false, error: 'NO_SERVICE_KEY' };
  }

  try {
    const { data, error } = await client.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: data.user.id };
  } catch (e: any) {
    return { success: false, error: e.message || 'Server action failed' };
  }
}

export async function updateAuthUserPassword(userId: string, password: string) {
  const client = getAdminClient();
  if (!client) {
    return { success: false, error: 'NO_SERVICE_KEY' };
  }

  try {
    const { data, error } = await client.auth.admin.updateUserById(userId, {
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Server action failed' };
  }
}

export async function deleteAuthUser(userId: string) {
  const client = getAdminClient();
  if (!client) {
    return { success: false, error: 'NO_SERVICE_KEY' };
  }

  try {
    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Server action failed' };
  }
}

export async function provisionUser(params: {
  email: string;
  password?: string;
  fullName: string;
  role: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
  // Consultant specific fields:
  consultantType?: 'Functional' | 'Technical';
  sapModules?: string[];
  phoneNumber?: string;
  roleTitle?: string;
  skills?: string;
  // Customer specific fields:
  companyName?: string;
  customerShortCode?: string;
  contractType?: string;
  contractHours?: number;
  address?: string;
  industry?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  monthlyAllocatedHours?: number;
  contractStatus?: string;
  loginEnabled?: boolean;
}) {
  const client = getAdminClient();
  if (!client) {
    return { success: false, error: 'NO_SERVICE_KEY' };
  }

  const email = params.email.trim().toLowerCase();
  const password = params.password || 'Password@12345';
  const fullName = params.fullName.trim();
  const role = params.role;

  try {
    // 1. Create auth user
    const { data: authUser, error: authErr } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, first_login_completed: false }
    });

    let userId = '';
    if (authErr) {
      // Check if user already exists
      if (authErr.message.includes('already registered') || authErr.message.includes('already exists')) {
        // Find existing user's ID
        const { data: { users }, error: listErr } = await client.auth.admin.listUsers();
        if (listErr) throw listErr;
        const existing = users.find(u => u.email === email);
        if (existing) {
          userId = existing.id;
        } else {
          return { success: false, error: authErr.message };
        }
      } else {
        return { success: false, error: authErr.message };
      }
    } else {
      userId = authUser.user.id;
    }

    if (!userId) {
      return { success: false, error: 'Failed to obtain user identity reference.' };
    }

    // 2. Provision according to role
    if (role === 'Customer') {
      const companyName = (params.companyName || 'Apex Global Industries').trim();
      let orgId = '';

      // Resolve or insert organization with address/industry and short code
      const { data: existingOrg, error: findOrgErr } = await client
        .from('organizations')
        .select('id')
        .eq('name', companyName)
        .maybeSingle();

      if (findOrgErr) throw findOrgErr;

      if (existingOrg) {
        orgId = existingOrg.id;
        const { error: orgUpdErr } = await client
          .from('organizations')
          .update({
            address: params.address || null,
            industry: params.industry || null,
            customer_short_code: params.customerShortCode ? params.customerShortCode.trim().toUpperCase() : undefined
          })
          .eq('id', orgId);
        if (orgUpdErr) throw orgUpdErr;
      } else {
        const { data: newOrg, error: orgErr } = await client
          .from('organizations')
          .insert({
            name: companyName,
            customer_short_code: params.customerShortCode ? params.customerShortCode.trim().toUpperCase() : null,
            address: params.address || null,
            industry: params.industry || null
          })
          .select('id')
          .single();

        if (orgErr) throw orgErr;
        orgId = newOrg.id;
      }

      // Upsert profile
      const { error: profErr } = await client.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'Customer',
        is_active: params.loginEnabled !== undefined ? params.loginEnabled : true,
        organization_id: orgId,
        phone_number: params.phoneNumber || 'N/A',
        first_login_completed: false
      });

      if (profErr) throw profErr;

      // Upsert customer contract
      const contractHours = params.contractHours || 160.00;
      const { error: contractErr } = await client.from('customer_contracts').insert({
        organization_id: orgId,
        contract_type: (params.contractType || 'AMS') as any,
        start_date: params.contractStartDate || new Date().toISOString().split('T')[0],
        end_date: params.contractEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_hours: contractHours,
        used_hours: 0.00,
        monthly_budget_hours: params.monthlyAllocatedHours || Math.round(contractHours / 12) || 15.00,
        is_active: params.contractStatus ? (params.contractStatus === 'Active') : true,
        status: params.contractStatus || 'Active'
      });

      // We won't block if contract already exists, but log it
      if (contractErr) {
        console.warn('Non-blocking contract error:', contractErr.message);
      }
    } else if (role === 'Consultant') {
      const consultantType = params.consultantType || 'Functional';
      const sapModules = params.sapModules || [];
      const roleTitle = params.roleTitle || `${consultantType} Specialist`;
      const skills = params.skills || 'SAP Specialist';
      const phoneNumber = params.phoneNumber || 'N/A';

      // Upsert profile
      const { error: profErr } = await client.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'Consultant',
        is_active: true,
        consultant_type: consultantType,
        sap_modules: sapModules,
        phone_number: phoneNumber,
        role_title: roleTitle,
        skills: skills,
        first_login_completed: false
      });

      if (profErr) throw profErr;
    } else {
      // SuperAdmin or Manager
      const { error: profErr } = await client.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
        is_active: true,
        first_login_completed: false
      });
      if (profErr) throw profErr;
    }

    return { success: true, userId, password };
  } catch (e: any) {
    return { success: false, error: e.message || 'Provisioning failed' };
  }
}

export async function getOrganizationMap() {
  const client = getAdminClient();
  if (!client) return {};
  try {
    const { data, error } = await client.from('organizations').select('id, name');
    if (error || !data) return {};
    const map: Record<string, string> = {};
    data.forEach(org => {
      map[org.id] = org.name;
    });
    return map;
  } catch (e) {
    console.error('Failed to fetch organization map:', e);
    return {};
  }
}

export async function getOrganizationShortCodeMap() {
  const client = getAdminClient();
  if (!client) return {};
  try {
    const { data, error } = await client.from('organizations').select('id, customer_short_code');
    if (error || !data) return {};
    const map: Record<string, string> = {};
    data.forEach(org => {
      map[org.id] = org.customer_short_code || '';
    });
    return map;
  } catch (e) {
    console.error('Failed to fetch organization short code map:', e);
    return {};
  }
}


export async function logUserAuditAction(userEmail: string, action: string, performedBy: string) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  try {
    const { error } = await client.from('audit_logs').insert({
      user_email: userEmail.trim().toLowerCase(),
      action: action,
      performed_by: performedBy.trim()
    });
    if (error) {
      console.error('Audit log insertion error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Audit log fatal error:', e);
    return { success: false, error: e.message };
  }
}

export async function resetUserPasswordAdmin(userId: string, newPassword?: string, performedBy?: string, userEmail?: string) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  try {
    const password = newPassword || 'Password@12345';
    // Update both password and reset first_login_completed metadata to false
    const { error } = await client.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { first_login_completed: false }
    });
    if (error) return { success: false, error: error.message };
    
    // Also update public.profiles
    const { error: dbErr } = await client
      .from('profiles')
      .update({ first_login_completed: false })
      .eq('id', userId);
    if (dbErr) return { success: false, error: dbErr.message };

    // Log audit
    let targetEmail: string = userEmail || '';
    if (!targetEmail) {
      const { data: prof } = await client.from('profiles').select('email').eq('id', userId).single();
      targetEmail = prof?.email || 'unknown';
    }
    
    await logUserAuditAction(targetEmail, 'Password Reset', performedBy || 'SuperAdmin');

    return { success: true, password };
  } catch (e: any) {
    return { success: false, error: e.message || 'Reset failed' };
  }
}

export async function adminUpdatePasswordDirect(userId: string, newPassword: string, performedBy?: string, userEmail?: string) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  try {
    // SuperAdmin directly updates password without resetting first_login_completed
    const { error } = await client.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    if (error) return { success: false, error: error.message };

    // Also update password_changed_at in profiles table
    const { error: dbErr } = await client
      .from('profiles')
      .update({ password_changed_at: new Date().toISOString() })
      .eq('id', userId);
    if (dbErr) return { success: false, error: dbErr.message };

    // Log audit
    let targetEmail: string = userEmail || '';
    if (!targetEmail) {
      const { data: prof } = await client.from('profiles').select('email').eq('id', userId).single();
      targetEmail = prof?.email || 'unknown';
    }
    
    await logUserAuditAction(targetEmail, 'Password Update', performedBy || 'SuperAdmin');

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Update failed' };
  }
}

export async function updateUserAuthStatus(
  userId: string,
  userEmail: string,
  isActive: boolean,
  isLocked: boolean,
  performedBy: string
) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  try {
    // 1. Get original profile to see what changed for logging
    const { data: originalProfile } = await client
      .from('profiles')
      .select('is_active, is_locked')
      .eq('id', userId)
      .single();
    
    // 2. Update Profiles table
    const { error: dbErr } = await client.from('profiles').update({
      is_active: isActive,
      is_locked: isLocked
    }).eq('id', userId);
    if (dbErr) return { success: false, error: dbErr.message };

    // 3. Handle Lock/Unlock or Disable in Supabase Auth
    if (isLocked === false && originalProfile?.is_locked === true) {
      // Unlock account (lift ban)
      const { error: authErr } = await client.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      });
      if (authErr) console.warn('Unlock auth warn:', authErr.message);
      
      // Log audit
      await logUserAuditAction(userEmail, 'Account Unlock', performedBy);
    } else if (isLocked !== originalProfile?.is_locked && isLocked) {
      await logUserAuditAction(userEmail, 'Account Lock', performedBy);
    }
    
    if (isActive !== originalProfile?.is_active) {
      const action = isActive ? 'Account Enable' : 'Account Disable';
      await logUserAuditAction(userEmail, action, performedBy);
      
      // If disabling the user, sign them out globally and ban them
      if (!isActive) {
        await client.auth.admin.signOut(userId);
        await client.auth.admin.updateUserById(userId, {
          ban_duration: '876000h' // ban for 100 years
        });
      } else {
        // If enabling, lift any ban
        await client.auth.admin.updateUserById(userId, {
          ban_duration: 'none'
        });
      }
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Status update failed' };
  }
}

export async function adminForcePasswordChange(userId: string, userEmail: string, performedBy: string) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  try {
    const { error: authErr } = await client.auth.admin.updateUserById(userId, {
      user_metadata: { first_login_completed: false }
    });
    if (authErr) return { success: false, error: authErr.message };

    const { error: dbErr } = await client
      .from('profiles')
      .update({ first_login_completed: false })
      .eq('id', userId);
    if (dbErr) return { success: false, error: dbErr.message };

    await logUserAuditAction(userEmail, 'Force Password Change', performedBy);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Force password change failed' };
  }
}


