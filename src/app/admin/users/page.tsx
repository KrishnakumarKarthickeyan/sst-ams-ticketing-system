'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTickets } from '../../../context/TicketContext';
import { User, Plus, ShieldCheck, Mail, ShieldAlert, XCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { 
  createAuthUser, 
  updateAuthUserPassword, 
  deleteAuthUser, 
  provisionUser, 
  resetUserPasswordAdmin,
  updateUserAuthStatus,
  adminUpdatePasswordDirect,
  adminForcePasswordChange,
  logUserAuditAction
} from '../../actions/auth';

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
  const { profiles } = useTickets();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Customer');
  const [newOrg, setNewOrg] = useState('Apex Global Industries');

  // Management console modal states
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'credentials' | 'danger'>('view');
  const [modalFormName, setModalFormName] = useState('');
  const [modalFormPhone, setModalFormPhone] = useState('');
  const [modalFormRole, setModalFormRole] = useState('');
  const [modalFormOrgId, setModalFormOrgId] = useState('');
  const [modalPassInput, setModalPassInput] = useState('');
  const [modalPassOption, setModalPassOption] = useState<'temp' | 'manual'>('temp');
  const [generatedPassResult, setGeneratedPassResult] = useState('');
  const [organizationsList, setOrganizationsList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.from('organizations').select('id, name').then(({ data }) => {
        if (data) setOrganizationsList(data);
      });
    }
  }, []);

  const [localUsersList, setLocalUsersList] = useState<UserProfile[]>([]);

  const usersList = useMemo(() => {
    if (isSupabaseConfigured) {
      return (profiles || []).map((u: any) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        role: u.role,
        organization: u.organization || (u.organizations as any)?.name || 'Support Studio',
        active: u.is_active,
        is_locked: u.is_locked || false,
        first_login_completed: u.first_login_completed || false,
        password_changed_at: u.password_changed_at || null,
        phone_number: u.phone_number || '',
        consultant_type: u.consultant_type || '',
        sap_modules: u.sap_modules || []
      }));
    } else {
      return localUsersList;
    }
  }, [profiles, localUsersList]);

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

  const fetchUsers = () => {
    // TicketContext handles reactive refetching automatically via Realtime DB changes
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('sst_admin_users');
      if (stored) {
        try {
          setLocalUsersList(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      } else {
        const defaultUsers: UserProfile[] = [
          { id: 'usr-manager-default', name: 'SAP Manager', email: 'manager@supportstudio.com', role: 'Manager', organization: 'Support Studio', active: true }
        ];
        localStorage.setItem('sst_admin_users', JSON.stringify(defaultUsers));
        setLocalUsersList(defaultUsers);
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
        
        // 1. Try server-side provisioning (Service Role client)
        const authRes = await provisionUser({
          email: newEmail,
          password,
          fullName: newName,
          role: newRole as any,
          companyName: newRole === 'Customer' ? newOrg : undefined,
          contractType: 'AMS',
          contractHours: 160.00
        });

        if (authRes.error === 'NO_SERVICE_KEY') {
          // Fallback to client-side non-persisted signup and manual inserts
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
              contract_type: 'AMS',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              total_hours: 160.00,
              used_hours: 0.00,
              monthly_budget_hours: 15.00,
              is_active: true
            });
            if (contractErr) console.warn('Non-blocking contract error:', contractErr.message);
          }
        } else if (!authRes.success) {
          throw new Error(authRes.error);
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
      setLocalUsersList(updated);
      localStorage.setItem('sst_admin_users', JSON.stringify(updated));
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddForm(false);
    }
  };

  const handleOpenUserModal = (u: any, tab: 'view' | 'edit' | 'credentials' | 'danger' = 'view') => {
    setSelectedUser(u);
    setActiveTab(tab);
    setModalFormName(u.name || '');
    setModalFormPhone(u.phone_number || '');
    setModalFormRole(u.role || 'Customer');
    
    // Resolve organization ID
    const org = organizationsList.find(o => o.name === u.organization);
    setModalFormOrgId(org ? org.id : '');
    
    setModalPassInput('');
    setModalPassOption('temp');
    setGeneratedPassResult('');
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const targetUserId = selectedUser.id;
    const targetUserEmail = selectedUser.email;
    
    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Updating user profile...');
      try {
        const updateData: any = {
          full_name: modalFormName,
          role: modalFormRole,
          phone_number: modalFormPhone
        };
        
        if (modalFormRole === 'Customer' && modalFormOrgId) {
          updateData.organization_id = modalFormOrgId;
        } else {
          updateData.organization_id = null;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', targetUserId);
          
        if (error) throw error;
        
        // Log audit
        await logUserAuditAction(targetUserEmail, `Updated User Profile (Role: ${modalFormRole})`, user?.email || 'SuperAdmin');

        toast.success('User profile updated successfully.', { id: toastId });
        setSelectedUser(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(`Update failed: ${err.message}`, { id: toastId });
      }
    } else {
      // Local fallback
      const updated = usersList.map(u => {
        if (u.id === targetUserId) {
          const selectedOrgName = organizationsList.find(o => o.id === modalFormOrgId)?.name || 'Support Studio';
          return {
            ...u,
            name: modalFormName,
            role: modalFormRole,
            organization: modalFormRole === 'Customer' ? selectedOrgName : 'Support Studio'
          };
        }
        return u;
      });
      setLocalUsersList(updated);
      localStorage.setItem('sst_admin_users', JSON.stringify(updated));
      toast.success('Local user updated successfully.');
      setSelectedUser(null);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const targetUserId = selectedUser.id;
    const targetUserEmail = selectedUser.email;

    let finalPassword = modalPassInput.trim();
    if (modalPassOption === 'temp') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
      let randomPass = '';
      for (let i = 0; i < 10; i++) {
        randomPass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      finalPassword = 'Temp@' + randomPass;
    } else {
      if (finalPassword.length < 6) {
        toast.error('Manual password must be at least 6 characters long.');
        return;
      }
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Authorizing password overwrite...');
      try {
        const res = await resetUserPasswordAdmin(
          targetUserId,
          finalPassword,
          user?.email || 'SuperAdmin',
          targetUserEmail
        );
        if (!res.success) throw new Error(res.error);
        
        setGeneratedPassResult(finalPassword);
        toast.success('Temporary password generated successfully.', { id: toastId });
      } catch (err: any) {
        toast.error(`Reset failed: ${err.message}`, { id: toastId });
      }
    } else {
      setGeneratedPassResult(finalPassword);
      toast.success(`Local password updated to: ${finalPassword}`);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const targetUserId = selectedUser.id;
    const targetUserEmail = selectedUser.email;
    const finalPassword = modalPassInput.trim();

    if (finalPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Authorizing permanent password update...');
      try {
        const res = await adminUpdatePasswordDirect(
          targetUserId,
          finalPassword,
          user?.email || 'SuperAdmin',
          targetUserEmail
        );
        if (!res.success) throw new Error(res.error);
        
        toast.success('User password updated successfully. They can login without force setup.', { id: toastId });
        setModalPassInput('');
        setSelectedUser(null);
      } catch (err: any) {
        toast.error(`Update failed: ${err.message}`, { id: toastId });
      }
    } else {
      toast.success(`Local Password updated to: ${finalPassword}`);
      setSelectedUser(null);
    }
  };

  const handleToggleUserStatus = async (id: string, email: string, currentActive: boolean) => {
    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Updating account access...');
      try {
        const res = await updateUserAuthStatus(
          id,
          email,
          !currentActive,
          false,
          user?.email || 'SuperAdmin'
        );
        if (!res.success) throw new Error(res.error);
        toast.success(`Account access changed to: ${!currentActive ? 'Active' : 'Disabled'}`, { id: toastId });
        setSelectedUser(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(`Operation failed: ${err.message}`, { id: toastId });
      }
    } else {
      const updated = usersList.map(u => {
        if (u.id === id) {
          return { ...u, active: !currentActive };
        }
        return u;
      });
      setLocalUsersList(updated);
      localStorage.setItem('sst_admin_users', JSON.stringify(updated));
      setSelectedUser(null);
    }
  };

  const handleForcePasswordChange = async (id: string, email: string) => {
    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Enforcing password setup...');
      try {
        const res = await adminForcePasswordChange(id, email, user?.email || 'SuperAdmin');
        if (!res.success) throw new Error(res.error);
        toast.success('Force setup enabled. User must create new credentials on next authentication.', { id: toastId });
        setSelectedUser(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(`Force setup failed: ${err.message}`, { id: toastId });
      }
    } else {
      toast.success('Local password change forced.');
      setSelectedUser(null);
    }
  };

  const handleUnlockUser = async (id: string, email: string, isActive: boolean) => {
    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Lifting lockout ban...');
      try {
        const res = await updateUserAuthStatus(
          id,
          email,
          isActive,
          false, // Clear lockout is_locked status
          user?.email || 'SuperAdmin'
        );
        if (!res.success) throw new Error(res.error);
        toast.success('Account unlocked successfully.', { id: toastId });
        setSelectedUser(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(`Unlock failed: ${err.message}`, { id: toastId });
      }
    } else {
      toast.success('Local account unlocked.');
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (confirm('Are you sure you want to permanently remove this user account?')) {
      if (isSupabaseConfigured && supabase) {
        const toastId = toast.loading('Pruning user registration...');
        try {
          const authRes = await deleteAuthUser(id);
          if (!authRes.success && authRes.error !== 'NO_SERVICE_KEY') {
            throw new Error(authRes.error);
          }

          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw new Error(error.message);

          toast.success('User removed completely.', { id: toastId });
          setSelectedUser(null);
          window.location.reload();
        } catch (err: any) {
          toast.error(`Prune failed: ${err.message}`, { id: toastId });
        }
      } else {
        const updated = usersList.filter(u => u.id !== id);
        setLocalUsersList(updated);
        localStorage.setItem('sst_admin_users', JSON.stringify(updated));
        setSelectedUser(null);
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
                        onClick={() => handleOpenUserModal(u, 'view')}
                        className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unified User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs text-zinc-900">
          <div className="bg-white border border-zinc-200 rounded-lg shadow-lg w-full max-w-2xl overflow-hidden flex flex-col h-[550px]">
            {/* Header */}
            <div className="bg-zinc-50 border-b border-zinc-150 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm uppercase text-zinc-950 tracking-wide">
                  IAM Operations: {selectedUser.name}
                </h3>
                <span className="text-[10px] text-zinc-400 block mt-0.5 select-all">{selectedUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-6 h-6 border border-zinc-200 hover:border-zinc-950 text-zinc-550 hover:text-zinc-950 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab Links */}
            <div className="bg-zinc-50/50 border-b border-zinc-150 px-6 flex gap-1">
              <button
                type="button"
                onClick={() => { setActiveTab('view'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[9px] tracking-wider transition cursor-pointer ${
                  activeTab === 'view' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                Diagnostic
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('edit'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[9px] tracking-wider transition cursor-pointer ${
                  activeTab === 'edit' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('credentials'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[9px] tracking-wider transition cursor-pointer ${
                  activeTab === 'credentials' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                Credentials (IAM)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('danger'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[9px] tracking-wider transition cursor-pointer ${
                  activeTab === 'danger' ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                Danger Zone
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* Tab 1: Diagnostic */}
              {activeTab === 'view' && (
                <div className="space-y-3.5">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-zinc-450 border-b border-zinc-100 pb-1.5">
                    Account Metadata Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-zinc-700">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block">Setup Status:</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        selectedUser.first_login_completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {selectedUser.first_login_completed ? 'Setup Completed' : 'Pending Initial Reset'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block">IAM Lockout Status:</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          selectedUser.is_locked ? 'bg-red-50 text-red-750 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {selectedUser.is_locked ? 'Account Locked' : 'Account Active'}
                        </span>
                        {selectedUser.is_locked && (
                          <button
                            type="button"
                            onClick={() => handleUnlockUser(selectedUser.id, selectedUser.email, selectedUser.active)}
                            className="px-2 py-0.5 border border-zinc-300 hover:border-zinc-950 hover:bg-zinc-50 rounded text-[9px] font-bold uppercase tracking-wide cursor-pointer"
                          >
                            Unlock Account
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block">Last Password Update:</span>
                      <span className="font-mono text-zinc-800 text-[11px] font-bold">
                        {selectedUser.password_changed_at ? new Date(selectedUser.password_changed_at).toLocaleString() : 'Never Changed'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block">Account Status:</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        selectedUser.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-750 border border-red-100'
                      }`}>
                        {selectedUser.active ? 'Access Enabled' : 'Access Disabled'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block">SaaS Identity ID:</span>
                      <span className="font-mono text-zinc-500 text-[10px] select-all block mt-0.5">{selectedUser.id}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block">RLS Policy Gate:</span>
                      <span className="font-bold text-zinc-800 uppercase text-[10px]">
                        {isSupabaseConfigured ? 'Enforced (Tenant Isolation)' : 'State Simulated'}
                      </span>
                    </div>
                  </div>

                  {selectedUser.role === 'Consultant' && (
                    <div className="space-y-3 pt-3 border-t border-zinc-150">
                      <h4 className="font-bold uppercase tracking-wider text-[10px] text-zinc-450">
                        Consultant Expertise Mappings
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] uppercase text-zinc-400 font-bold block">Consultant Category:</span>
                          <span className="font-bold text-zinc-800 text-[11px] block mt-0.5">{selectedUser.consultant_type || 'Functional'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-zinc-400 font-bold block">Assigned SAP Modules:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedUser.sap_modules && selectedUser.sap_modules.length > 0 ? (
                              selectedUser.sap_modules.map((m: string) => (
                                <span key={m} className="bg-zinc-100 border border-zinc-200 text-zinc-800 px-1 rounded text-[10px] font-bold">
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-400 italic">None assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Edit Profile */}
              {activeTab === 'edit' && (
                <form onSubmit={handleEditUserSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={modalFormName}
                      onChange={(e) => setModalFormName(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px]">Contact Phone</label>
                    <input
                      type="text"
                      value={modalFormPhone}
                      onChange={(e) => setModalFormPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px]">Role Group</label>
                      <select
                        value={modalFormRole}
                        onChange={(e) => setModalFormRole(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                      >
                        <option value="Customer">Customer Client</option>
                        <option value="Consultant">SAP Consultant</option>
                        <option value="Manager">SAP Manager</option>
                        <option value="SuperAdmin">Super Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px]">Assigned Company (Customers only)</label>
                      <select
                        value={modalFormOrgId}
                        onChange={(e) => setModalFormOrgId(e.target.value)}
                        disabled={modalFormRole !== 'Customer'}
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono disabled:opacity-50"
                      >
                        <option value="">Select Company</option>
                        {organizationsList.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                    >
                      Update Profile
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Credentials (IAM) */}
              {activeTab === 'credentials' && (
                <div className="space-y-6">
                  
                  {/* Option 1 & 2: Reset Password (Temp vs Manual) */}
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 border border-zinc-200 bg-zinc-50/30 rounded p-4">
                    <h5 className="font-bold uppercase text-[10px] text-zinc-950 border-b border-zinc-150 pb-1.5">
                      Reset Password (Forces Setup Page Redirection)
                    </h5>
                    
                    {generatedPassResult && (
                      <div className="bg-zinc-950 text-white border border-zinc-900 rounded p-3 text-[11px] font-bold space-y-1">
                        <span className="text-[10px] text-zinc-400 font-normal uppercase block">Password Reset Successful!</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs tracking-wider select-all font-extrabold text-emerald-400">{generatedPassResult}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPassResult);
                              toast.success('Password copied to clipboard!');
                            }}
                            className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded text-[9px] font-bold uppercase transition"
                          >
                            Copy Pass
                          </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 block font-normal pt-1.5 leading-normal">
                          Notice: Provide this password to the user. They will be forced to change it immediately upon next login.
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 font-semibold text-zinc-700 cursor-pointer">
                        <input
                          type="radio"
                          name="reset_option"
                          checked={modalPassOption === 'temp'}
                          onChange={() => { setModalPassOption('temp'); setGeneratedPassResult(''); }}
                          className="accent-zinc-950"
                        />
                        Generate Temporary Password
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold text-zinc-700 cursor-pointer">
                        <input
                          type="radio"
                          name="reset_option"
                          checked={modalPassOption === 'manual'}
                          onChange={() => { setModalPassOption('manual'); setGeneratedPassResult(''); }}
                          className="accent-zinc-950"
                        />
                        Enter Password Manually
                      </label>
                    </div>

                    {modalPassOption === 'manual' && (
                      <div className="space-y-1">
                        <label className="font-bold text-zinc-750 uppercase text-[9px]">Define Password Override</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Assist@123"
                          value={modalPassInput}
                          onChange={(e) => setModalPassInput(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                        />
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 border border-zinc-900 text-zinc-900 hover:bg-zinc-950 hover:text-white rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                      >
                        {modalPassOption === 'temp' ? 'Generate & Reset Password' : 'Override & Reset Password'}
                      </button>
                    </div>
                  </form>

                  {/* Option 3: Update Password (Direct) */}
                  <form onSubmit={handleUpdatePasswordSubmit} className="space-y-3.5 border border-zinc-200 bg-zinc-50/30 rounded p-4">
                    <h5 className="font-bold uppercase text-[10px] text-zinc-950 border-b border-zinc-150 pb-1.5">
                      Direct Password Update (No Force Setup Required)
                    </h5>
                    
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-750 uppercase text-[9px]">New Password</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Assist@456"
                        value={modalPassInput}
                        onChange={(e) => setModalPassInput(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 border border-zinc-900 text-zinc-900 hover:bg-zinc-950 hover:text-white rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                      >
                        Direct Password Save
                      </button>
                    </div>
                  </form>

                  {/* Setup & Lock Adjusters */}
                  <div className="grid grid-cols-2 gap-4 border border-zinc-200 bg-zinc-50/30 rounded p-4">
                    <div className="space-y-2">
                      <span className="font-bold uppercase text-[9px] text-zinc-450 block">Force Setup redirection</span>
                      <button
                        type="button"
                        onClick={() => handleForcePasswordChange(selectedUser.id, selectedUser.email)}
                        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                      >
                        Force Password Change
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold uppercase text-[9px] text-zinc-450 block">Lifts failed attempts lockout</span>
                      <button
                        type="button"
                        onClick={() => handleUnlockUser(selectedUser.id, selectedUser.email, selectedUser.active)}
                        className="w-full py-2 border border-zinc-350 hover:bg-zinc-950 hover:text-white rounded text-zinc-700 font-bold uppercase text-[10px] tracking-wider transition cursor-pointer disabled:opacity-50"
                        disabled={!selectedUser.is_locked}
                      >
                        Unlock Account
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 4: Danger Zone */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  
                  {/* Disable account block */}
                  <div className="border border-zinc-200 bg-zinc-50/30 rounded p-4 space-y-3">
                    <h5 className="font-mono text-xs font-bold uppercase text-zinc-900">
                      Enable / Disable Account Access
                    </h5>
                    <p className="text-zinc-500 leading-relaxed text-[11px]">
                      Disabling the account bans the user in Supabase Auth, terminates all active sessions, and blocks logins.
                    </p>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.email, selectedUser.active)}
                        className={`px-4 py-2 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer ${
                          selectedUser.active ? 'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {selectedUser.active ? 'Disable User Access' : 'Enable User Access'}
                      </button>
                    </div>
                  </div>

                  {/* Remove Account Block */}
                  {user?.email !== selectedUser.email && (
                    <div className="border border-red-200 bg-red-50/30 rounded p-4 space-y-3">
                      <h5 className="font-mono text-xs font-bold uppercase text-red-900">
                        Prune Account Registration
                      </h5>
                      <p className="text-red-700/80 leading-relaxed text-[11px]">
                        Warning: This action is irreversible. Permanently deletes the user record from both the database profiles and authentication registry.
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                          className="px-4 py-2 bg-red-650 text-white hover:bg-red-700 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                        >
                          Prune User Account
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
