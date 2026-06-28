'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTickets } from '../../../context/TicketContext';
import { User, Plus, ShieldCheck, Mail, ShieldAlert, XCircle, Lock, KeyRound } from 'lucide-react';
import { TanstackTable } from '../../../components/ui/tanstack-table';
import type { ColumnDef } from '@tanstack/react-table';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { 
  createAuthUser, 
  deleteAuthUser, 
  provisionUser, 
  resetUserPasswordAdmin,
  updateUserAuthStatus,
  adminUpdatePasswordDirect,
  adminForcePasswordChange,
  logUserAuditAction,
  verifyPasswordPolicy
} from '../../actions/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../components/ui/dialog';
import { PageHeader } from '../../../components/ui/page-header';
import { CreateConsultantDialog } from '../../../components/users/CreateConsultantDialog';
import { CreateClientDialog } from '../../../components/users/CreateClientDialog';
import { Button } from '../../../components/ui/button';

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
  const { profiles, refetchData } = useTickets();
  const [showAddForm, setShowAddForm] = useState(false);
  const [createConsultantOpen, setCreateConsultantOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdOption, setPwdOption] = useState<'auto' | 'manual'>('auto');
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
  const [resetPwdMethod, setResetPwdMethod] = useState<'auto' | 'manual'>('auto');
  const [resetManualPwd, setResetManualPwd] = useState('');
  const [generatedPassResult, setGeneratedPassResult] = useState('');
  const [organizationsList, setOrganizationsList] = useState<{ id: string; name: string }[]>([]);
  const [creationSuccessModal, setCreationSuccessModal] = useState<{ email: string; tempPass: string } | null>(null);

  // Reset Password Dialog states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);
  const [resetManualPassword, setResetManualPassword] = useState('');
  const [resetGeneratedPassword, setResetGeneratedPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  // Update Password Dialog states
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateTargetUser, setUpdateTargetUser] = useState<any | null>(null);
  const [updateNewPassword, setUpdateNewPassword] = useState('');
  const [updateConfirmPassword, setUpdateConfirmPassword] = useState('');
  const [updateForceChange, setUpdateForceChange] = useState(false);

  const generatePass = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const getRand = (str: string) => str[Math.floor(Math.random() * str.length)];
    const chars = [getRand(uppers), getRand(lowers), getRand(numbers), getRand(specials)];
    const allChars = uppers + lowers + numbers + specials;
    for (let i = 4; i < 12; i++) chars.push(getRand(allChars));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  };

  const handleDirectResetPassword = async () => {
    if (!resetTargetUser) return;
    const targetUserId = resetTargetUser.id;
    const manualPassword = resetManualPassword.trim();

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Resetting password...');
      try {
        const apiRes = await fetch('/api/admin/users/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId, manualPassword })
        });
        const res = await apiRes.json();
        if (!apiRes.ok || !res.success) throw new Error(res.error || 'API request failed');
        
        setResetGeneratedPassword(res.tempPassword);
        setResetDone(true);
        toast.success('Password reset successfully.', { id: toastId });
        fetchUsers();
      } catch (err: unknown) {
        toast.error(`Reset failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const tempPass = manualPassword !== '' ? manualPassword : ('Temp@' + (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!');
      setResetGeneratedPassword(tempPass);
      setResetDone(true);
      toast.success(`Local password reset to: ${tempPass}`);
    }
  };

  const handleDirectUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTargetUser) return;
    const targetUserId = updateTargetUser.id;
    const newPassword = updateNewPassword.trim();
    const confirmPassword = updateConfirmPassword.trim();
    const forcePasswordChange = updateForceChange;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Updating password...');
      try {
        const apiRes = await fetch('/api/admin/users/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId, newPassword, forcePasswordChange })
        });
        const res = await apiRes.json();
        if (!apiRes.ok || !res.success) throw new Error(res.error || 'API request failed');
        
        toast.success('Password updated successfully.', { id: toastId });
        setUpdateDialogOpen(false);
        fetchUsers();
      } catch (err: unknown) {
        toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      toast.success(`Local password updated successfully (Force Change: ${forcePasswordChange ? 'Yes' : 'No'})`);
      setUpdateDialogOpen(false);
    }
  };

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
        organization: u.organization || (u.organizations as any)?.name || 'Assist360 Operations',
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

  const triggerDoubleRefetch = async () => {
    try {
      await refetchData();
    } catch (e) {
      console.error('Initial refetch error:', e);
    }
    setTimeout(async () => {
      try {
        await refetchData();
      } catch (e) {
        console.error('Deferred refetch error:', e);
      }
    }, 1200);
  };

  const fetchUsers = () => {
    triggerDoubleRefetch();
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
          { id: 'usr-manager-default', name: 'SAP Manager', email: 'manager@assist360.com', role: 'Manager', organization: 'Assist360 Operations', active: true }
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
      const toastId = toast.loading(`Registering user ${newEmail}...`);
      try {
        let authId = '';
        
        // 1. Try server-side provisioning (Service Role client)
        const authRes = await provisionUser({
          email: newEmail,
          fullName: newName,
          role: newRole as any,
          companyName: newRole === 'Customer' ? newOrg : undefined,
          contractType: 'AMS',
          contractHours: 160.00,
          performedBy: user?.email || 'SuperAdmin',
          initialPassword: (newRole === 'SuperAdmin' && pwdOption === 'manual') ? newPassword : undefined
        });

        if (authRes.error === 'NO_SERVICE_KEY') {
          // Generate password on client fallback
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
          let tempPass = '';
          for (let i = 0; i < 10; i++) {
            tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const password = pwdOption === 'manual' ? newPassword : ('Temp@' + tempPass);

          // Fallback to client-side signup
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
            organization_id: orgId || undefined,
            first_login_completed: false,
            force_password_change: false
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
          
          setCreationSuccessModal({ email: newEmail, tempPass: password });
          toast.success('User provisioned successfully.', { id: toastId });
        } else if (!authRes.success) {
          throw new Error(authRes.error);
        } else {
          setCreationSuccessModal({ email: newEmail, tempPass: authRes.password || '' });
          toast.success('User provisioned successfully.', { id: toastId });
        }

        fetchUsers();
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setPwdOption('auto');
        setShowAddForm(false);
      } catch (err: unknown) {
        let msg = getErrorMessage(err);
        if (msg.includes('security purposes') || msg.includes('rate limit') || msg.includes('too many requests')) {
          msg += ' (To bypass security rate limits, configure the SUPABASE_SERVICE_ROLE_KEY environment variable in your .env.local file to use the Admin API)';
        }
        toast.error(`Provisioning failed: ${msg}`, { id: toastId, duration: 10000 });
        console.error(err);
      }
    } else {
      const tempPass = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!';
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
      setCreationSuccessModal({ email: newEmail, tempPass: tempPass });
      setNewName('');
      setNewEmail('');
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
    setResetPwdMethod('auto');
    setResetManualPwd('');
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
        await triggerDoubleRefetch();
      } catch (err: unknown) {
        toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      // Local fallback
      const updated = usersList.map(u => {
        if (u.id === targetUserId) {
          const selectedOrgName = organizationsList.find(o => o.id === modalFormOrgId)?.name || 'Assist360 Operations';
          return {
            ...u,
            name: modalFormName,
            role: modalFormRole,
            organization: modalFormRole === 'Customer' ? selectedOrgName : 'Assist360 Operations'
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

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Authorizing password overwrite...');
      try {
        const apiRes = await fetch('/api/admin/users/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId })
        });
        const res = await apiRes.json();
        if (!apiRes.ok || !res.success) throw new Error(res.error || 'API request failed');
        
        setGeneratedPassResult(res.tempPassword);
        toast.success('Password reset successfully.', { id: toastId });
        fetchUsers();
      } catch (err: unknown) {
        toast.error(`Reset failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const tempPass = 'Temp@' + (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!';
      setGeneratedPassResult(tempPass);
      toast.success(`Local password updated to: ${tempPass}`);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const targetUserId = selectedUser.id;
    const finalPassword = modalPassInput.trim();

    // Validate password policy
    const hasMinLength = finalPassword.length >= 12;
    const hasUppercase = /[A-Z]/.test(finalPassword);
    const hasLowercase = /[a-z]/.test(finalPassword);
    const hasNumber = /[0-9]/.test(finalPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(finalPassword);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      toast.error('Password does not meet complexity requirements. Must be at least 12 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Authorizing permanent password update...');
      try {
        const apiRes = await fetch('/api/admin/users/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId, newPassword: finalPassword })
        });
        const res = await apiRes.json();
        if (!apiRes.ok || !res.success) throw new Error(res.error || 'API request failed');
        
        toast.success('User password updated successfully. They can login without force setup.', { id: toastId });
        setModalPassInput('');
        setSelectedUser(null);
        fetchUsers();
      } catch (err: unknown) {
        toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
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
        await triggerDoubleRefetch();
      } catch (err: unknown) {
        toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
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
        await triggerDoubleRefetch();
      } catch (err: unknown) {
        toast.error(`Force setup failed: ${getErrorMessage(err)}`, { id: toastId });
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
        await triggerDoubleRefetch();
      } catch (err: unknown) {
        toast.error(`Unlock failed: ${getErrorMessage(err)}`, { id: toastId });
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
          await triggerDoubleRefetch();
        } catch (err: unknown) {
          toast.error(`Prune failed: ${getErrorMessage(err)}`, { id: toastId });
        }
      } else {
        const updated = usersList.filter(u => u.id !== id);
        setLocalUsersList(updated);
        localStorage.setItem('sst_admin_users', JSON.stringify(updated));
        setSelectedUser(null);
      }
    }
  };

  // TanStack column model for the users list (sortable + paginated).
  const userColumns = useMemo<ColumnDef<any, unknown>[]>(() => [
    { id: 'name', accessorKey: 'name', header: 'Name',
      cell: ({ row }) => { const u = row.original; return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-ink font-bold uppercase shrink-0">
            {u.name ? u.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
          </div>
          <div>
            <span className="font-bold text-ink text-xs block">{u.name}</span>
            {user?.email === u.email && <span className="text-[11px] bg-ink text-white px-1 rounded block w-max mt-0.5">YOUR SESSION</span>}
          </div>
        </div>); } },
    { id: 'email', accessorKey: 'email', header: 'Email',
      cell: ({ row }) => <span className="flex items-center gap-1.5 text-ink-secondary"><Mail size={12} />{row.original.email}</span> },
    { id: 'role', accessorKey: 'role', header: 'SaaS Role',
      cell: ({ row }) => { const r = row.original.role; return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          r === 'SuperAdmin' ? 'bg-ink text-white' : r === 'Manager' ? 'bg-zinc-800 text-white' :
          r === 'Consultant' ? 'bg-surface-subtle text-ink border border-line-strong' : 'bg-surface text-ink-secondary border border-line'
        }`}>{r}</span>); } },
    { id: 'organization', accessorKey: 'organization', header: 'Company Assigned',
      cell: ({ row }) => <span className="font-semibold text-ink-secondary">{row.original.organization}</span> },
    { id: 'status', accessorFn: (u: any) => (u.active ? 'Active' : 'Disabled'), header: 'Status',
      cell: ({ row }) => { const a = row.original.active; return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold ${a ? 'bg-success-soft border-success-border text-success-strong' : 'bg-critical-soft border-critical-border text-red-750'}`}>
          {a ? <ShieldCheck size={11} className="text-success" /> : <XCircle size={11} className="text-red-605" />}{a ? 'Active' : 'Disabled'}
        </span>); } },
    { id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => { const u = row.original; const isAdmin = u.role === 'SuperAdmin'; return (
        <div className="flex items-center justify-end gap-2">
          {!isAdmin && (<>
            <button onClick={() => { setResetTargetUser(u); setResetManualPassword(''); setResetGeneratedPassword(generatePass()); setResetDone(false); setResetDialogOpen(true); }}
              className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-line-strong hover:bg-surface-muted transition cursor-pointer">Reset Password</button>
            <button onClick={() => { setUpdateTargetUser(u); setUpdateNewPassword(''); setUpdateConfirmPassword(''); setUpdateForceChange(false); setUpdateDialogOpen(true); }}
              className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-line-strong hover:bg-surface-muted transition cursor-pointer">Update Password</button>
          </>)}
          <button onClick={() => handleOpenUserModal(u, 'view')}
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-ink bg-ink text-white hover:bg-zinc-800 transition cursor-pointer">Manage</button>
        </div>); } },
  ], []);

  return (
    <div className="space-y-6 text-xs text-ink">
      <PageHeader
        title="User Management"
        description="Manage platform authorization, issue roles, and assign organizational scopes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreateConsultantOpen(true)} className="gap-1.5 rounded-md">
              <Plus size={13} />
              Create Consultant
            </Button>
            <Button variant="outline" onClick={() => setCreateClientOpen(true)} className="gap-1.5 rounded-md">
              <Plus size={13} />
              Create Client
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-1.5 rounded-md">
              <Plus size={13} />
              Provision User
            </Button>
          </div>
        }
      />

      <CreateConsultantDialog open={createConsultantOpen} onOpenChange={setCreateConsultantOpen} performedBy={user?.email} onCreated={fetchUsers} />
      <CreateClientDialog open={createClientOpen} onOpenChange={setCreateClientOpen} performedBy={user?.email} onCreated={fetchUsers} />

      {/* Invite User Form */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="bg-surface border border-line rounded p-4 max-w-md space-y-4 shadow-card">
          <h3 className="font-bold text-[11px] uppercase tracking-wider text-ink border-b border-line pb-2">
            Provision New User Access
          </h3>
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Elena Rostova"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. elena@sap.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
            />
          </div>

          {newRole === 'SuperAdmin' ? (
            <>
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-ink-secondary uppercase text-[11px] block">Password Assignment</label>
                <div className="flex items-center gap-4 text-xs font-sans">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="newPwdOption"
                      checked={pwdOption === 'auto'}
                      onChange={() => setPwdOption('auto')}
                      className="w-3.5 h-3.5 text-ink focus:ring-brand/30"
                    />
                    <span>Generate Automatically</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="newPwdOption"
                      checked={pwdOption === 'manual'}
                      onChange={() => setPwdOption('manual')}
                      className="w-3.5 h-3.5 text-ink focus:ring-brand/30"
                    />
                    <span>Define Manually</span>
                  </label>
                </div>
              </div>

              {pwdOption === 'manual' && (
                <div className="space-y-1">
                  <label className="font-bold text-ink-secondary uppercase text-[11px]">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Assign manual initial password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                  />
                  <span className="text-[11px] text-ink-muted block pt-0.5">Password Policy: Min. 8 characters with complexity.</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1 pt-1">
              <label className="font-bold text-ink-secondary uppercase text-[11px] block">Password Assignment</label>
              <p className="text-[11px] text-ink-secondary italic">A secure temporary password will be auto-generated for this role.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-ink-secondary uppercase text-[11px]">Role Group</label>
              <select
                value={newRole}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewRole(val);
                  if (val !== 'Customer') {
                    setNewOrg('Assist360 Operations');
                  }
                }}
                className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
              >
                <option value="Customer">Customer Client</option>
                <option value="Consultant">SAP Consultant</option>
                <option value="Manager">SAP Manager</option>
                <option value="SuperAdmin">Super Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-ink-secondary uppercase text-[11px]">Assigned Company</label>
              <select
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                disabled={newRole !== 'Customer'}
                className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="Assist360 Operations">Assist360 Operations</option>
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
              className="px-3 py-1.5 border border-line hover:bg-surface-muted rounded uppercase tracking-wider text-[11px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-ink text-white hover:bg-zinc-800 rounded uppercase tracking-wider text-[11px] cursor-pointer"
            >
              Provision User
            </button>
          </div>
        </form>
      )}

      {/* Users Table List */}
      <TanstackTable
        columns={userColumns}
        data={usersList}
        pageSize={15}
        emptyTitle="No users found"
        emptyDescription="No users match the current filters."
      />


      {/* Unified User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs text-ink">
          <div className="bg-surface border border-line rounded-lg shadow-lg w-full max-w-2xl overflow-hidden flex flex-col h-[550px]">
            {/* Header */}
            <div className="bg-surface-muted border-b border-line px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm uppercase text-ink tracking-wide">
                  IAM Operations: {selectedUser.name}
                </h3>
                <span className="text-[11px] text-ink-muted block mt-0.5 select-all">{selectedUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-6 h-6 border border-line hover:border-line-strong text-ink-secondary hover:text-ink rounded flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab Links */}
            <div className="bg-surface-muted/60 border-b border-line px-6 flex gap-1">
              <button
                type="button"
                onClick={() => { setActiveTab('view'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[11px] tracking-wider transition cursor-pointer ${
                  activeTab === 'view' ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink-secondary'
                }`}
              >
                Diagnostic
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('edit'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[11px] tracking-wider transition cursor-pointer ${
                  activeTab === 'edit' ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink-secondary'
                }`}
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('credentials'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[11px] tracking-wider transition cursor-pointer ${
                  activeTab === 'credentials' ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink-secondary'
                }`}
              >
                Credentials (IAM)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('danger'); setGeneratedPassResult(''); }}
                className={`py-2 px-3 border-b-2 font-bold uppercase text-[11px] tracking-wider transition cursor-pointer ${
                  activeTab === 'danger' ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink-secondary'
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
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-ink-muted border-b border-line pb-1.5">
                    Account Metadata Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-ink-secondary">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase text-ink-muted font-bold block">Setup Status:</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        selectedUser.first_login_completed ? 'bg-success-soft text-success-strong border border-emerald-100' : 'bg-warning-soft text-warning-strong border border-amber-100'
                      }`}>
                        {selectedUser.first_login_completed ? 'Setup Completed' : 'Pending Initial Reset'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase text-ink-muted font-bold block">IAM Lockout Status:</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          selectedUser.is_locked ? 'bg-critical-soft text-red-750 border border-red-100' : 'bg-success-soft text-success-strong border border-emerald-100'
                        }`}>
                          {selectedUser.is_locked ? 'Account Locked' : 'Account Active'}
                        </span>
                        {selectedUser.is_locked && (
                          <button
                            type="button"
                            onClick={() => handleUnlockUser(selectedUser.id, selectedUser.email, selectedUser.active)}
                            className="px-2 py-0.5 border border-line-strong hover:border-line-strong hover:bg-surface-muted rounded text-[11px] font-bold uppercase tracking-wide cursor-pointer"
                          >
                            Unlock Account
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase text-ink-muted font-bold block">Last Password Update:</span>
                      <span className="text-ink text-[11px] font-bold">
                        {selectedUser.password_changed_at ? new Date(selectedUser.password_changed_at).toLocaleString() : 'Never Changed'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase text-ink-muted font-bold block">Account Status:</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        selectedUser.active ? 'bg-success-soft text-success-strong border border-emerald-100' : 'bg-critical-soft text-red-750 border border-red-100'
                      }`}>
                        {selectedUser.active ? 'Access Enabled' : 'Access Disabled'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase text-ink-muted font-bold block">SaaS Identity ID:</span>
                      <span className="text-ink-secondary text-[11px] select-all block mt-0.5">{selectedUser.id}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase text-ink-muted font-bold block">RLS Policy Gate:</span>
                      <span className="font-bold text-ink uppercase text-[11px]">
                        {isSupabaseConfigured ? 'Enforced (Tenant Isolation)' : 'State Simulated'}
                      </span>
                    </div>
                  </div>

                  {selectedUser.role === 'Consultant' && (
                    <div className="space-y-3 pt-3 border-t border-line">
                      <h4 className="font-bold uppercase tracking-wider text-[11px] text-ink-muted">
                        Consultant Expertise Mappings
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] uppercase text-ink-muted font-bold block">Consultant Category:</span>
                          <span className="font-bold text-ink text-[11px] block mt-0.5">{selectedUser.consultant_type || 'Functional'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] uppercase text-ink-muted font-bold block">Assigned SAP Modules:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedUser.sap_modules && selectedUser.sap_modules.length > 0 ? (
                              selectedUser.sap_modules.map((m: string) => (
                                <span key={m} className="bg-surface-subtle border border-line text-ink px-1 rounded text-[11px] font-bold">
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-ink-muted italic">None assigned</span>
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
                    <label className="font-bold text-ink-secondary uppercase text-[11px]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={modalFormName}
                      onChange={(e) => setModalFormName(e.target.value)}
                      className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px]">Contact Phone</label>
                    <input
                      type="text"
                      value={modalFormPhone}
                      onChange={(e) => setModalFormPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-ink-secondary uppercase text-[11px]">Role Group</label>
                      <select
                        value={modalFormRole}
                        onChange={(e) => setModalFormRole(e.target.value)}
                        className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                      >
                        <option value="Customer">Customer Client</option>
                        <option value="Consultant">SAP Consultant</option>
                        <option value="Manager">SAP Manager</option>
                        <option value="SuperAdmin">Super Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-ink-secondary uppercase text-[11px]">Assigned Company (Customers only)</label>
                      <select
                        value={modalFormOrgId}
                        onChange={(e) => setModalFormOrgId(e.target.value)}
                        disabled={modalFormRole !== 'Customer'}
                        className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand disabled:opacity-50"
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
                      className="px-4 py-2 bg-ink text-white hover:bg-zinc-800 rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Update Profile
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Credentials (IAM) */}
              {activeTab === 'credentials' && (
                <div className="space-y-6">
                  
                  {/* Reset Password */}
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 border border-line bg-surface-muted/30 rounded p-4">
                    <h5 className="font-bold uppercase text-[11px] text-ink border-b border-line pb-1.5 flex items-center gap-1">
                      <Lock size={12} className="text-ink-secondary" />
                      Reset Password (Forces Setup on Next Login)
                    </h5>
                    
                    {generatedPassResult && (
                      <div className="bg-ink text-white border border-zinc-900 rounded p-4 text-[11px] font-bold space-y-2">
                        <span className="text-[11px] text-emerald-400 font-normal uppercase block">Password Reset Successful!</span>
                        <div className="flex items-center justify-between gap-2 bg-ink/60 p-2.5 rounded border border-zinc-800">
                          <span className="text-xs tracking-wider select-all font-extrabold text-emerald-400">{generatedPassResult}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPassResult);
                              toast.success('Password copied to clipboard!');
                            }}
                            className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded text-[11px] font-bold uppercase transition"
                          >
                            Copy Pass
                          </button>
                        </div>
                        <span className="text-[11px] text-ink-secondary block font-normal pt-1 leading-normal">
                          Notice: Provide this password to the user. They will be forced to change it immediately upon next login.
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-ink-secondary leading-relaxed">
                      Resets user credentials and redirects them to the force password setup screen on their next login.
                    </p>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-ink text-white hover:bg-zinc-800 rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                      >
                        Reset Password & Force Setup
                      </button>
                    </div>
                  </form>

                  {/* Update Password (Direct) */}
                  <form onSubmit={handleUpdatePasswordSubmit} className="space-y-3.5 border border-line bg-surface-muted/30 rounded p-4">
                    <h5 className="font-bold uppercase text-[11px] text-ink border-b border-line pb-1.5 flex items-center gap-1">
                      <KeyRound size={12} className="text-ink-secondary" />
                      Direct Password Update (No Force Setup)
                    </h5>
                    
                    <div className="space-y-1">
                      <label className="font-bold text-ink-secondary uppercase text-[11px]">Set Manual Password</label>
                      <input
                        type="text"
                        required
                        placeholder="Assign final manual password"
                        value={modalPassInput}
                        onChange={(e) => setModalPassInput(e.target.value)}
                        className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                      />
                      <span className="text-[11px] text-ink-muted block pt-0.5">Password Policy: Min. 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.</span>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 border border-zinc-900 text-ink hover:bg-ink hover:text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                      >
                        Direct Password Save
                      </button>
                    </div>
                  </form>

                  {/* Setup & Lock Adjusters */}
                  <div className="grid grid-cols-2 gap-4 border border-line bg-surface-muted/30 rounded p-4">
                    <div className="space-y-2">
                      <span className="font-bold uppercase text-[11px] text-ink-muted block">Force Setup redirection</span>
                      <button
                        type="button"
                        onClick={() => handleForcePasswordChange(selectedUser.id, selectedUser.email)}
                        className="w-full py-2 bg-ink hover:bg-zinc-800 text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                      >
                        Force Password Change
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold uppercase text-[11px] text-ink-muted block">Lifts failed attempts lockout</span>
                      <button
                        type="button"
                        onClick={() => handleUnlockUser(selectedUser.id, selectedUser.email, selectedUser.active)}
                        className="w-full py-2 border border-line-strong hover:bg-ink hover:text-white rounded text-ink-secondary font-bold uppercase text-[11px] tracking-wider transition cursor-pointer disabled:opacity-50"
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
                  <div className="border border-line bg-surface-muted/30 rounded p-4 space-y-3">
                    <h5 className="text-xs font-bold uppercase text-ink">
                      Enable / Disable Account Access
                    </h5>
                    <p className="text-ink-secondary leading-relaxed text-[11px]">
                      Disabling the account bans the user in Supabase Auth, terminates all active sessions, and blocks logins.
                    </p>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.email, selectedUser.active)}
                        className={`px-4 py-2 rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer ${
                          selectedUser.active ? 'bg-warning-soft border border-amber-300 text-warning-strong hover:bg-amber-100' : 'bg-success-soft border border-emerald-300 text-success-strong hover:bg-emerald-100'
                        }`}
                      >
                        {selectedUser.active ? 'Disable User Access' : 'Enable User Access'}
                      </button>
                    </div>
                  </div>

                  {/* Remove Account Block */}
                  {user?.email !== selectedUser.email && (
                    <div className="border border-critical-border bg-critical-soft/30 rounded p-4 space-y-3">
                      <h5 className="text-xs font-bold uppercase text-red-900">
                        Prune Account Registration
                      </h5>
                      <p className="text-critical-strong/80 leading-relaxed text-[11px]">
                        Warning: This action is irreversible. Permanently deletes the user record from both the database profiles and authentication registry.
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                          className="px-4 py-2 bg-red-650 text-white hover:bg-critical-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
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
      {/* USER CREATED SUCCESSFULLY MODAL */}
      {creationSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs text-ink animate-fade-in">
          <div className="bg-surface border border-line rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="font-bold text-xs uppercase text-emerald-800 tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                User Created Successfully
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] uppercase text-ink-muted font-bold block">Email Address:</span>
                <span className="font-bold text-ink select-all block text-xs bg-surface-muted border border-line rounded px-2.5 py-1.5">{creationSuccessModal.email}</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[11px] uppercase text-ink-muted font-bold block">Temporary Password:</span>
                <span className="text-xs tracking-wider select-all font-extrabold text-ink bg-surface-muted border border-line rounded px-2.5 py-1.5 block">{creationSuccessModal.tempPass}</span>
              </div>
            </div>
            
            <div className="bg-warning-soft border border-warning-border rounded p-3 text-[11px] text-amber-800 leading-normal">
              <span className="font-bold">Important Notice:</span> Provide this temporary password to the user. They will be forced to change it immediately upon their first login to access the workspace.
            </div>
            
            <div className="flex gap-2 justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(creationSuccessModal.tempPass);
                  toast.success('Temporary password copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
              >
                Copy Password
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${creationSuccessModal.email}\nPassword: ${creationSuccessModal.tempPass}`);
                  toast.success('Credentials copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
              >
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => setCreationSuccessModal(null)}
                className="px-3 py-1.5 bg-ink text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md bg-surface border border-line p-6 rounded-lg text-ink text-xs">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Authorize a temporary credentials reset for this user account.
            </DialogDescription>
          </DialogHeader>

          {resetTargetUser && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-3 gap-1 border-b border-line pb-2">
                <span className="font-bold text-ink-muted uppercase text-[11px]">User Name</span>
                <span className="col-span-2 text-ink font-bold">{resetTargetUser.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 border-b border-line pb-2">
                <span className="font-bold text-ink-muted uppercase text-[11px]">User Email</span>
                <span className="col-span-2 text-ink font-bold break-all">{resetTargetUser.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 border-b border-line pb-2">
                <span className="font-bold text-ink-muted uppercase text-[11px]">User Role</span>
                <span className="col-span-2 text-ink font-bold">{resetTargetUser.role}</span>
              </div>

              {!resetDone ? (
                <>
                  <div className="bg-ink text-white rounded p-4 text-[11px] font-bold space-y-2">
                    <span className="text-[11px] text-ink-muted font-normal uppercase block">Auto Generated Temporary Password</span>
                    <div className="flex items-center justify-between gap-2 bg-ink/60 p-2.5 rounded border border-zinc-800">
                      <span className="text-xs tracking-wider select-all font-extrabold text-emerald-400">{resetGeneratedPassword}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Set Manual Temporary Password</label>
                    <input
                      type="text"
                      placeholder="Enter custom temporary password"
                      value={resetManualPassword}
                      onChange={(e) => setResetManualPassword(e.target.value)}
                      className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                    />
                    <span className="text-[11px] text-ink-muted block pt-0.5">Leave empty to use the system-generated password.</span>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = resetManualPassword.trim() || resetGeneratedPassword;
                        navigator.clipboard.writeText(pwd);
                        toast.success('Password copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Copy Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = resetManualPassword.trim() || resetGeneratedPassword;
                        navigator.clipboard.writeText(`Email: ${resetTargetUser.email}\nPassword: ${pwd}`);
                        toast.success('Credentials copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Copy Credentials
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectResetPassword}
                      className="px-3 py-1.5 bg-ink text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetDialogOpen(false)}
                      className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-success-soft border border-emerald-250 text-emerald-900 rounded p-4 text-[11px] font-bold space-y-2">
                    <span className="text-[11px] text-emerald-800 uppercase block">Password Reset Successful!</span>
                    <div className="flex items-center justify-between gap-2 bg-surface p-2.5 rounded border border-success-border">
                      <span className="text-xs tracking-wider select-all font-extrabold text-success-strong">
                        {resetManualPassword.trim() !== '' ? resetManualPassword.trim() : resetGeneratedPassword}
                      </span>
                    </div>
                    <span className="text-[11px] text-success-strong block font-normal pt-1 leading-normal">
                      User must login with this password and create a new password on their next login.
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = resetManualPassword.trim() || resetGeneratedPassword;
                        navigator.clipboard.writeText(pwd);
                        toast.success('Password copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Copy Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = resetManualPassword.trim() || resetGeneratedPassword;
                        navigator.clipboard.writeText(`Email: ${resetTargetUser.email}\nPassword: ${pwd}`);
                        toast.success('Credentials copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Copy Credentials
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetDialogOpen(false)}
                      className="px-3 py-1.5 bg-ink text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Password Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md bg-surface border border-line p-6 rounded-lg text-ink text-xs">
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
            <DialogDescription>
              Directly assign a new password for this user.
            </DialogDescription>
          </DialogHeader>

          {updateTargetUser && (
            <form onSubmit={handleDirectUpdatePassword} className="space-y-4 my-2">
              <div className="space-y-1">
                <label className="font-bold text-ink-secondary uppercase text-[11px] block">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={updateNewPassword}
                  onChange={(e) => setUpdateNewPassword(e.target.value)}
                  className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink-secondary uppercase text-[11px] block">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={updateConfirmPassword}
                  onChange={(e) => setUpdateConfirmPassword(e.target.value)}
                  className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="force-change-checkbox"
                  checked={updateForceChange}
                  onChange={(e) => setUpdateForceChange(e.target.checked)}
                  className="w-4 h-4 text-ink focus:ring-brand/30 border-line-strong rounded cursor-pointer"
                />
                <label htmlFor="force-change-checkbox" className="font-bold text-ink-secondary uppercase text-[11px] cursor-pointer select-none">
                  Force user to change password on next login
                </label>
              </div>

              <span className="text-[11px] text-ink-muted block pt-0.5">Password Policy: Min. 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.</span>

              <div className="flex gap-2 justify-end pt-3 border-t border-line">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-ink text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                >
                  Save Password
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateDialogOpen(false)}
                  className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
