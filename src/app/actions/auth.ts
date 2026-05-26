'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getAdminClient = () => {
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
