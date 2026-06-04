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

// Password Policy Checker helper
export async function verifyPasswordPolicy(password: string): Promise<{ isValid: boolean; error?: string }> {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(password);

  if (!hasMinLength) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!hasUppercase || !hasLowercase) {
    return { isValid: false, error: 'Password must contain both uppercase and lowercase letters.' };
  }
  if (!hasNumber) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  if (!hasSpecial) {
    return { isValid: false, error: 'Password must contain at least one special character (e.g. !@#$%).' };
  }

  return { isValid: true };
}

// Automatic Secure Temporary Password Generator
function generateTemporaryPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused characters (I, O)
  const lowers = 'abcdefghijkmnopqrstuvwxyz'; // exclude l
  const numbers = '23456789'; // exclude 0, 1
  const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const getRand = (str: string) => str[Math.floor(Math.random() * str.length)];
  
  // Ensure we satisfy the complexity requirements:
  const chars = [
    getRand(uppers),
    getRand(lowers),
    getRand(numbers),
    getRand(specials)
  ];
  
  const allChars = uppers + lowers + numbers + specials;
  const length = 10; // between 8-12 characters
  for (let i = 4; i < length; i++) {
    chars.push(getRand(allChars));
  }
  
  // Shuffle characters
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join('');
}

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
      user_metadata: { full_name: fullName, role, first_login_completed: false, force_password_change: false }
    });

    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function provisionUser(params: {
  email: string;
  fullName: string;
  role: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
  performedBy?: string;
  initialPassword?: string;
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
  const password = params.initialPassword ? params.initialPassword.trim() : generateTemporaryPassword();
  const fullName = params.fullName.trim();
  const role = params.role;
  const performedBy = params.performedBy || 'Admin';

  if (params.initialPassword) {
    const policy = await verifyPasswordPolicy(password);
    if (!policy.isValid) {
      return { success: false, error: policy.error };
    }
  }

  try {
    // 1. Create auth user with temporary password and metadata
    const { data: authUser, error: authErr } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName, 
        role, 
        first_login_completed: false,
        force_password_change: false
      }
    });

    let userId = '';
    if (authErr) {
      if (authErr.message.includes('already registered') || authErr.message.includes('already exists')) {
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

      // Upsert profile with force_password_change and first_login_completed
      const { error: profErr } = await client.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'Customer',
        is_active: params.loginEnabled !== undefined ? params.loginEnabled : true,
        organization_id: orgId,
        phone_number: params.phoneNumber || 'N/A',
        first_login_completed: false,
        force_password_change: false
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

      if (contractErr) {
        console.warn('Non-blocking contract error:', contractErr.message);
      }
    } else if (role === 'Consultant') {
      const consultantType = params.consultantType || 'Functional';
      const sapModules = params.sapModules || [];
      const roleTitle = params.roleTitle || `${consultantType} Specialist`;
      const skills = params.skills || 'SAP Specialist';
      const phoneNumber = params.phoneNumber || 'N/A';

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
        first_login_completed: false,
        force_password_change: false
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
        first_login_completed: false,
        force_password_change: false
      });
      if (profErr) throw profErr;
    }

    // Write Audit logs as required
    await logUserAuditAction(email, 'User Created', performedBy);
    await logUserAuditAction(email, 'Initial Password Generated', performedBy);

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

