'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { User, Plus, ShieldCheck, Mail, ShieldAlert, XCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { createAuthUser, updateAuthUserPassword, deleteAuthUser } from '../../actions/auth';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  active: boolean;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Customer');
  const [newOrg, setNewOrg] = useState('Apex Global Industries');

  const getClientSideAuthClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  };

  const fetchUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(name)');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map((u: any) => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          role: u.role,
          organization: u.organizations ? u.organizations.name : 'Support Studio',
          active: u.is_active
        }));
        setUsersList(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch users from database', err);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchUsers();
    } else {
      const stored = localStorage.getItem('sst_admin_users');
      if (stored) {
        setUsersList(JSON.parse(stored));
      } else {
        const defaultUsers: UserProfile[] = [
          { id: 'usr-manager-default', name: 'SAP Manager', email: 'manager@supportstudio.com', role: 'Manager', organization: 'Support Studio', active: true }
        ];
        setUsersList(defaultUsers);
        localStorage.setItem('sst_admin_users', JSON.stringify(defaultUsers));
      }
    }
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    if (isSupabaseConfigured && supabase) {
      const password = newPassword || 'Password@12345';
      const toastId = toast.loading(`Registering user ${newEmail}...`);
      try {
        let authId = '';
        
        // 1. Create auth user
        const authRes = await createAuthUser(newEmail, password, newName, newRole);
        if (authRes.success && authRes.id) {
          authId = authRes.id;
        } else if (authRes.error === 'NO_SERVICE_KEY') {
          // Fallback to client-side non-persisted signup
          const authClient = getClientSideAuthClient();
          if (!authClient) throw new Error('Client-side auth manager failed to initialize.');
          const { data, error: signUpErr } = await authClient.auth.signUp({
            email: newEmail.trim().toLowerCase(),
            password: password,
            options: {
              data: {
                full_name: newName,
                role: newRole
              }
            }
          });
          if (signUpErr) throw new Error(signUpErr.message);
          if (data.user && data.user.id) {
            authId = data.user.id;
          } else {
            throw new Error('This email address may already be registered. Please try a different email or sign in.');
          }
        } else {
          throw new Error(authRes.error);
        }

        if (!authId) throw new Error('Failed to obtain user identity reference.');

        // 2. Resolve organization if role is Customer
        let orgId = null;
        if (newRole === 'Customer') {
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', newOrg.trim())
            .maybeSingle();

          if (existingOrg) {
            orgId = existingOrg.id;
          } else {
            const { data: newOrganization, error: orgErr } = await supabase
              .from('organizations')
              .insert({ name: newOrg.trim() })
              .select('id')
              .single();
            if (orgErr) throw new Error(orgErr.message);
            orgId = newOrganization.id;
          }
        }

        // 3. Create profile
        const { error: profErr } = await supabase.from('profiles').insert({
          id: authId,
          email: newEmail.trim().toLowerCase(),
          full_name: newName,
          role: newRole,
          is_active: true,
          organization_id: orgId
        });

        if (profErr) throw new Error(profErr.message);

        // 4. Create customer contract if it is customer
        if (newRole === 'Customer' && orgId) {
          const { error: contractErr } = await supabase.from('customer_contracts').insert({
            organization_id: orgId,
            contract_type: 'Standard Support',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_hours: 160.00,
            used_hours: 0.00,
            monthly_budget_hours: 15.00,
            is_active: true
          });
          if (contractErr) console.warn('Non-blocking contract error:', contractErr.message);
        }

        toast.success(`User provisioned successfully. Login password is: ${password}`, { id: toastId, duration: 8000 });
        fetchUsers();
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setShowAddForm(false);
      } catch (err: any) {
        let msg = err.message;
        if (msg.includes('security purposes') || msg.includes('rate limit') || msg.includes('too many requests')) {
          msg += ' (To bypass security rate limits, configure the SUPABASE_SERVICE_ROLE_KEY environment variable in your .env.local file to use the Admin API)';
        }
        toast.error(`Provisioning failed: ${msg}`, { id: toastId, duration: 10000 });
        console.error(err);
      }
    } else {
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: newName,
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        organization: newOrg,
        active: true
      };
      const updated = [...usersList, newUser];
      setUsersList(updated);
      localStorage.setItem('sst_admin_users', JSON.stringify(updated));
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddForm(false);
    }
  };

  const toggleUserStatus = async (id: string) => {
    const current = usersList.find(u => u.id === id);
    if (!current) return;

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Toggling account access...');
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: !current.active })
          .eq('id', id);

        if (error) throw new Error(error.message);
        toast.success(`Account access changed to: ${!current.active ? 'Active' : 'Disabled'}`, { id: toastId });
        fetchUsers();
      } catch (err: any) {
        toast.error(`Operation failed: ${err.message}`, { id: toastId });
      }
    } else {
      const updated = usersList.map(u => {
        if (u.id === id) {
          return { ...u, active: !u.active };
        }
        return u;
      });
      setUsersList(updated);
      localStorage.setItem('sst_admin_users', JSON.stringify(updated));
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPass = prompt("Enter new password for this user account:");
    if (!newPass) return;
    if (newPass.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Authorizing password overwrite...');
      try {
        const res = await updateAuthUserPassword(id, newPass);
        if (res.success) {
          toast.success('Password overwrite successful!', { id: toastId });
        } else if (res.error === 'NO_SERVICE_KEY') {
          toast.error('Overwriting passwords from the dashboard requires configuring the SUPABASE_SERVICE_ROLE_KEY environment variable on the server.', { id: toastId, duration: 6000 });
        } else {
          throw new Error(res.error);
        }
      } catch (err: any) {
        toast.error(`Authorization failed: ${err.message}`, { id: toastId });
      }
    } else {
      alert(`Local reset: Password updated to "${newPass}" for account ID "${id}".`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to permanently remove this user account?')) {
      if (isSupabaseConfigured && supabase) {
        const toastId = toast.loading('Pruning user registration...');
        try {
          // Delete auth record (requires service role)
          const authRes = await deleteAuthUser(id);
          if (!authRes.success && authRes.error !== 'NO_SERVICE_KEY') {
            throw new Error(authRes.error);
          }

          // Delete DB row
          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw new Error(error.message);

          toast.success('User removed completely.', { id: toastId });
          fetchUsers();
        } catch (err: any) {
          toast.error(`Prune failed: ${err.message}`, { id: toastId });
        }
      } else {
        const updated = usersList.filter(u => u.id !== id);
        setUsersList(updated);
        localStorage.setItem('sst_admin_users', JSON.stringify(updated));
      }
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-955 font-mono">User Management</h1>
          <p className="text-zinc-500 mt-1">Manage platform authorization, issue roles, and assign organizational scopes.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus size={12} />
          Provision User
        </button>
      </div>

      {/* Invite User Form */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="bg-white border border-zinc-200 rounded p-4 max-w-md space-y-4 shadow-sm">
          <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2">
            Provision New User Access
          </h3>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Elena Rostova"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. elena@sap.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Password</label>
            <input
              type="password"
              required
              placeholder="Assign a secure password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Role Group</label>
              <select
                value={newRole}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewRole(val);
                  if (val !== 'Customer') {
                    setNewOrg('SST SAP Operations');
                  }
                }}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
              >
                <option value="Customer">Customer Client</option>
                <option value="Consultant">SAP Consultant</option>
                <option value="Manager">SAP Manager</option>
                <option value="SuperAdmin">Super Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Assigned Company</label>
              <select
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                disabled={newRole !== 'Customer'}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono disabled:opacity-50"
              >
                <option value="SST SAP Operations">SST SAP Operations</option>
                <option value="Apex Global Industries">Apex Global Industries</option>
                <option value="Titan Energy Corp">Titan Energy Corp</option>
                <option value="Nexa Manufacturing">Nexa Manufacturing</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-55 rounded uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Provision User
            </button>
          </div>
        </form>
      )}

      {/* Users Table List */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">SaaS Role</th>
              <th className="p-4">Company Assigned</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {usersList.map((u) => {
              const isAdmin = u.role === 'SuperAdmin';
              const isManager = u.role === 'Manager';
              const isConsultant = u.role === 'Consultant';

              return (
                <tr key={u.id} className="hover:bg-zinc-50/50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-150 flex items-center justify-center text-zinc-900 font-bold uppercase shrink-0">
                      {u.name ? u.name.split(' ').map(n => n[0]).join('') : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 text-xs block">{u.name}</span>
                      {user?.email === u.email && (
                        <span className="text-[8px] bg-zinc-950 text-white font-mono px-1 rounded block w-max mt-0.5">YOUR SESSION</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-500 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Mail size={12} />
                      {u.email}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAdmin ? 'bg-zinc-950 text-white' :
                      isManager ? 'bg-zinc-800 text-white' :
                      isConsultant ? 'bg-zinc-100 text-zinc-850 border border-zinc-300' :
                      'bg-white text-zinc-650 border border-zinc-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-zinc-600">{u.organization}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${
                      u.active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-750'
                    }`}>
                      {u.active ? (
                        <ShieldCheck size={11} className="text-emerald-600" />
                      ) : (
                        <XCircle size={11} className="text-red-605" />
                      )}
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition cursor-pointer ${
                          u.active ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-zinc-200 text-zinc-550 hover:bg-zinc-50 transition cursor-pointer"
                      >
                        Reset Pass
                      </button>
                      {user?.email !== u.email && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                          title="Remove User"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
