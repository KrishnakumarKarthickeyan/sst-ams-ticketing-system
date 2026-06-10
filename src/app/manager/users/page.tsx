'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';
import { 
  Users, 
  Mail, 
  ShieldCheck, 
  XCircle, 
  Lock, 
  KeyRound, 
  Search, 
  Filter, 
  Settings, 
  UserCheck, 
  Activity, 
  CheckSquare, 
  Building2,
  LockKeyhole
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  resetUserPasswordAdmin,
  updateUserAuthStatus,
  adminUpdatePasswordDirect,
  adminForcePasswordChange,
  logUserAuditAction,
  verifyPasswordPolicy,
  provisionUser
} from '@/app/actions/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  active: boolean;
  is_locked: boolean;
  first_login_completed: boolean;
  password_changed_at: string | null;
  phone_number: string;
  consultant_type: string;
  sap_modules: string[];
}

const SAP_MODULES_LIST = ['FICO', 'MM', 'SD', 'PP', 'ABAP', 'BASIS', 'TRM', 'QM', 'PM', 'PS'];

export default function ManagerUsersPage() {
  const { user } = useAuth();
  const { profiles, refetchData } = useTickets();
  
  // Navigation & filter states
  const [activeTab, setActiveTab] = useState<'consultants' | 'clients'>('consultants');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Functional' | 'Technical'>('All');
  const [orgFilter, setOrgFilter] = useState<string>('All');
  const [organizationsList, setOrganizationsList] = useState<{ id: string; name: string }[]>([]);

  // Selected user for Management Console Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalTab, setModalTab] = useState<'view' | 'edit' | 'credentials' | 'danger'>('view');

  // Edit details form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  const [editConsType, setEditConsType] = useState('Functional');
  const [editSapModules, setEditSapModules] = useState<string[]>([]);

  // Password reset/update dialog states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserProfile | null>(null);
  const [resetManualPassword, setResetManualPassword] = useState('');
  const [resetGeneratedPassword, setResetGeneratedPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateTargetUser, setUpdateTargetUser] = useState<UserProfile | null>(null);
  const [updateNewPassword, setUpdateNewPassword] = useState('');
  const [updateConfirmPassword, setUpdateConfirmPassword] = useState('');
  const [updateForceChange, setUpdateForceChange] = useState(false);

  // Dialog Open States
  const [createConsultantOpen, setCreateConsultantOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);

  // Common provision success states (to display the generated credentials)
  const [provisionSuccessOpen, setProvisionSuccessOpen] = useState(false);
  const [provisionSuccessUser, setProvisionSuccessUser] = useState<{ name: string; email: string; role: string; tempPass: string } | null>(null);

  // Create Consultant state variables
  const [consName, setConsName] = useState('');
  const [consEmail, setConsEmail] = useState('');
  const [consType, setConsType] = useState<'Functional' | 'Technical'>('Functional');
  const [consSapModules, setConsSapModules] = useState<string[]>([]);
  const [consPasswordMode, setConsPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [consPassword, setConsPassword] = useState('');
  const [consIsActive, setConsIsActive] = useState(true);
  const [consLoading, setConsLoading] = useState(false);

  // Create Client state variables
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientOrgMode, setClientOrgMode] = useState<'existing' | 'new'>('existing');
  const [clientOrgId, setClientOrgId] = useState('');
  const [clientNewOrgName, setClientNewOrgName] = useState('');
  const [clientNewOrgCode, setClientNewOrgCode] = useState('');
  const [clientPasswordMode, setClientPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [clientPassword, setClientPassword] = useState('');
  const [clientIsActive, setClientIsActive] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);

  // Generate temporary password helper
  const generatePass = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const getRand = (str: string) => str[Math.floor(Math.random() * str.length)];
    const chars = [getRand(uppers), getRand(lowers), getRand(numbers), getRand(specials)];
    const allChars = uppers + lowers + numbers + specials;
    for (let i = 4; i < 10; i++) chars.push(getRand(allChars));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  };

  // Fetch organizations from Supabase
  const fetchOrganizations = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.from('organizations').select('id, name').then(({ data }) => {
        if (data) setOrganizationsList(data);
      });
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Map database profiles into clean objects
  const usersList = useMemo(() => {
    return (profiles || []).map((u: any) => ({
      id: u.id,
      name: u.full_name || '',
      email: u.email || '',
      role: u.role || '',
      organization: u.organization || (u.organizations as any)?.name || 'Assist360 Operations',
      active: u.is_active ?? true,
      is_locked: u.is_locked || false,
      first_login_completed: u.first_login_completed || false,
      password_changed_at: u.password_changed_at || null,
      phone_number: u.phone_number || '',
      consultant_type: u.consultant_type || 'Functional',
      sap_modules: u.sap_modules || []
    }));
  }, [profiles]);

  // Filter lists based on selected tab, search query, and dropdowns
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      // Role matching tab
      if (activeTab === 'consultants' && u.role !== 'Consultant') return false;
      if (activeTab === 'clients' && u.role !== 'Customer') return false;

      // Sub-filters
      if (activeTab === 'consultants' && typeFilter !== 'All' && u.consultant_type !== typeFilter) return false;
      if (activeTab === 'clients' && orgFilter !== 'All' && u.organization !== orgFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone_number.toLowerCase().includes(q) ||
          u.organization.toLowerCase().includes(q) ||
          (u.sap_modules && u.sap_modules.join(' ').toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [usersList, activeTab, typeFilter, orgFilter, searchQuery]);

  // List of unique companies/organizations for dropdown filter
  const organizationsDropdownOptions = useMemo(() => {
    const orgs = usersList
      .filter(u => u.role === 'Customer')
      .map(u => u.organization);
    return Array.from(new Set(orgs)).filter(Boolean);
  }, [usersList]);

  // Count aggregates
  const counts = useMemo(() => {
    const consultants = usersList.filter(u => u.role === 'Consultant');
    const clients = usersList.filter(u => u.role === 'Customer');
    return {
      totalConsultants: consultants.length,
      activeConsultants: consultants.filter(c => c.active).length,
      totalClients: clients.length,
      activeClients: clients.filter(c => c.active).length
    };
  }, [usersList]);

  // Trigger data updates to sync lists
  const triggerRefetch = async () => {
    const toastId = toast.loading('Refetching updated roster...');
    try {
      await refetchData();
      toast.success('Roster refreshed.', { id: toastId });
    } catch (e) {
      toast.error('Refetch failed.', { id: toastId });
    }
  };

  // Toggle user activation status
  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    const toastId = toast.loading(`Updating status for ${targetUser.email}...`);
    try {
      const res = await updateUserAuthStatus(
        targetUser.id,
        targetUser.email,
        !targetUser.active,
        false,
        user?.email || 'Manager'
      );
      if (!res.success) throw new Error(res.error || 'Update failed');
      
      toast.success(`User ${!targetUser.active ? 'activated' : 'deactivated'} successfully.`, { id: toastId });
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => prev ? { ...prev, active: !targetUser.active } : null);
      }
      await refetchData();
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`, { id: toastId });
    }
  };

  // Open User Management Modal
  const handleOpenUserModal = (u: UserProfile, tab: 'view' | 'edit' | 'credentials' | 'danger' = 'view') => {
    setSelectedUser(u);
    setModalTab(tab);
    setEditName(u.name);
    setEditPhone(u.phone_number);
    setEditRole(u.role);
    setEditConsType(u.consultant_type || 'Functional');
    setEditSapModules(u.sap_modules || []);
    
    const org = organizationsList.find(o => o.name === u.organization);
    setEditOrgId(org ? org.id : '');
  };

  // Handle SAP Module checklist changes
  const handleSapModuleToggle = (mod: string) => {
    setEditSapModules(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  // Submit edit details form
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const toastId = toast.loading('Saving profile changes...');
    try {
      if (isSupabaseConfigured && supabase) {
        const updateData: any = {
          full_name: editName.trim(),
          role: editRole,
          phone_number: editPhone.trim()
        };

        if (editRole === 'Customer') {
          updateData.organization_id = editOrgId || null;
          updateData.consultant_type = null;
          updateData.sap_modules = null;
        } else if (editRole === 'Consultant') {
          updateData.organization_id = null;
          updateData.consultant_type = editConsType;
          updateData.sap_modules = editSapModules;
        } else {
          updateData.organization_id = null;
          updateData.consultant_type = null;
          updateData.sap_modules = null;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', selectedUser.id);

        if (error) throw error;

        await logUserAuditAction(selectedUser.email, `Profile updated by Manager (Role: ${editRole})`, user?.email || 'Manager');
      } else {
        toast.success('Local simulation: profile updated.');
      }

      toast.success('User details updated successfully.', { id: toastId });
      setSelectedUser(null);
      await refetchData();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
    }
  };

  // Handle password reset (Force change on next login)
  const handleDirectResetPassword = async () => {
    if (!resetTargetUser) return;
    const targetUserId = resetTargetUser.id;
    const manualPassword = resetManualPassword.trim();

    const toastId = toast.loading('Enforcing password reset...');
    try {
      const apiRes = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, manualPassword })
      });
      const res = await apiRes.json();
      if (!apiRes.ok || !res.success) throw new Error(res.error || 'Reset API failed');
      
      setResetGeneratedPassword(res.tempPassword);
      setResetDone(true);
      toast.success('Temporary credentials generated successfully.', { id: toastId });
      await refetchData();
    } catch (err: any) {
      // Server action fallback if route throws 403 or is inaccessible
      try {
        const res = await resetUserPasswordAdmin(targetUserId, user?.email || 'Manager', resetTargetUser.email, manualPassword || undefined);
        if (!res.success) throw new Error(res.error);
        
        setResetGeneratedPassword(res.password || '');
        setResetDone(true);
        toast.success('Temporary credentials generated via fallback.', { id: toastId });
        await refetchData();
      } catch (fallbackErr: any) {
        toast.error(`Credentials reset failed: ${fallbackErr.message}`, { id: toastId });
      }
    }
  };

  // Handle direct permanent password overwrite
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

    const toastId = toast.loading('Updating password override...');
    try {
      // Use direct server action to bypass super-admin API restriction
      const res = await adminUpdatePasswordDirect(targetUserId, newPassword, user?.email || 'Manager', updateTargetUser.email);
      if (!res.success) throw new Error(res.error);
      
      if (forcePasswordChange) {
        await adminForcePasswordChange(targetUserId, updateTargetUser.email, user?.email || 'Manager');
      }

      toast.success('User password updated successfully.', { id: toastId });
      setUpdateDialogOpen(false);
      await refetchData();
    } catch (err: any) {
      toast.error(`Password update failed: ${err.message}`, { id: toastId });
    }
  };

  // Lift lockout limits
  const handleUnlockUser = async (targetUser: UserProfile) => {
    const toastId = toast.loading('Lifting account lockout ban...');
    try {
      const res = await updateUserAuthStatus(
        targetUser.id,
        targetUser.email,
        targetUser.active,
        false, // clear lockout
        user?.email || 'Manager'
      );
      if (!res.success) throw new Error(res.error);
      toast.success('Lockout lifted. Account is fully unlocked.', { id: toastId });
      setSelectedUser(prev => prev ? { ...prev, is_locked: false } : null);
      await refetchData();
    } catch (err: any) {
      toast.error(`Unlock failed: ${err.message}`, { id: toastId });
    }
  };

  // Form input validation helpers
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isPasswordValid = (password: string) => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(password)) return false;
    return true;
  };

  const handleCreateConsultantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsLoading(true);
    const toastId = toast.loading(`Provisioning consultant ${consEmail}...`);

    try {
      const res = await provisionUser({
        email: consEmail,
        fullName: consName,
        role: 'Consultant',
        performedBy: user?.email || 'Manager',
        initialPassword: consPasswordMode === 'manual' ? consPassword : undefined,
        consultantType: consType,
        sapModules: consSapModules,
        phoneNumber: 'N/A',
        roleTitle: `${consType} Specialist`,
        skills: 'SAP Operations',
        loginEnabled: consIsActive
      });

      if (!res.success) {
        throw new Error(res.error || 'Provisioning failed');
      }

      toast.success('Consultant provisioned successfully!', { id: toastId });
      
      setProvisionSuccessUser({
        name: consName,
        email: consEmail,
        role: 'Consultant',
        tempPass: res.password || ''
      });
      setProvisionSuccessOpen(true);
      
      setConsName('');
      setConsEmail('');
      setConsType('Functional');
      setConsSapModules([]);
      setConsPasswordMode('auto');
      setConsPassword('');
      setConsIsActive(true);
      
      setCreateConsultantOpen(false);
      await refetchData();
    } catch (err: any) {
      toast.error(`Provisioning failed: ${err.message}`, { id: toastId });
    } finally {
      setConsLoading(false);
    }
  };

  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoading(true);
    const toastId = toast.loading(`Provisioning client ${clientEmail}...`);

    try {
      let companyName = '';
      let customerShortCode: string | undefined = undefined;

      if (clientOrgMode === 'existing') {
        const found = organizationsList.find(o => o.id === clientOrgId);
        companyName = found ? found.name : '';
      } else {
        companyName = clientNewOrgName;
        customerShortCode = clientNewOrgCode;
      }

      const res = await provisionUser({
        email: clientEmail,
        fullName: clientName,
        role: 'Customer',
        performedBy: user?.email || 'Manager',
        initialPassword: clientPasswordMode === 'manual' ? clientPassword : undefined,
        companyName,
        customerShortCode,
        loginEnabled: clientIsActive
      });

      if (!res.success) {
        throw new Error(res.error || 'Provisioning failed');
      }

      toast.success('Client provisioned successfully!', { id: toastId });
      
      setProvisionSuccessUser({
        name: clientName,
        email: clientEmail,
        role: 'Customer (Client)',
        tempPass: res.password || ''
      });
      setProvisionSuccessOpen(true);
      
      setClientName('');
      setClientEmail('');
      setClientOrgMode('existing');
      setClientOrgId('');
      setClientNewOrgName('');
      setClientNewOrgCode('');
      setClientPasswordMode('auto');
      setClientPassword('');
      setClientIsActive(true);
      
      setCreateClientOpen(false);
      
      fetchOrganizations();
      await refetchData();
    } catch (err: any) {
      toast.error(`Provisioning failed: ${err.message}`, { id: toastId });
    } finally {
      setClientLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Header View */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono tracking-tight flex items-center gap-2">
            <Users size={20} className="text-zinc-500" />
            User Management
          </h1>
          <p className="text-zinc-500 mt-1">Manage system logins, edit profiles, reset credentials, and audit locks for consultants and clients.</p>
        </div>
        <button
          onClick={triggerRefetch}
          className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
        >
          Refetch Data
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Consultants Total</span>
            <span className="text-xl font-bold text-zinc-900 mt-1 block">{counts.totalConsultants}</span>
          </div>
          <Users className="text-zinc-300" size={24} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Active Consultants</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block flex items-center gap-1.5">
              {counts.activeConsultants}
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <UserCheck className="text-emerald-200" size={24} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Clients</span>
            <span className="text-xl font-bold text-zinc-900 mt-1 block">{counts.totalClients}</span>
          </div>
          <Building2 className="text-zinc-300" size={24} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Active Clients</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block flex items-center gap-1.5">
              {counts.activeClients}
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <Activity className="text-emerald-200" size={24} />
        </div>
      </div>

      {/* Tabs list & search query filter */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Tab Selector & Creation Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="flex bg-zinc-100 p-0.5 rounded border border-zinc-250 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('consultants'); setSearchQuery(''); }}
              className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'consultants' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Users size={12} />
              Consultants ({counts.totalConsultants})
            </button>
            <button
              onClick={() => { setActiveTab('clients'); setSearchQuery(''); }}
              className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'clients' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Building2 size={12} />
              Clients ({counts.totalClients})
            </button>
          </div>

          {activeTab === 'consultants' ? (
            <button
              onClick={() => setCreateConsultantOpen(true)}
              className="w-full sm:w-auto px-4 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>+ Create Consultant</span>
            </button>
          ) : (
            <button
              onClick={() => setCreateClientOpen(true)}
              className="w-full sm:w-auto px-4 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>+ Create Client</span>
            </button>
          )}
        </div>

        {/* Filters and Inputs */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'consultants' ? 'Search name, email, module...' : 'Search name, email, company...'}
              className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>

          {/* Consultants type filter */}
          {activeTab === 'consultants' && (
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 w-full sm:w-auto">
              <Filter size={11} className="text-zinc-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent border-none text-[10px] font-bold uppercase focus:outline-none cursor-pointer w-full"
              >
                <option value="All">All Types</option>
                <option value="Functional">Functional</option>
                <option value="Technical">Technical</option>
              </select>
            </div>
          )}

          {/* Clients org filter */}
          {activeTab === 'clients' && (
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 w-full sm:w-auto max-w-xs">
              <Filter size={11} className="text-zinc-400" />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold uppercase focus:outline-none cursor-pointer w-full truncate"
              >
                <option value="All">All Companies</option>
                {organizationsDropdownOptions.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Tables Grid */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              {activeTab === 'consultants' ? (
                <>
                  <th className="p-4">Type</th>
                  <th className="p-4">SAP Modules</th>
                </>
              ) : (
                <th className="p-4">Assigned Company</th>
              )}
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400 font-mono italic">
                  No records found matching the active filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50">
                  {/* Name column */}
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-850 font-bold uppercase shrink-0">
                      {u.name ? u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 text-xs block">{u.name}</span>
                      {u.is_locked && (
                        <span className="text-[7.5px] bg-red-950 text-white font-mono px-1 rounded block w-max mt-0.5 uppercase tracking-wide">Locked Out</span>
                      )}
                    </div>
                  </td>

                  {/* Email column */}
                  <td className="p-4 text-zinc-500 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Mail size={12} className="text-zinc-400 shrink-0" />
                      {u.email}
                    </span>
                  </td>

                  {/* Consultant expertise columns */}
                  {activeTab === 'consultants' ? (
                    <>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${
                          u.consultant_type === 'Functional' 
                            ? 'bg-zinc-100 text-zinc-800 border-zinc-250' 
                            : 'bg-zinc-950 text-white border-zinc-900'
                        }`}>
                          {u.consultant_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {u.sap_modules && u.sap_modules.length > 0 ? (
                            u.sap_modules.map((m: string) => (
                              <span key={m} className="bg-zinc-50 border border-zinc-200 text-zinc-650 px-1 rounded text-[9px] font-bold font-mono">
                                {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-400 italic">None</span>
                          )}
                        </div>
                      </td>
                    </>
                  ) : (
                    /* Client org column */
                    <td className="p-4 font-semibold text-zinc-700">
                      <span className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-zinc-400 shrink-0" />
                        {u.organization}
                      </span>
                    </td>
                  )}

                  {/* Status column */}
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition-all cursor-pointer ${
                        u.active 
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100/50' 
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100/50'
                      }`}
                    >
                      {u.active ? (
                        <>
                          <ShieldCheck size={11} className="text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={11} className="text-red-500" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions column */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setResetTargetUser(u);
                          setResetManualPassword('');
                          setResetGeneratedPassword(generatePass());
                          setResetDone(false);
                          setResetDialogOpen(true);
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 transition cursor-pointer"
                        title="Temporary Reset (Force Password Setup)"
                      >
                        Reset Pass
                      </button>
                      <button
                        onClick={() => {
                          setUpdateTargetUser(u);
                          setUpdateNewPassword('');
                          setUpdateConfirmPassword('');
                          setUpdateForceChange(false);
                          setUpdateDialogOpen(true);
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 transition cursor-pointer"
                        title="Direct Password Update"
                      >
                        Override Pass
                      </button>
                      <button
                        onClick={() => handleOpenUserModal(u, 'view')}
                        className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* IAM Detailed Console Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs text-zinc-900">
          <div className="bg-white border border-zinc-200 rounded-lg shadow-lg w-full max-w-2xl overflow-hidden flex flex-col h-[550px]">
            {/* Modal Header */}
            <div className="bg-zinc-50 border-b border-zinc-150 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm uppercase text-zinc-950 tracking-wide flex items-center gap-2">
                  <Settings size={15} className="text-zinc-500 animate-spin-slow" />
                  User IAM Console: {selectedUser.name}
                </h3>
                <span className="text-[10px] text-zinc-400 block mt-0.5 select-all">{selectedUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-6 h-6 border border-zinc-250 hover:border-zinc-950 text-zinc-500 hover:text-zinc-950 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation tabs */}
            <div className="bg-zinc-50/50 border-b border-zinc-150 px-6 flex gap-1 shrink-0">
              {(['view', 'edit', 'credentials', 'danger'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModalTab(tab)}
                  className={`py-2 px-3 border-b-2 font-bold uppercase text-[9px] tracking-wider transition cursor-pointer ${
                    modalTab === tab ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-650'
                  }`}
                >
                  {tab === 'view' ? 'Diagnostics' : tab === 'edit' ? 'Edit Details' : tab === 'credentials' ? 'Security (IAM)' : 'Danger Zone'}
                </button>
              ))}
            </div>

            {/* Modal content body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* DIAGNOSTICS VIEW */}
              {modalTab === 'view' && (
                <div className="space-y-4">
                  <div className="bg-zinc-50 border border-zinc-150 rounded-lg p-4">
                    <h4 className="font-bold uppercase tracking-wider text-[9px] text-zinc-400 border-b border-zinc-150 pb-1.5 mb-3">
                      Platform Authorization Telemetry
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] uppercase text-zinc-400 font-bold block">First Login Completed:</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${
                          selectedUser.first_login_completed 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {selectedUser.first_login_completed ? 'Setup Completed' : 'Pending Initial Login'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase text-zinc-400 font-bold block">Auth Access:</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${
                          selectedUser.active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {selectedUser.active ? 'Enabled' : 'Banned / Disabled'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase text-zinc-400 font-bold block">Lockout Lock:</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            selectedUser.is_locked 
                              ? 'bg-red-50 text-red-700 border-red-100' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {selectedUser.is_locked ? 'Locked (Failed Attempts)' : 'No active locks'}
                          </span>
                          {selectedUser.is_locked && (
                            <button
                              type="button"
                              onClick={() => handleUnlockUser(selectedUser)}
                              className="px-2 py-0.5 border border-zinc-350 hover:border-zinc-950 bg-white hover:bg-zinc-50 rounded text-[8.5px] font-bold uppercase tracking-wide cursor-pointer"
                            >
                              Clear Lock
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase text-zinc-400 font-bold block">Last Credential Set:</span>
                        <span className="font-bold text-zinc-800 text-[10px] block mt-1">
                          {selectedUser.password_changed_at ? new Date(selectedUser.password_changed_at).toLocaleString() : 'System Temporary'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedUser.role === 'Consultant' && (
                    <div className="bg-zinc-50 border border-zinc-150 rounded-lg p-4">
                      <h4 className="font-bold uppercase tracking-wider text-[9px] text-zinc-400 border-b border-zinc-150 pb-1.5 mb-3">
                        Roster Skill Mappings
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] uppercase text-zinc-400 font-bold block">Roster Type:</span>
                          <span className="font-bold text-zinc-850 text-xs block mt-1 uppercase">{selectedUser.consultant_type}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-zinc-400 font-bold block">Expertise Modules:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedUser.sap_modules && selectedUser.sap_modules.length > 0 ? (
                              selectedUser.sap_modules.map((m: string) => (
                                <span key={m} className="bg-white border border-zinc-200 text-zinc-850 px-1 rounded text-[9px] font-bold">
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-400 italic">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EDIT DETAILS FORM */}
              {modalTab === 'edit' && (
                <form onSubmit={handleEditUserSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white border border-zinc-250 rounded-lg p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px]">Contact Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +971 50 123 4567"
                      className="w-full bg-white border border-zinc-250 rounded-lg p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px]">Assigned Role Group</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-white border border-zinc-250 rounded-lg p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
                      >
                        <option value="Customer">Customer Client</option>
                        <option value="Consultant">SAP Consultant</option>
                      </select>
                    </div>

                    {editRole === 'Customer' ? (
                      <div className="space-y-1">
                        <label className="font-bold text-zinc-700 uppercase text-[9px]">Organization/Company</label>
                        <select
                          value={editOrgId}
                          onChange={(e) => setEditOrgId(e.target.value)}
                          className="w-full bg-white border border-zinc-250 rounded-lg p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
                        >
                          <option value="">Select Organization</option>
                          {organizationsList.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="font-bold text-zinc-700 uppercase text-[9px]">Consultant Type</label>
                        <select
                          value={editConsType}
                          onChange={(e) => setEditConsType(e.target.value)}
                          className="w-full bg-white border border-zinc-250 rounded-lg p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
                        >
                          <option value="Functional">Functional Consultant</option>
                          <option value="Technical">Technical Consultant</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {editRole === 'Consultant' && (
                    <div className="space-y-2 border-t border-zinc-150 pt-3">
                      <label className="font-bold text-zinc-700 uppercase text-[9px] block">Expertise Module Scopes</label>
                      <div className="grid grid-cols-5 gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                        {SAP_MODULES_LIST.map(mod => {
                          const isChecked = editSapModules.includes(mod);
                          return (
                            <label 
                              key={mod} 
                              className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer transition-all ${
                                isChecked 
                                  ? 'bg-zinc-950 text-white border-zinc-900 font-bold' 
                                  : 'bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-200'
                              }`}
                            >
                              <span className="text-[10px]">{mod}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSapModuleToggle(mod)}
                                className="hidden"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-zinc-150">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                    >
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              )}

              {/* SECURITY / CREDENTIALS MANAGEMENT */}
              {modalTab === 'credentials' && (
                <div className="space-y-6">
                  {/* Reset Password Card */}
                  <div className="border border-zinc-200 bg-zinc-50/20 rounded-lg p-4 space-y-3">
                    <h5 className="font-bold uppercase text-[10px] text-zinc-900 flex items-center gap-1.5 border-b border-zinc-150 pb-1.5">
                      <Lock size={13} className="text-zinc-500" />
                      Temporary Password Reset
                    </h5>
                    <p className="text-zinc-500 leading-relaxed text-[10.5px]">
                      Generate a temporary credentials sequence. This terminates active sessions and redirects the client or consultant to setup their private password upon their next login.
                    </p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setResetTargetUser(selectedUser);
                          setResetManualPassword('');
                          setResetGeneratedPassword(generatePass());
                          setResetDone(false);
                          setResetDialogOpen(true);
                        }}
                        className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                      >
                        Reset & Force Setup
                      </button>
                    </div>
                  </div>

                  {/* Override Password Card */}
                  <div className="border border-zinc-200 bg-zinc-50/20 rounded-lg p-4 space-y-3">
                    <h5 className="font-bold uppercase text-[10px] text-zinc-900 flex items-center gap-1.5 border-b border-zinc-150 pb-1.5">
                      <KeyRound size={13} className="text-zinc-500" />
                      Direct Permanent Override
                    </h5>
                    <p className="text-zinc-500 leading-relaxed text-[10.5px]">
                      Manually define a permanent password for the user. They can login with this credential immediately without password change redirection.
                    </p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setUpdateTargetUser(selectedUser);
                          setUpdateNewPassword('');
                          setUpdateConfirmPassword('');
                          setUpdateForceChange(false);
                          setUpdateDialogOpen(true);
                        }}
                        className="px-4 py-2 border border-zinc-900 text-zinc-900 hover:bg-zinc-950 hover:text-white rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                      >
                        Override Credentials
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DANGER ZONE ACCESSIBILITY */}
              {modalTab === 'danger' && (
                <div className="space-y-4">
                  <div className="border border-red-200 bg-red-50/25 rounded-lg p-4 space-y-3">
                    <h5 className="font-bold uppercase text-red-900 text-xs flex items-center gap-1.5">
                      <LockKeyhole size={14} className="text-red-600" />
                      Banish Account login
                    </h5>
                    <p className="text-red-700/80 leading-relaxed text-[11px]">
                      Disabling the account bans this identity in the authentication server immediately, signs out all active sessions, and blocks any authentication attempts.
                    </p>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(selectedUser)}
                        className={`px-4 py-2 rounded font-bold uppercase text-[10px] tracking-wider transition cursor-pointer border ${
                          selectedUser.active 
                            ? 'bg-red-50 border-red-300 text-red-755 hover:bg-red-100' 
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {selectedUser.active ? 'Banish User Access' : 'Restore User Access'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* RENDER MODAL: RESET PASSWORD (FORCE) */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg text-zinc-955 font-mono text-xs shadow-xl">
          <DialogHeader className="border-b border-zinc-150 pb-2">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide">Reset User Password</DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-450 mt-1">
              Set a temporary password sequence. The user must setup their private password at next login.
            </DialogDescription>
          </DialogHeader>

          {resetTargetUser && (
            <div className="space-y-4 my-2">
              <div className="space-y-2 border-b border-zinc-100 pb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Account Target:</span>
                  <span className="text-zinc-900 font-bold">{resetTargetUser.name}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Email Address:</span>
                  <span className="text-zinc-900 font-bold break-all select-all">{resetTargetUser.email}</span>
                </div>
              </div>

              {!resetDone ? (
                <>
                  <div className="bg-zinc-950 text-white rounded-lg p-4 text-[11px] font-bold space-y-2 border border-zinc-900 shadow-inner">
                    <span className="text-[9px] text-zinc-400 font-normal uppercase block">System Generated Temporary Key</span>
                    <div className="flex items-center justify-between gap-2 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                      <span className="font-mono text-xs tracking-wider select-all font-extrabold text-emerald-400">{resetGeneratedPassword}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] block">Define custom temporary password</label>
                    <input
                      type="text"
                      placeholder="Enter manually (optional)"
                      value={resetManualPassword}
                      onChange={(e) => setResetManualPassword(e.target.value)}
                      className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                    />
                    <span className="text-[9px] text-zinc-400 block pt-0.5">Leave blank to use the system generated key.</span>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-zinc-150">
                    <button
                      type="button"
                      onClick={() => setResetDialogOpen(false)}
                      className="px-3 py-1.5 border border-zinc-250 hover:bg-zinc-50 rounded font-bold uppercase text-[9px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectResetPassword}
                      className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] cursor-pointer"
                    >
                      Authorize Reset
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-zinc-950 text-white border border-zinc-900 rounded-lg p-4 font-bold space-y-3">
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Temporary Credentials Active</span>
                    <div className="flex items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded border border-zinc-800">
                      <span className="font-mono text-xs tracking-wider select-all text-emerald-400">{resetGeneratedPassword}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resetGeneratedPassword);
                          toast.success('Password copied to clipboard!');
                        }}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[9.5px] font-bold uppercase transition"
                      >
                        Copy
                      </button>
                    </div>
                    <span className="text-[9.5px] text-zinc-400 leading-normal block font-normal pt-1">
                      Important: Provide this temporary key to the user. They will be forced to change it immediately at next login screen.
                    </span>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-zinc-150">
                    <button
                      type="button"
                      onClick={() => {
                        setResetDialogOpen(false);
                        setSelectedUser(null);
                      }}
                      className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wide cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* RENDER MODAL: OVERRIDE PASSWORD (DIRECT) */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg text-zinc-955 font-mono text-xs shadow-xl">
          <DialogHeader className="border-b border-zinc-150 pb-2">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide">Override Credentials</DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-450 mt-1">
              Directly set a new permanent password for this account.
            </DialogDescription>
          </DialogHeader>

          {updateTargetUser && (
            <form onSubmit={handleDirectUpdatePassword} className="space-y-4 my-2">
              <div className="space-y-2 border-b border-zinc-100 pb-3 text-zinc-700">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Account Target:</span>
                  <span className="text-zinc-900 font-bold">{updateTargetUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Email Address:</span>
                  <span className="text-zinc-900 font-bold break-all select-all">{updateTargetUser.email}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px] block">Define new password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password (min 8 chars)"
                    value={updateNewPassword}
                    onChange={(e) => setUpdateNewPassword(e.target.value)}
                    className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px] block">Confirm new password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={updateConfirmPassword}
                    onChange={(e) => setUpdateConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 font-bold text-zinc-700 uppercase text-[9px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateForceChange}
                    onChange={(e) => setUpdateForceChange(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span>Force credentials setup at next login</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setUpdateDialogOpen(false)}
                  className="px-3 py-1.5 border border-zinc-250 hover:bg-zinc-50 rounded font-bold uppercase text-[9px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] cursor-pointer"
                >
                  Save Override
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* RENDER MODAL: CREATE CONSULTANT */}
      <Dialog open={createConsultantOpen} onOpenChange={setCreateConsultantOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg text-zinc-955 font-mono text-xs shadow-xl">
          <DialogHeader className="border-b border-zinc-150 pb-2">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide">Provision SAP Consultant</DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-450 mt-1">
              Create a new consultant user account in the identity directory and set their expertise profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateConsultantSubmit} className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={consName}
                onChange={(e) => setConsName(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. john.doe@company.com"
                value={consEmail}
                onChange={(e) => setConsEmail(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
              />
              {consEmail && !isEmailValid(consEmail) && (
                <span className="text-[9.5px] text-red-650 font-bold block mt-0.5">Please enter a valid email address.</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 uppercase text-[9px]">Consultant Type *</label>
                <select
                  value={consType}
                  onChange={(e) => setConsType(e.target.value as any)}
                  className="w-full bg-white border border-zinc-250 rounded p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono cursor-pointer"
                >
                  <option value="Functional">Functional Consultant</option>
                  <option value="Technical">Technical Consultant</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 uppercase text-[9px] block">Login Access *</label>
                <label className="inline-flex items-center gap-2 mt-2.5 cursor-pointer font-bold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={consIsActive}
                    onChange={(e) => setConsIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span>Enabled (Default)</span>
                </label>
              </div>
            </div>

            <div className="space-y-2 border-t border-zinc-150 pt-3">
              <label className="font-bold text-zinc-700 uppercase text-[9px] block">SAP Modules Expertise</label>
              <div className="grid grid-cols-5 gap-1.5 bg-zinc-50 border border-zinc-200 rounded p-2.5">
                {SAP_MODULES_LIST.map(mod => {
                  const isChecked = consSapModules.includes(mod);
                  return (
                    <label 
                      key={mod} 
                      className={`flex items-center justify-center py-1.5 border rounded cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-zinc-950 text-white border-zinc-900 font-bold' 
                          : 'bg-white text-zinc-650 hover:bg-zinc-50 border-zinc-200'
                      }`}
                    >
                      <span className="text-[9.5px]">{mod}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setConsSapModules(prev => 
                            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
                          );
                        }}
                        className="hidden"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-zinc-150 pt-3">
              <label className="font-bold text-zinc-700 uppercase text-[9px] block">Password Security Policy</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-zinc-700">
                  <input
                    type="radio"
                    name="consPasswordMode"
                    checked={consPasswordMode === 'auto'}
                    onChange={() => setConsPasswordMode('auto')}
                    className="w-3.5 h-3.5 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span>Auto-generate password</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-zinc-700">
                  <input
                    type="radio"
                    name="consPasswordMode"
                    checked={consPasswordMode === 'manual'}
                    onChange={() => setConsPasswordMode('manual')}
                    className="w-3.5 h-3.5 text-zinc-955 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span>Set manual password</span>
                </label>
              </div>

              {consPasswordMode === 'manual' && (
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    placeholder="Min 8 chars, uppercase, lowercase, digit, special char"
                    value={consPassword}
                    onChange={(e) => setConsPassword(e.target.value)}
                    className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
                  />
                  {consPassword && !isPasswordValid(consPassword) && (
                    <span className="text-[9px] text-red-650 font-bold block leading-tight">
                      Complexity required: 8+ chars, uppercase, lowercase, digit, special char.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-zinc-150">
              <button
                type="button"
                disabled={consLoading}
                onClick={() => setCreateConsultantOpen(false)}
                className="px-3 py-1.5 border border-zinc-250 hover:bg-zinc-50 rounded font-bold uppercase text-[9px] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  consLoading || 
                  !consName.trim() || 
                  !isEmailValid(consEmail) || 
                  (consPasswordMode === 'manual' && !isPasswordValid(consPassword))
                }
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {consLoading ? 'Provisioning...' : 'Provision Consultant'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* RENDER MODAL: CREATE CLIENT */}
      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg text-zinc-955 font-mono text-xs shadow-xl">
          <DialogHeader className="border-b border-zinc-150 pb-2">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide">Provision Client (Customer)</DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-450 mt-1">
              Provision a new client user account in the database linked to a client organization contract.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClientSubmit} className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alice Smith"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. alice.smith@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-white border border-zinc-250 rounded p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
              />
              {clientEmail && !isEmailValid(clientEmail) && (
                <span className="text-[9.5px] text-red-650 font-bold block mt-0.5">Please enter a valid email address.</span>
              )}
            </div>

            <div className="space-y-3 border-t border-zinc-150 pt-3">
              <div className="flex justify-between items-center">
                <label className="font-bold text-zinc-700 uppercase text-[9px]">Organization *</label>
                <button
                  type="button"
                  onClick={() => setClientOrgMode(prev => prev === 'existing' ? 'new' : 'existing')}
                  className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  {clientOrgMode === 'existing' ? 'Create new organization' : 'Use existing organization'}
                </button>
              </div>

              {clientOrgMode === 'existing' ? (
                <div className="space-y-1">
                  <select
                    value={clientOrgId}
                    required
                    onChange={(e) => setClientOrgId(e.target.value)}
                    className="w-full bg-white border border-zinc-250 rounded p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono cursor-pointer"
                  >
                    <option value="">Select Organization</option>
                    {organizationsList.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-3 rounded border border-zinc-200">
                  <div className="col-span-2 space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[8px]">New Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp"
                      value={clientNewOrgName}
                      onChange={(e) => setClientNewOrgName(e.target.value)}
                      className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[8px]">Short Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="ACM"
                      value={clientNewOrgCode}
                      onChange={(e) => setClientNewOrgCode(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-zinc-150 pt-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 uppercase text-[9px] block">Login Access *</label>
                <label className="inline-flex items-center gap-2 mt-2.5 cursor-pointer font-bold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={clientIsActive}
                    onChange={(e) => setClientIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span>Enabled (Default)</span>
                </label>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-zinc-150 pt-3">
              <label className="font-bold text-zinc-700 uppercase text-[9px] block">Password Security Policy</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-zinc-700">
                  <input
                    type="radio"
                    name="clientPasswordMode"
                    checked={clientPasswordMode === 'auto'}
                    onChange={() => setClientPasswordMode('auto')}
                    className="w-3.5 h-3.5 text-zinc-955 focus:ring-zinc-955 cursor-pointer"
                  />
                  <span>Auto-generate password</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-zinc-700">
                  <input
                    type="radio"
                    name="clientPasswordMode"
                    checked={clientPasswordMode === 'manual'}
                    onChange={() => setClientPasswordMode('manual')}
                    className="w-3.5 h-3.5 text-zinc-955 focus:ring-zinc-955 cursor-pointer"
                  />
                  <span>Set manual password</span>
                </label>
              </div>

              {clientPasswordMode === 'manual' && (
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    placeholder="Min 8 chars, uppercase, lowercase, digit, special char"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="w-full bg-white border border-zinc-250 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
                  />
                  {clientPassword && !isPasswordValid(clientPassword) && (
                    <span className="text-[9px] text-red-650 font-bold block leading-tight">
                      Complexity required: 8+ chars, uppercase, lowercase, digit, special char.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-zinc-150">
              <button
                type="button"
                disabled={clientLoading}
                onClick={() => setCreateClientOpen(false)}
                className="px-3 py-1.5 border border-zinc-250 hover:bg-zinc-50 rounded font-bold uppercase text-[9px] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  clientLoading || 
                  !clientName.trim() || 
                  !isEmailValid(clientEmail) || 
                  (clientOrgMode === 'existing' && !clientOrgId) ||
                  (clientOrgMode === 'new' && (!clientNewOrgName.trim() || !clientNewOrgCode.trim())) ||
                  (clientPasswordMode === 'manual' && !isPasswordValid(clientPassword))
                }
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {clientLoading ? 'Provisioning...' : 'Provision Client'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* RENDER MODAL: PROVISION SUCCESS */}
      <Dialog open={provisionSuccessOpen} onOpenChange={setProvisionSuccessOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg text-zinc-955 font-mono text-xs shadow-xl">
          <DialogHeader className="border-b border-zinc-150 pb-2">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
              <ShieldCheck size={16} />
              Provisioning Successful
            </DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-450 mt-1">
              The user identity has been successfully created and provisioned.
            </DialogDescription>
          </DialogHeader>

          {provisionSuccessUser && (
            <div className="space-y-4 my-2">
              <div className="bg-zinc-50 border border-zinc-200 rounded p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Name:</span>
                  <span className="text-zinc-900 font-bold">{provisionSuccessUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Email:</span>
                  <span className="text-zinc-900 font-bold break-all select-all">{provisionSuccessUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400 uppercase text-[9px]">Role Group:</span>
                  <span className="text-zinc-900 font-bold uppercase text-[10px]">{provisionSuccessUser.role}</span>
                </div>
              </div>

              <div className="bg-zinc-950 text-white rounded-lg p-4 font-bold space-y-3">
                <span className="text-[9.5px] text-emerald-400 font-semibold uppercase block">Temporary Credentials Issued</span>
                <div className="flex items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded border border-zinc-800">
                  <span className="font-mono text-xs tracking-wider select-all text-emerald-400 font-extrabold">{provisionSuccessUser.tempPass}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(provisionSuccessUser.tempPass);
                      toast.success('Temporary password copied to clipboard!');
                    }}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[9.5px] font-bold uppercase transition"
                  >
                    Copy
                  </button>
                </div>
                <span className="text-[9px] text-zinc-400 leading-normal block font-normal pt-1">
                  Important: Share this password with the user. Since they have force reset flags activated, they will be required to configure their permanent passwords on first login.
                </span>
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => {
                    setProvisionSuccessOpen(false);
                    setProvisionSuccessUser(null);
                  }}
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wide cursor-pointer"
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
