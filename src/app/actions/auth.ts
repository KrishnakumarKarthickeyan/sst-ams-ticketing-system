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
  contractType?: string;
  contractHours?: number;
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
      user_metadata: { full_name: fullName, role }
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

      // Resolve or insert organization
      const { data: existingOrg, error: findOrgErr } = await client
        .from('organizations')
        .select('id')
        .eq('name', companyName)
        .maybeSingle();

      if (findOrgErr) throw findOrgErr;

      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgErr } = await client
          .from('organizations')
          .insert({ name: companyName })
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
        is_active: true,
        organization_id: orgId,
        phone_number: params.phoneNumber || 'N/A'
      });

      if (profErr) throw profErr;

      // Upsert customer contract
      const contractHours = params.contractHours || 160.00;
      const { error: contractErr } = await client.from('customer_contracts').insert({
        organization_id: orgId,
        contract_type: (params.contractType || 'AMS') as any,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_hours: contractHours,
        used_hours: 0.00,
        monthly_budget_hours: Math.round(contractHours / 12) || 15.00,
        is_active: true
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
        skills: skills
      });

      if (profErr) throw profErr;
    } else {
      // SuperAdmin or Manager
      const { error: profErr } = await client.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
        is_active: true
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