export async function resetUserPasswordAdmin(
  userId: string,
  performedBy?: string,
  userEmail?: string,
  newPassword?: string
) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  
  let targetEmail = userEmail || '';
  try {
    if (!targetEmail) {
      const { data: prof } = await client.from('profiles').select('email').eq('id', userId).single();
      targetEmail = prof?.email || 'unknown';
    }

    const password = newPassword ? newPassword.trim() : generateTemporaryPassword();

    if (newPassword) {
      const policy = await verifyPasswordPolicy(password);
      if (!policy.isValid) {
        await logUserAuditAction(targetEmail, 'Failed Password Reset', performedBy || 'SuperAdmin');
        return { success: false, error: policy.error };
      }
    }
    
    // 1. Update password in Supabase Auth, lift bans, and set metadata setup flags
    const { error } = await client.auth.admin.updateUserById(userId, {
      password,
      ban_duration: 'none',
      user_metadata: { first_login_completed: false, force_password_change: true }
    });
    
    if (error) {
      await logUserAuditAction(targetEmail, 'Failed Password Reset', performedBy || 'SuperAdmin');
      return { success: false, error: error.message };
    }
    
    // 2. Update profiles table (unlock and clear attempts)
    const { error: dbErr } = await client
      .from('profiles')
      .update({ 
        first_login_completed: false, 
        force_password_change: true,
        is_locked: false,
        failed_attempts: 0
      })
      .eq('id', userId);
      
    if (dbErr) {
      await logUserAuditAction(targetEmail, 'Failed Password Reset', performedBy || 'SuperAdmin');
      return { success: false, error: dbErr.message };
    }

    // 3. Log audit log success
    await logUserAuditAction(targetEmail, 'Password Reset', performedBy || 'SuperAdmin');

    return { success: true, password };
  } catch (e: any) {
    if (targetEmail) {
      await logUserAuditAction(targetEmail, 'Failed Password Reset', performedBy || 'SuperAdmin');
    }
    return { success: false, error: e.message || 'Reset failed' };
  }
}

export async function adminUpdatePasswordDirect(userId: string, newPassword: string, performedBy?: string, userEmail?: string) {
  const client = getAdminClient();
  if (!client) return { success: false, error: 'NO_SERVICE_KEY' };
  
  let targetEmail = userEmail || '';
  try {
    if (!targetEmail) {
      const { data: prof } = await client.from('profiles').select('email').eq('id', userId).single();
      targetEmail = prof?.email || 'unknown';
    }

    // Validate password policy first
    const policy = await verifyPasswordPolicy(newPassword);
    if (!policy.isValid) {
      await logUserAuditAction(targetEmail, 'Failed Password Update', performedBy || 'SuperAdmin');
      return { success: false, error: policy.error };
    }

    // 1. SuperAdmin directly updates password, lifts bans, and updates metadata
    const { error } = await client.auth.admin.updateUserById(userId, {
      password: newPassword,
      ban_duration: 'none',
      user_metadata: { first_login_completed: true, force_password_change: false }
    });
    if (error) {
      await logUserAuditAction(targetEmail, 'Failed Password Update', performedBy || 'SuperAdmin');
      return { success: false, error: error.message };
    }

    // 2. Update profiles table (unlock and clear attempts)
    const { error: dbErr } = await client
      .from('profiles')
      .update({ 
        first_login_completed: true,
        force_password_change: false,
        is_locked: false,
        failed_attempts: 0,
        password_changed_at: new Date().toISOString() 
      })
      .eq('id', userId);
    if (dbErr) {
      await logUserAuditAction(targetEmail, 'Failed Password Update', performedBy || 'SuperAdmin');
      return { success: false, error: dbErr.message };
    }

    // 3. Log audit log success
    await logUserAuditAction(targetEmail, 'Password Updated', performedBy || 'SuperAdmin');

    return { success: true };
  } catch (e: any) {
    if (targetEmail) {
      await logUserAuditAction(targetEmail, 'Failed Password Update', performedBy || 'SuperAdmin');
    }
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
    const { data: originalProfile } = await client
      .from('profiles')
      .select('is_active, is_locked')
      .eq('id', userId)
      .single();
    
    const updatePayload: any = {
      is_active: isActive,
      is_locked: isLocked
    };
    if (!isLocked) {
      updatePayload.failed_attempts = 0;
    }

    const { error: dbErr } = await client
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);
    if (dbErr) return { success: false, error: dbErr.message };

    if (isLocked === false && originalProfile?.is_locked === true) {
      const { error: authErr } = await client.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      });
      if (authErr) console.warn('Unlock auth warn:', authErr.message);
      
      await logUserAuditAction(userEmail, 'Account Unlock', performedBy);
    } else if (isLocked !== originalProfile?.is_locked && isLocked) {
      const { error: authErr } = await client.auth.admin.updateUserById(userId, {
        ban_duration: '876000h'
      });
      if (authErr) console.warn('Lock auth warn:', authErr.message);
      await client.auth.admin.signOut(userId);
      await logUserAuditAction(userEmail, 'Account Lock', performedBy);
    }
    
    if (isActive !== originalProfile?.is_active) {
      const action = isActive ? 'Account Enable' : 'Account Disable';
      await logUserAuditAction(userEmail, action, performedBy);
      
      if (!isActive) {
        await client.auth.admin.signOut(userId);
        await client.auth.admin.updateUserById(userId, {
          ban_duration: '876000h'
        });
      } else {
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
      user_metadata: { first_login_completed: false, force_password_change: true }
    });
    if (authErr) return { success: false, error: authErr.message };

    const { error: dbErr } = await client
      .from('profiles')
      .update({ first_login_completed: false, force_password_change: true })
      .eq('id', userId);
    if (dbErr) return { success: false, error: dbErr.message };

    await logUserAuditAction(userEmail, 'Force Password Change', performedBy);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Force password change failed' };
  }
}

export async function checkUserLockedStatus(email: string) {
  const client = getAdminClient();
  if (!client) return { success: true };

  try {
    const { data: profile, error } = await client
      .from('profiles')
      .select('is_locked, is_active')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (profile) {
      if (profile.is_active === false) {
        return { success: false, error: 'Your account has been disabled. Please contact your administrator.' };
      }
      if (profile.is_locked === true) {
        return { success: false, error: 'Your account has been locked due to too many failed login attempts. Please contact your administrator to unlock it.' };
      }
    }
    return { success: true };
  } catch (e: any) {
    console.error('Lock status check error:', e);
    return { success: true };
  }
}

export async function handleFailedLogin(email: string) {
  const client = getAdminClient();
  if (!client) return { locked: false };

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { data: profile, error } = await client
      .from('profiles')
      .select('id, failed_attempts, is_locked, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    if (!profile) return { locked: false };

    const newAttempts = (profile.failed_attempts || 0) + 1;
    
    if (newAttempts >= 5) {
      // Lock account in DB
      const { error: dbErr } = await client
        .from('profiles')
        .update({ is_locked: true, failed_attempts: newAttempts })
        .eq('id', profile.id);
      
      if (dbErr) throw dbErr;

      // Ban in Supabase Auth
      const { error: authErr } = await client.auth.admin.updateUserById(profile.id, {
        ban_duration: '876000h'
      });
      if (authErr) console.warn('Auth ban lock warn:', authErr.message);

      // Sign out current sessions
      await client.auth.admin.signOut(profile.id);

      // Audit log
      await logUserAuditAction(normalizedEmail, 'Account Lock', 'System');

      return { locked: true, error: 'Your account has been locked due to too many failed login attempts. Please contact your administrator to unlock it.' };
    } else {
      const { error: dbErr } = await client
        .from('profiles')
        .update({ failed_attempts: newAttempts })
        .eq('id', profile.id);
      
      if (dbErr) throw dbErr;

      return { locked: false, attemptsRemaining: 5 - newAttempts };
    }
  } catch (e: any) {
    console.error('Failed login tracker fatal error:', e);
    return { locked: false };
  }
}

export async function handleSuccessfulLogin(email: string) {
  const client = getAdminClient();
  if (!client) return { success: false };

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { data: profile, error } = await client
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    if (!profile) return { success: false };

    const { error: dbErr } = await client
      .from('profiles')
      .update({ failed_attempts: 0 })
      .eq('id', profile.id);

    if (dbErr) throw dbErr;
    return { success: true };
  } catch (e: any) {
    console.error('Successful login reset fatal error:', e);
    return { success: false };
  }
}

export async function deleteAuthUser(userId: string) {
  const client = getAdminClient();
  if (!client) {
    return { success: false, error: 'NO_SERVICE_KEY' };
  }

  try {
    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Deletion failed' };
  }
}
