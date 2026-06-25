'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { CreateConsultantDialog } from '@/components/users/CreateConsultantDialog';
import { CreateClientDialog } from '@/components/users/CreateClientDialog';

// Actions
import {
  provisionUser,
  updateUserAuthStatus,
  deleteAuthUser,
  logUserAuditAction,
  resetUserPasswordAdmin,
  updateUserRoster
} from '@/app/actions/auth';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Icons
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  FileText,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Lock,
  Calendar,
  Layers,
  Clock,
  Briefcase
} from 'lucide-react';

const SAP_MODULES_LIST = ['FICO', 'MM', 'SD', 'PP', 'ABAP', 'BASIS', 'TRM', 'QM', 'PM', 'PS', 'HCM', 'CPI'];

export default function UserManagementPage() {
  const { user } = useAuth();
  const { profiles, tickets, contracts, loading, refetchData } = useTickets();

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'consultants' | 'clients'>('consultants');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Functional' | 'Technical'>('All');
  const [orgFilter, setOrgFilter] = useState<string>('All');
  const [organizationsList, setOrganizationsList] = useState<{ id: string; name: string; customer_short_code: string | null; domain: string | null }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog State Managers
  const [createConsultantOpen, setCreateConsultantOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [deactivateAlertOpen, setDeactivateAlertOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [provisionSuccessOpen, setProvisionSuccessOpen] = useState(false);

  // Selected entities for updates/deletes/contracts
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteGuardStatus, setDeleteGuardStatus] = useState<{ loading: boolean; blocked: boolean; reason: string }>({
    loading: false,
    blocked: false,
    reason: ''
  });

  // Success credentials display
  const [provisionSuccessUser, setProvisionSuccessUser] = useState<{ name: string; email: string; role: string; tempPass: string } | null>(null);

  // --- STAGE 2: Create Consultant Form States ---
  const [consName, setConsName] = useState('');
  const [consEmail, setConsEmail] = useState('');
  const [consPhone, setConsPhone] = useState('');
  const [consType, setConsType] = useState<'Functional' | 'Technical'>('Functional');
  const [consSpecialization, setConsSpecialization] = useState('');
  const [consSapModules, setConsSapModules] = useState<string[]>([]);
  const [consStaffId, setConsStaffId] = useState('');
  const [consIsActive, setConsIsActive] = useState(true);
  const [consPasswordMode, setConsPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [consPassword, setConsPassword] = useState('');
  const [consConfirmPassword, setConsConfirmPassword] = useState('');
  const [consEmailError, setConsEmailError] = useState('');
  const [consPasswordError, setConsPasswordError] = useState('');
  const [consLoading, setConsLoading] = useState(false);

  // --- STAGE 3: Create Client Form States ---
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDesignation, setClientDesignation] = useState('');
  const [clientOrgMode, setClientOrgMode] = useState<'existing' | 'new'>('existing');
  const [clientOrgId, setClientOrgId] = useState('');
  const [clientNewOrgName, setClientNewOrgName] = useState('');
  const [clientNewOrgCode, setClientNewOrgCode] = useState('');
  const [clientNewOrgDomain, setClientNewOrgDomain] = useState('');
  const [clientIsActive, setClientIsActive] = useState(true);
  const [clientPasswordMode, setClientPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [clientPassword, setClientPassword] = useState('');
  const [clientConfirmPassword, setClientConfirmPassword] = useState('');
  const [clientEmailError, setClientEmailError] = useState('');
  const [clientPasswordError, setClientPasswordError] = useState('');
  const [clientLoading, setClientLoading] = useState(false);

  // Section B Contract parameters
  const [clientContractType, setClientContractType] = useState('AMS');
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');
  const [clientMonthlyHours, setClientMonthlyHours] = useState('0');
  const [clientAnnualHours, setClientAnnualHours] = useState('0');
  const [clientContractStatus, setClientContractStatus] = useState('Active');

  // --- STAGE 4: Edit Form States ---
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editConsType, setEditConsType] = useState<'Functional' | 'Technical'>('Functional');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editSapModules, setEditSapModules] = useState<string[]>([]);
  const [editStaffId, setEditStaffId] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  
  // Edit Contract parameters (for Client edit)
  const [editContractType, setEditContractType] = useState('AMS');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editMonthlyHours, setEditMonthlyHours] = useState('0');
  const [editAnnualHours, setEditAnnualHours] = useState('0');
  const [editContractStatus, setEditContractStatus] = useState('Active');
  const [editLoading, setEditLoading] = useState(false);

  // Contract Details View States
  const [viewContractEditMode, setViewContractEditMode] = useState(false);
  const [cViewContractType, setCViewContractType] = useState('AMS');
  const [cViewStartDate, setCViewStartDate] = useState('');
  const [cViewEndDate, setCViewEndDate] = useState('');
  const [cViewMonthlyHours, setCViewMonthlyHours] = useState('0');
  const [cViewAnnualHours, setCViewAnnualHours] = useState('0');
  const [cViewContractStatus, setCViewContractStatus] = useState('Active');
  const [cViewLoading, setCViewLoading] = useState(false);

  // Show/Hide password toggle
  const [showPassword, setShowPassword] = useState(false);

  // Fetch Organizations list
  const fetchOrgs = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('organizations').select('id, name, customer_short_code, domain');
      if (error) {
        console.error('Failed to fetch orgs:', error);
      } else if (data) {
        setOrganizationsList(data);
      }
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchData();
      await fetchOrgs();
      toast.success('User records refreshed');
    } catch (e: unknown) {
      toast.error('Failed to refresh data: ' + getErrorMessage(e));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper validation functions
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  
  const isPasswordValid = (p: string) => {
    return p.length >= 12 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(p);
  };

  const checkEmailUniqueness = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (error) return true; 
      return !data; // returns true if unique
    }
    return true;
  };

  // Calculate contract duration in months
  const computeDurationInMonths = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    const diffYears = endDate.getFullYear() - startDate.getFullYear();
    const diffMonths = endDate.getMonth() - startDate.getMonth();
    const totalMonths = (diffYears * 12) + diffMonths;
    return Math.max(0, totalMonths);
  };

  // Process profiles
  const processedUsers = useMemo(() => {
    return (profiles || []).map((u: any) => {
      const org = organizationsList.find(o => o.id === u.organization_id);
      const orgName = org ? org.name : (u.organization || 'SST SAP Operations');
      const customerShortCode = org ? org.customer_short_code : null;

      // Active tickets
      const activeTicketsCount = (tickets || []).filter((t: any) => 
        t.status !== 'Closed' &&
        t.status !== 'Resolved' &&
        (t.assignedConsultantId === u.id || t.primaryConsultantId === u.id || t.assignedConsultant === u.full_name)
      ).length;

      // Open client tickets
      const openClientTicketsCount = (tickets || []).filter((t: any) => 
        t.organizationId === u.organization_id &&
        t.status !== 'Closed' &&
        t.status !== 'Resolved'
      ).length;

      // Consultant Utilization %
      const approvedLogs = (tickets || []).flatMap((t: any) => t.actualHoursLogs || [])
        .filter((ah: any) => ah.consultantId === u.id && ah.approvalStatus?.toLowerCase() === 'approved');
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const monthlyLogged = approvedLogs
        .filter((ah: any) => {
          const appDate = new Date(ah.approvedAt || ah.createdAt || now);
          return appDate.getFullYear() === currentYear && appDate.getMonth() === currentMonth;
        })
        .reduce((sum: number, ah: any) => sum + Number(ah.actualHours || 0), 0);

      const capacity = Number(u.monthly_capacity_hours || 160);
      const utilizationPercent = capacity > 0 ? Math.round((monthlyLogged / capacity) * 100) : 0;

      // Resolve Active Contract
      const activeContract = (contracts || []).find((c: any) => 
        c.customerId === u.organization_id &&
        c.status === 'Active'
      );

      let contractExpiryDays: number | null = null;
      if (activeContract && activeContract.endDate) {
        const end = new Date(activeContract.endDate);
        const diff = end.getTime() - now.getTime();
        contractExpiryDays = Math.ceil(diff / (1000 * 3600 * 24));
      }

      return {
        id: u.id,
        fullName: u.full_name || 'Unnamed User',
        email: u.email || '',
        role: u.role || 'Customer',
        isActive: u.is_active ?? true,
        phone: u.phone_number || '',
        consultantType: u.consultant_type || 'Functional',
        sapModules: u.sap_modules || [],
        employeeId: u.employee_id || '',
        specialization: u.specialization || '',
        organizationId: u.organization_id,
        organizationName: orgName,
        customerShortCode,
        activeTicketsCount,
        openClientTicketsCount,
        utilizationPercent,
        activeContract,
        contractExpiryDays
      };
    });
  }, [profiles, tickets, contracts, organizationsList]);

  // Filter lists
  const filteredUsers = useMemo(() => {
    return processedUsers.filter(u => {
      if (activeTab === 'consultants' && u.role !== 'Consultant') return false;
      if (activeTab === 'clients' && u.role !== 'Customer') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone.toLowerCase().includes(q);
        const matchesOrg = u.organizationName.toLowerCase().includes(q);
        const matchesModules = u.sapModules.some((m: string) => m.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesOrg && !matchesModules) return false;
      }

      if (statusFilter === 'Active' && !u.isActive) return false;
      if (statusFilter === 'Inactive' && u.isActive) return false;

      if (activeTab === 'consultants' && typeFilter !== 'All' && u.consultantType !== typeFilter) return false;
      if (activeTab === 'clients' && orgFilter !== 'All' && u.organizationName !== orgFilter) return false;

      return true;
    });
  }, [processedUsers, activeTab, searchQuery, statusFilter, typeFilter, orgFilter]);

  const uniqueOrgsDropdown = useMemo(() => {
    const list = processedUsers
      .filter(u => u.role === 'Customer')
      .map(u => u.organizationName);
    return Array.from(new Set(list)).filter(Boolean).sort();
  }, [processedUsers]);

  // Trigger Edit modal prep
  const handleOpenEditUser = (u: any) => {
    setSelectedUser(u);
    setEditName(u.fullName);
    setEditEmail(u.email);
    setEditPhone(u.phone);
    setEditDesignation(u.role === 'Customer' ? u.employeeId : ''); // designation or role title
    setEditConsType(u.consultantType);
    setEditSpecialization(u.specialization);
    setEditSapModules(u.sapModules);
    setEditStaffId(u.employeeId);
    setEditOrgId(u.organizationId || '');
    setEditIsActive(u.isActive);

    // Pre-fill contract if client
    if (u.role === 'Customer' && u.activeContract) {
      setEditContractType(u.activeContract.contractType);
      setEditStartDate(u.activeContract.startDate || '');
      setEditEndDate(u.activeContract.endDate || '');
      setEditMonthlyHours(String(u.activeContract.monthlyBudgetHours || 0));
      setEditAnnualHours(String(u.activeContract.totalHours || 0));
      setEditContractStatus(u.activeContract.status || 'Active');
    } else {
      setEditContractType('AMS');
      setEditStartDate('');
      setEditEndDate('');
      setEditMonthlyHours('0');
      setEditAnnualHours('0');
      setEditContractStatus('Active');
    }

    setEditUserOpen(true);
  };

  // Submit Edit Details (Stage 4)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setEditLoading(true);
    const toastId = toast.loading('Updating user profile...');

    try {
      const res = await updateUserRoster({
        userId: selectedUser.id,
        fullName: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: selectedUser.role,
        phone: editPhone.trim() || undefined,
        isActive: editIsActive,
        performedBy: user?.email || 'Manager',
        // Consultant
        consultantType: editConsType,
        specialization: editSpecialization.trim() || undefined,
        sapModules: editSapModules,
        employeeId: editStaffId.trim() || undefined,
        // Customer
        organizationId: editOrgId || undefined,
        designation: editDesignation.trim() || undefined,
        // Contract details
        contractType: editContractType,
        contractStartDate: editStartDate || undefined,
        contractEndDate: editEndDate || undefined,
        monthlyAllocatedHours: Number(editMonthlyHours) || 0,
        contractHours: Number(editAnnualHours) || 0,
        contractStatus: editContractStatus
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update user roster.');
      }

      toast.success('User updated successfully', { id: toastId });
      setEditUserOpen(false);
      await refetchData();
      await fetchOrgs();
    } catch (err: unknown) {
      toast.error('Failed to update user: ' + getErrorMessage(err), { id: toastId });
    } finally {
      setEditLoading(false);
    }
  };

  // Reset Password action inside edit
  const handleResetPasswordInEdit = async () => {
    if (!selectedUser) return;
    const toastId = toast.loading('Resetting password & enforcing first login reset...');
    try {
      const res = await resetUserPasswordAdmin(selectedUser.id, user?.email || 'Manager', selectedUser.email);
      if (!res.success) throw new Error(res.error);
      
      toast.success('Temporary password generated', { id: toastId });
      setProvisionSuccessUser({
        name: selectedUser.fullName,
        email: selectedUser.email,
        role: selectedUser.role,
        tempPass: res.password || ''
      });
      setProvisionSuccessOpen(true);
      setEditUserOpen(false);
    } catch (err: unknown) {
      toast.error('Reset failed: ' + getErrorMessage(err), { id: toastId });
    }
  };

  // Toggle Activation (Soft deactivation dialog check)
  const handleOpenDeactivateToggle = (u: any) => {
    setSelectedUser(u);
    setDeactivateAlertOpen(true);
  };

  const executeToggleActivation = async () => {
    if (!selectedUser) return;
    const toastId = toast.loading(`${selectedUser.isActive ? 'Deactivating' : 'Activating'} user...`);
    try {
      const res = await updateUserAuthStatus(
        selectedUser.id,
        selectedUser.email,
        !selectedUser.isActive,
        false,
        user?.email || 'Manager'
      );
      if (!res.success) throw new Error(res.error || 'Server error occurred');
      
      toast.success(`User ${!selectedUser.isActive ? 'activated' : 'deactivated'} successfully`, { id: toastId });
      setDeactivateAlertOpen(false);
      await refetchData();
    } catch (err: unknown) {
      toast.error('Activation update failed: ' + getErrorMessage(err), { id: toastId });
    }
  };

  // Delete guard check (Stage 4c)
  const checkUserLinkedRecords = async (userId: string, role: string, orgId: string | null) => {
    if (!isSupabaseConfigured || !supabase) return { count: 0, reason: '' };

    // 1. Check tickets assigned to or created by
    const { data: ticketsCount, error: ticketErr } = await supabase
      .from('tickets')
      .select('id')
      .or(`assigned_consultant_id.eq.${userId},requested_by.eq.${userId},created_by_user.eq.${userId},primary_consultant_id.eq.${userId},lead_consultant_id.eq.${userId}`)
      .limit(1);

    if (ticketErr) throw ticketErr;
    if (ticketsCount && ticketsCount.length > 0) {
      return { count: 1, reason: 'user is assigned to or has raised tickets' };
    }

    // 2. Check ticket efforts logged
    const { data: effortsCount, error: effortErr } = await supabase
      .from('ticket_efforts')
      .select('id')
      .eq('consultant_id', userId)
      .limit(1);

    if (effortErr) throw effortErr;
    if (effortsCount && effortsCount.length > 0) {
      return { count: 1, reason: 'user has logged efforts' };
    }

    // 3. Check ticket actual hours
    const { data: actualHoursCount, error: ahErr } = await supabase
      .from('ticket_actual_hours')
      .select('id')
      .eq('consultant_id', userId)
      .limit(1);

    if (ahErr) throw ahErr;
    if (actualHoursCount && actualHoursCount.length > 0) {
      return { count: 1, reason: 'user has approved actual hours records' };
    }

    // 4. Check closure requests
    const { data: closuresCount, error: closureErr } = await supabase
      .from('ticket_closure_requests')
      .select('id')
      .or(`requested_by.eq.${userId},primary_consultant_id.eq.${userId}`)
      .limit(1);

    if (closureErr) throw closureErr;
    if (closuresCount && closuresCount.length > 0) {
      return { count: 1, reason: 'user has closure requests' };
    }

    // 5. If Customer, check if org has contracts (if they are the only client)
    if (role === 'Customer' && orgId) {
      const { data: otherClients, error: otherErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', orgId)
        .neq('id', userId)
        .limit(1);
      
      if (otherErr) throw otherErr;
      if (!otherClients || otherClients.length === 0) {
        const { data: contractsCount, error: contractErr } = await supabase
          .from('customer_contracts')
          .select('id')
          .eq('organization_id', orgId)
          .limit(1);
        if (contractErr) throw contractErr;
        if (contractsCount && contractsCount.length > 0) {
          return { count: 1, reason: 'user is the sole client for an organization with active contracts' };
        }
      }
    }

    return { count: 0, reason: '' };
  };

  const handleOpenDeleteDialog = async (u: any) => {
    setSelectedUser(u);
    setDeleteAlertOpen(true);
    setDeleteGuardStatus({ loading: true, blocked: false, reason: '' });

    try {
      const check = await checkUserLinkedRecords(u.id, u.role, u.organizationId);
      if (check.count > 0) {
        setDeleteGuardStatus({ loading: false, blocked: true, reason: check.reason });
      } else {
        setDeleteGuardStatus({ loading: false, blocked: false, reason: '' });
      }
    } catch (e: unknown) {
      setDeleteGuardStatus({ loading: false, blocked: true, reason: 'Failed to verify linked records status.' });
    }
  };

  const executeHardDelete = async () => {
    if (!selectedUser) return;
    if (user?.role !== 'SuperAdmin') {
      toast.error('Hard delete is restricted to SuperAdministrators.');
      return;
    }

    const toastId = toast.loading('Executing guarded hard delete...');
    try {
      // 1. Delete Auth user (Admin API handles it, which cascades delete profiles row in DB)
      const res = await deleteAuthUser(selectedUser.id);
      if (!res.success) throw new Error(res.error || 'Auth service error');

      // 2. Delete Profile DB row manually if not cascaded
      if (isSupabaseConfigured && supabase) {
        await supabase.from('profiles').delete().eq('id', selectedUser.id);
      }

      await logUserAuditAction(selectedUser.email, `User hard deleted by SuperAdmin`, user?.email || 'Admin');
      toast.success('User permanently deleted', { id: toastId });
      setDeleteAlertOpen(false);
      await refetchData();
    } catch (err: unknown) {
      toast.error('Deletion failed: ' + getErrorMessage(err), { id: toastId });
    }
  };

  // Open Contract Dialog Overlay (Stage 4d)
  const handleOpenContractDialog = (u: any) => {
    setSelectedUser(u);
    setViewContractEditMode(false);
    
    if (u.activeContract) {
      setCViewContractType(u.activeContract.contractType);
      setCViewStartDate(u.activeContract.startDate || '');
      setCViewEndDate(u.activeContract.endDate || '');
      setCViewMonthlyHours(String(u.activeContract.monthlyBudgetHours || 0));
      setCViewAnnualHours(String(u.activeContract.totalHours || 0));
      setCViewContractStatus(u.activeContract.status || 'Active');
    } else {
      setCViewContractType('AMS');
      setCViewStartDate('');
      setCViewEndDate('');
      setCViewMonthlyHours('0');
      setCViewAnnualHours('0');
      setCViewContractStatus('Active');
    }

    setContractDialogOpen(true);
  };

  const handleUpdateContractFromView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !isSupabaseConfigured || !supabase) return;

    setCViewLoading(true);
    const toastId = toast.loading('Updating contract terms...');

    try {
      // Verify dates
      if (!cViewStartDate || !cViewEndDate) {
        throw new Error('Dates are required.');
      }
      if (new Date(cViewEndDate) <= new Date(cViewStartDate)) {
        throw new Error('End date must be after start date.');
      }

      // Populate both families of columns
      const contractPayload = {
        organization_id: selectedUser.organizationId,
        customer_id: selectedUser.organizationId,
        contract_type: cViewContractType,
        start_date: cViewStartDate,
        contract_start_date: cViewStartDate,
        end_date: cViewEndDate,
        contract_end_date: cViewEndDate,
        monthly_budget_hours: Number(cViewMonthlyHours),
        monthly_allocated_hours: Number(cViewMonthlyHours),
        total_hours: Number(cViewAnnualHours),
        total_contract_hours: Number(cViewAnnualHours),
        status: cViewContractStatus,
        is_active: cViewContractStatus === 'Active'
      };

      let contractId = selectedUser.activeContract?.id;

      if (contractId) {
        const { error } = await supabase
          .from('customer_contracts')
          .update(contractPayload)
          .eq('id', contractId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('customer_contracts')
          .insert(contractPayload)
          .select('id')
          .single();
        if (error) throw error;
        contractId = data.id;
      }

      if (cViewContractStatus === 'Active' && contractId) {
        const { error: expireErr } = await supabase
          .from('customer_contracts')
          .update({ status: 'Expired', is_active: false })
          .eq('organization_id', selectedUser.organizationId)
          .eq('status', 'Active')
          .neq('id', contractId);
        if (expireErr) {
          console.warn('Failed to expire older contracts:', expireErr.message);
        }
      }

      toast.success('Contract details updated successfully', { id: toastId });
      setViewContractEditMode(false);
      setContractDialogOpen(false);
      await refetchData();
    } catch (err: unknown) {
      toast.error('Failed to update contract: ' + getErrorMessage(err), { id: toastId });
    } finally {
      setCViewLoading(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto p-6 md:p-8 space-y-6">
      
      {/* 1a. Header Title, Subtitle, and Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
        <div className="space-y-1">
          <h1 className="type-title text-ink">User Management</h1>
          <p className="text-sm text-ink-secondary">Create and manage consultants and clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 bg-ink text-white hover:bg-zinc-800">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-surface border border-line shadow-md">
              <DropdownMenuItem onClick={() => setCreateConsultantOpen(true)} className="cursor-pointer font-bold text-xs uppercase p-2.5">
                New Consultant
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateClientOpen(true)} className="cursor-pointer font-bold text-xs uppercase p-2.5">
                New Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 1b. shadcn Tabs */}
      <Tabs
        defaultValue="consultants"
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as any);
          setSearchQuery('');
          setStatusFilter('All');
          setTypeFilter('All');
          setOrgFilter('All');
        }}
        className="w-full space-y-6"
      >
        <TabsList className="bg-surface-subtle/80 p-1 rounded-lg border border-line/50 inline-flex w-full sm:w-auto">
          <TabsTrigger
            value="consultants"
            className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card text-ink-secondary hover:text-ink"
          >
            Consultants
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card text-ink-secondary hover:text-ink"
          >
            Clients
          </TabsTrigger>
        </TabsList>

        {/* Consultants Tab */}
        <TabsContent value="consultants" className="space-y-4 outline-none">
          
          {/* Tab Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface border border-line rounded-lg p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted h-4 w-4" />
                <Input
                  placeholder="Search name, email, module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-surface border border-line rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-9 w-full sm:w-36 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-surface border border-line rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-9 w-full sm:w-36 cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Functional">Functional</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-ink-secondary md:ml-auto">
              {filteredUsers.length} users
            </div>
          </div>

          {/* Consultants Table */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4">Name</TableHead>
                  <TableHead className="py-3 px-4">Type</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4">Active Tickets</TableHead>
                  <TableHead className="py-3 px-4">Utilization %</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-8" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-3 px-4 text-center h-48">
                      <div className="flex flex-col items-center justify-center space-y-2 text-ink-muted">
                        <User className="h-8 w-8 stroke-1" />
                        <span className="text-sm font-semibold">No consultants yet.</span>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreateConsultantOpen(true)}>
                          Add Consultant
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-line">
                            <AvatarFallback className="bg-surface-subtle text-ink font-semibold text-xs">
                              {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-ink truncate">{u.fullName}</span>
                            <span className="text-[11px] text-ink-secondary truncate">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge variant={u.consultantType === 'Technical' ? 'outline' : 'secondary'} className="text-[11px] font-bold">
                          {u.consultantType}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge variant={u.isActive ? 'success' : 'warning'} className="text-[11px] font-bold">
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-ink-secondary">
                        {u.activeTicketsCount}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-secondary">{u.utilizationPercent}%</span>
                          <div className="w-16 bg-surface-subtle rounded-full h-1.5 overflow-hidden hidden sm:block border border-line">
                            <div
                              className={`h-full ${u.utilizationPercent >= 90 ? 'bg-red-500' : u.utilizationPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(u.utilizationPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border border-line shadow-md w-36">
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => handleOpenEditUser(u)}>
                              <Edit className="h-3.5 w-3.5 text-ink-secondary" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => handleOpenDeactivateToggle(u)}>
                              {u.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 text-ink-secondary" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 text-ink-secondary" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2 text-critical focus:text-critical focus:bg-red-50" onClick={() => handleOpenDeleteDialog(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4 outline-none">
          
          {/* Tab Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface border border-line rounded-lg p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted h-4 w-4" />
                <Input
                  placeholder="Search name, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-surface border border-line rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-9 w-full sm:w-36 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="bg-surface border border-line rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-9 w-full sm:w-48 cursor-pointer truncate"
                >
                  <option value="All">All Companies</option>
                  {uniqueOrgsDropdown.map(orgName => (
                    <option key={orgName} value={orgName}>{orgName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-ink-secondary md:ml-auto">
              {filteredUsers.length} users
            </div>
          </div>

          {/* Clients Table */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4">Name</TableHead>
                  <TableHead className="py-3 px-4">Organization</TableHead>
                  <TableHead className="py-3 px-4">Contract</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4">Open Tickets</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="py-3 px-4"><Skeleton className="h-5 w-8" /></TableCell>
                      <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-3 px-4 text-center h-48">
                      <div className="flex flex-col items-center justify-center space-y-2 text-ink-muted">
                        <Building className="h-8 w-8 stroke-1" />
                        <span className="text-sm font-semibold">No clients yet.</span>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreateClientOpen(true)}>
                          Add Client
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-line">
                            <AvatarFallback className="bg-surface-subtle text-ink font-semibold text-xs">
                              {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-ink truncate">{u.fullName}</span>
                            <span className="text-[11px] text-ink-secondary truncate">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-ink font-semibold">{u.organizationName}</span>
                          {u.customerShortCode && (
                            <span className="text-[11px] text-ink-muted font-bold uppercase">{u.customerShortCode}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {u.activeContract ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="success" className="text-[11px] font-bold w-max">
                              {u.activeContract.contractType}
                            </Badge>
                            {u.contractExpiryDays !== null && (
                              <span className={`text-[11px] font-medium ${u.contractExpiryDays < 30 ? 'text-warning font-semibold animate-pulse' : 'text-ink-secondary'}`}>
                                {u.contractExpiryDays <= 0 ? 'Expired' : `expires in ${u.contractExpiryDays}d`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-muted italic text-[11px]">No active contract</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge variant={u.isActive ? 'success' : 'warning'} className="text-[11px] font-bold">
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-ink-secondary">
                        {u.openClientTicketsCount}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border border-line shadow-md w-36">
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => handleOpenEditUser(u)}>
                              <Edit className="h-3.5 w-3.5 text-ink-secondary" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => handleOpenContractDialog(u)}>
                              <FileText className="h-3.5 w-3.5 text-ink-secondary" />
                              Contract
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => handleOpenDeactivateToggle(u)}>
                              {u.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 text-ink-secondary" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 text-ink-secondary" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2 text-critical focus:text-critical focus:bg-red-50" onClick={() => handleOpenDeleteDialog(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Consultant + Create Client — shared dialogs (also used by SuperAdmin) */}
      <CreateConsultantDialog open={createConsultantOpen} onOpenChange={setCreateConsultantOpen} performedBy={user?.email} onCreated={refetchData} />
      <CreateClientDialog open={createClientOpen} onOpenChange={setCreateClientOpen} performedBy={user?.email} onCreated={refetchData} />

      {/* --- STAGE 4a: EDIT USER DIALOG (CONSULTANT / CLIENT) --- */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-lg bg-surface p-6 rounded-lg text-ink border border-line shadow-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-ink">
              Edit {selectedUser?.role === 'Consultant' ? 'Consultant' : 'Client'}
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary mt-1">
              Modify profiles, roles, and contract configurations.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Alice Smith"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                />
              </div>

              {/* Email (Read-only for Manager, editable for SuperAdmin) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Email Address</label>
                <Input
                  type="email"
                  disabled={user?.role !== 'SuperAdmin'}
                  placeholder="e.g. alice@company.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 text-xs disabled:opacity-60 bg-surface-muted focus-visible:ring-1 focus-visible:ring-brand/30"
                />
                {user?.role !== 'SuperAdmin' && (
                  <p className="text-[11px] text-ink-muted">Email modification is restricted to SuperAdministrators.</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Phone Number</label>
                <Input
                  placeholder="e.g. +971 50 123 4567"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                />
              </div>

              {/* --- Consultant Profile Fields --- */}
              {selectedUser.role === 'Consultant' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-ink">Consultant Type *</label>
                      <select
                        value={editConsType}
                        onChange={(e) => setEditConsType(e.target.value as any)}
                        className="bg-surface border border-line rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-9 w-full cursor-pointer"
                      >
                        <option value="Functional">Functional Consultant</option>
                        <option value="Technical">Technical Consultant</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-ink">Staff / Employee ID</label>
                      <Input
                        placeholder="e.g. EMP-9021"
                        value={editStaffId}
                        onChange={(e) => setEditStaffId(e.target.value)}
                        className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-ink">Specialization / Focus</label>
                    <Input
                      placeholder="e.g. SAP S/4HANA Finance, Logistics, ABAP OO"
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                    />
                  </div>

                  <div className="space-y-2 border-t border-line pt-3">
                    <label className="text-sm font-medium text-ink block">SAP Modules Scope</label>
                    <div className="grid grid-cols-4 gap-1.5 bg-surface-muted border border-line rounded p-2.5">
                      {SAP_MODULES_LIST.map(mod => {
                        const isChecked = editSapModules.includes(mod);
                        return (
                          <label 
                            key={mod} 
                            className={`flex items-center justify-center py-1.5 border rounded cursor-pointer transition-all ${
                              isChecked 
                                ? 'bg-ink text-white border-zinc-900 font-bold' 
                                : 'bg-surface text-ink-secondary hover:bg-surface-muted border-line'
                            }`}
                          >
                            <span className="text-[11px] font-bold">{mod}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setEditSapModules(prev => 
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
                </>
              )}

              {/* --- Client Profile & Contract Fields --- */}
              {selectedUser.role === 'Customer' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-ink">Organization / Company *</label>
                      <select
                        value={editOrgId}
                        required
                        onChange={(e) => setEditOrgId(e.target.value)}
                        className="bg-surface border border-line rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-9 w-full cursor-pointer animate-none"
                      >
                        <option value="">Select Organization</option>
                        {organizationsList.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-ink">Job Title / Designation</label>
                      <Input
                        placeholder="e.g. IT Director, SAP Lead"
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                        className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-brand/30"
                      />
                    </div>
                  </div>

                  {/* Contract details edit subform */}
                  <div className="space-y-4 border-t border-line pt-4 bg-surface-muted/60 p-3.5 rounded-lg border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary border-b border-line pb-1.5 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Contract Details
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-ink-secondary">Project / SLA Type</label>
                        <select
                          value={editContractType}
                          onChange={(e) => setEditContractType(e.target.value)}
                          className="bg-surface border border-line rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-8 w-full cursor-pointer"
                        >
                          <option value="AMS">AMS</option>
                          <option value="Implementation Support">Implementation</option>
                          <option value="Rollout Support">Rollout</option>
                          <option value="Migration Support">Migration</option>
                          <option value="Upgrade Support">Upgrade</option>
                          <option value="Hypercare Support">Hypercare</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-ink-secondary">Contract Status</label>
                        <select
                          value={editContractStatus}
                          onChange={(e) => setEditContractStatus(e.target.value)}
                          className="bg-surface border border-line rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-8 w-full cursor-pointer"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Expired">Expired</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-ink-secondary">Start Date</label>
                        <Input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-ink-secondary">End Date</label>
                        <Input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-ink-secondary">Monthly Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editMonthlyHours}
                          onChange={(e) => setEditMonthlyHours(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-ink-secondary">Annual Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editAnnualHours}
                          onChange={(e) => setEditAnnualHours(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Actions Box (Password Reset inside Edit) */}
              <div className="border-t border-line pt-3 flex justify-between items-center bg-surface-muted p-3 rounded-lg border border-line">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-ink uppercase flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-ink-muted" /> Account Security</span>
                  <span className="text-[11px] text-ink-muted block">Force credentials setup at next login</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetPasswordInEdit}
                  className="h-8 text-[11px] font-bold border-line-strong hover:bg-ink hover:text-white"
                >
                  Reset Password
                </Button>
              </div>

              {/* Login Enable Checkbox */}
              <div className="flex items-center justify-between border-t border-line pt-3 pb-1">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-ink block">Login Permissions</label>
                  <span className="text-[11px] text-ink-muted block">Control access status</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-line-strong text-ink focus:ring-brand/30 cursor-pointer"
                  />
                  <span className="ml-2 text-xs font-semibold text-ink">Enabled</span>
                </label>
              </div>

              {/* Dialog Footer */}
              <DialogFooter className="border-t border-line pt-4 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditUserOpen(false)}
                  disabled={editLoading}
                  className="h-9 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading || !editName.trim()}
                  className="h-9 bg-ink text-white hover:bg-zinc-800 disabled:opacity-50 font-bold"
                >
                  {editLoading ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- STAGE 4b: DEACTIVATE/ACTIVATE ALERT DIALOG (SOFT) --- */}
      <Dialog open={deactivateAlertOpen} onOpenChange={setDeactivateAlertOpen}>
        <DialogContent className="max-w-md bg-surface p-6 rounded-lg text-ink border border-line shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-tight text-ink flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Status Change
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary mt-2 leading-relaxed">
              Are you sure you want to <strong>{selectedUser?.isActive ? 'deactivate' : 'activate'}</strong> the user account for <strong>{selectedUser?.fullName}</strong> ({selectedUser?.email})?
              {selectedUser?.isActive && (
                <span className="block mt-2 text-[11px] text-ink-secondary bg-surface-muted p-2 border rounded border-line">
                  Deactivating will ban their login immediately, terminate active sessions, and drop them from picker selections (tickets assignment, workloads), while keeping their records and history intact.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2 border-t border-line mt-4">
            <Button variant="ghost" onClick={() => setDeactivateAlertOpen(false)} className="h-9 font-bold">
              Cancel
            </Button>
            <Button
              onClick={executeToggleActivation}
              className={`h-9 font-bold text-white ${selectedUser?.isActive ? 'bg-amber-600 hover:bg-amber-500' : 'bg-ink hover:bg-zinc-800'}`}
            >
              Authorize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- STAGE 4c: GUArDED DELETE ALERT DIALOG (HARD DELETE) --- */}
      <Dialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <DialogContent className="max-w-md bg-surface p-6 rounded-lg text-ink border border-line shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-tight text-ink flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-critical" />
              Guarded Delete Authorization
            </DialogTitle>
          </DialogHeader>

          <div className="py-2.5 text-xs leading-relaxed space-y-3">
            {deleteGuardStatus.loading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2 text-ink-muted">
                <RefreshCw className="h-6 w-6 animate-spin text-ink-muted" />
                <p className="text-[11px]">Analyzing database links for user data safety...</p>
              </div>
            ) : deleteGuardStatus.blocked ? (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 flex items-start gap-2 text-[11px]">
                  <XCircle className="h-5 w-5 shrink-0 text-critical" />
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[11px]">Hard Delete Blocked</p>
                    <p className="mt-1 leading-normal">This consultant or client cannot be permanently deleted because: <strong>{deleteGuardStatus.reason}</strong>.</p>
                  </div>
                </div>
                <p className="text-ink-secondary text-[11px]">To protect database integrity, you should <strong>deactivate</strong> this account instead. This blocks login access immediately while preserving linked tickets, effort hours, and metrics history.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-emerald-800 flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[11px]">Delete Safe</p>
                    <p className="mt-0.5">Zero linked records found. User is eligible for hard deletion.</p>
                  </div>
                </div>
                <p className="text-ink-secondary text-[11px]">Are you sure you want to permanently delete <strong>{selectedUser?.fullName}</strong> ({selectedUser?.email})? This action is irreversible.</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 gap-2 border-t border-line mt-2">
            <Button variant="ghost" onClick={() => setDeleteAlertOpen(false)} className="h-9 font-bold">
              {deleteGuardStatus.blocked ? 'Close' : 'Cancel'}
            </Button>
            
            {deleteGuardStatus.blocked ? (
              <Button
                onClick={() => {
                  setDeleteAlertOpen(false);
                  if (selectedUser) handleOpenDeactivateToggle(selectedUser);
                }}
                className="h-9 bg-ink text-white hover:bg-zinc-800 font-bold"
              >
                Deactivate Instead
              </Button>
            ) : (
              <Button
                onClick={executeHardDelete}
                disabled={user?.role !== 'SuperAdmin'}
                className="h-9 bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 font-bold"
              >
                Permanently Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- STAGE 4d: CONTRACT DIALOG OVERLAY --- */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-lg bg-surface p-6 rounded-lg text-ink border border-line shadow-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-ink flex items-center gap-1.5">
              <FileText className="h-5 w-5 text-ink-secondary" />
              Contract Overview
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary mt-1">
              Active agreements for client company <strong>{selectedUser?.organizationName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-2">
              
              {!viewContractEditMode ? (
                // View Mode
                <div className="space-y-4">
                  {selectedUser.activeContract ? (
                    <div className="space-y-4">
                      {/* Contract details card */}
                      <div className="border border-line rounded-lg p-4 bg-surface-muted/60 space-y-3 text-[11px] text-ink-secondary">
                        <div className="flex justify-between items-center border-b border-line pb-2">
                          <span className="font-bold text-ink-muted uppercase text-[11px]">Contract Status</span>
                          <Badge variant="success" className="text-[11px] font-bold">
                            {selectedUser.activeContract.contractType} · {selectedUser.activeContract.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] text-ink-muted block font-bold uppercase">Start Date</span>
                            <span className="text-ink font-bold text-xs mt-0.5 block">{selectedUser.activeContract.startDate || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-ink-muted block font-bold uppercase">End Date</span>
                            <span className="text-ink font-bold text-xs mt-0.5 block">{selectedUser.activeContract.endDate || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-ink-muted block font-bold uppercase">Monthly Budget</span>
                            <span className="text-ink font-bold text-xs mt-0.5 block">{selectedUser.activeContract.monthlyBudgetHours || 0} Hours</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-ink-muted block font-bold uppercase">Annual Allocated</span>
                            <span className="text-ink font-bold text-xs mt-0.5 block">{selectedUser.activeContract.totalHours || 0} Hours</span>
                          </div>
                        </div>

                        {selectedUser.contractExpiryDays !== null && (
                          <div className="border-t border-line pt-2 text-ink-secondary font-medium">
                            Time remaining: <strong>{selectedUser.contractExpiryDays <= 0 ? 'Expired' : `${selectedUser.contractExpiryDays} days`}</strong>
                          </div>
                        )}
                      </div>

                      {/* Consumed actuals vs allocation bars */}
                      <div className="space-y-3 border border-line rounded-lg p-4 bg-surface">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> Consumption Analytics
                        </h4>
                        
                        {/* Monthly usage */}
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-ink-secondary">Monthly Usage</span>
                            <span className="font-bold text-ink-secondary">{selectedUser.activeContract.monthlyUsedHours || 0}h / {selectedUser.activeContract.monthlyBudgetHours || 0}h</span>
                          </div>
                          <div className="h-2 bg-surface-subtle border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-info"
                              style={{ width: `${Math.min(selectedUser.activeContract.monthlyBudgetHours > 0 ? (selectedUser.activeContract.monthlyUsedHours / selectedUser.activeContract.monthlyBudgetHours) * 100 : 0, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Annual usage */}
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-ink-secondary">Annual Allocation</span>
                            <span className="font-bold text-ink-secondary">{selectedUser.activeContract.usedHours || 0}h / {selectedUser.activeContract.totalHours || 0}h</span>
                          </div>
                          <div className="h-2 bg-surface-subtle border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ink"
                              style={{ width: `${Math.min(selectedUser.activeContract.totalHours > 0 ? (selectedUser.activeContract.usedHours / selectedUser.activeContract.totalHours) * 100 : 0, 100)}%` }}
                            />
                          </div>
                        </div>

                        {selectedUser.activeContract.projectedExhaustion && (
                          <div className="text-[11px] text-ink-muted mt-1 pt-1.5 border-t border-line flex justify-between">
                            <span>Projected exhaustion:</span>
                            <span className="font-bold text-ink-secondary">{selectedUser.activeContract.projectedExhaustion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-ink-muted text-xs italic bg-surface-muted border rounded-lg border-line">
                      No active contract found for this organization.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end pt-2 border-t border-line gap-2">
                    <Button variant="ghost" onClick={() => setContractDialogOpen(false)} className="h-9 font-bold">
                      Close
                    </Button>
                    <Button
                      onClick={() => setViewContractEditMode(true)}
                      className="h-9 bg-ink text-white hover:bg-zinc-800 font-bold"
                    >
                      {selectedUser.activeContract ? 'Edit Contract' : 'Create Contract'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <form onSubmit={handleUpdateContractFromView} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-secondary">Project / SLA Type</label>
                      <select
                        value={cViewContractType}
                        onChange={(e) => setCViewContractType(e.target.value)}
                        className="bg-surface border border-line rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-8 w-full cursor-pointer"
                      >
                        <option value="AMS">AMS</option>
                        <option value="Implementation Support">Implementation</option>
                        <option value="Rollout Support">Rollout</option>
                        <option value="Migration Support">Migration</option>
                        <option value="Upgrade Support">Upgrade</option>
                        <option value="Hypercare Support">Hypercare</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-secondary">Contract Status</label>
                      <select
                        value={cViewContractStatus}
                        onChange={(e) => setCViewContractStatus(e.target.value)}
                        className="bg-surface border border-line rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 h-8 w-full cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-secondary">Start Date</label>
                      <Input
                        required
                        type="date"
                        value={cViewStartDate}
                        onChange={(e) => setCViewStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-secondary">End Date</label>
                      <Input
                        required
                        type="date"
                        value={cViewEndDate}
                        onChange={(e) => setCViewEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-secondary">Monthly budget hours</label>
                      <Input
                        required
                        type="number"
                        step="0.5"
                        value={cViewMonthlyHours}
                        onChange={(e) => setCViewMonthlyHours(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-secondary">Annual allocated hours</label>
                      <Input
                        required
                        type="number"
                        step="0.5"
                        value={cViewAnnualHours}
                        onChange={(e) => setCViewAnnualHours(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {(() => {
                    const dur = computeDurationInMonths(cViewStartDate, cViewEndDate);
                    const mon = Number(cViewMonthlyHours) || 0;
                    const ann = Number(cViewAnnualHours) || 0;
                    const tot = mon * dur;
                    const dev = Math.abs(tot - ann);
                    const warn = dur > 0 && dev > (ann * 0.2);

                    if (dur <= 0) return null;

                    return (
                      <div className="space-y-2 pt-1">
                        <div className="bg-surface-muted border border-line rounded px-2.5 py-1.5 text-[11px] text-ink-secondary flex justify-between">
                          <span>Duration: <strong>{dur} months</strong></span>
                          <span>Monthly × months = <strong>{tot}h</strong> vs Annual: <strong>{ann}h</strong></span>
                        </div>

                        {warn && (
                          <div className="bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-[11px] text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                            <span>allocation totals ({ann}h) deviate from duration totals ({tot}h).</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex justify-end pt-2 border-t border-line gap-2">
                    <Button variant="ghost" onClick={() => setViewContractEditMode(false)} disabled={cViewLoading} className="h-9 font-bold">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={cViewLoading || !cViewStartDate || !cViewEndDate}
                      className="h-9 bg-ink text-white hover:bg-zinc-800 font-bold"
                    >
                      {cViewLoading ? 'Saving...' : 'Save Contract Terms'}
                    </Button>
                  </div>
                </form>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- PROVISION SUCCESS CREDENTIALS CONFIRMATION MODAL --- */}
      <Dialog open={provisionSuccessOpen} onOpenChange={setProvisionSuccessOpen}>
        <DialogContent className="max-w-md bg-surface p-6 rounded-lg text-ink border border-line shadow-xl text-xs">
          <DialogHeader className="border-b border-line pb-2">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Credentials Configuration Active
            </DialogTitle>
            <DialogDescription className="text-[11px] text-ink-secondary mt-1">
              Account provisioned in active authentication directories.
            </DialogDescription>
          </DialogHeader>

          {provisionSuccessUser && (
            <div className="space-y-4 my-2">
              <div className="bg-surface-muted border border-line rounded p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-ink-muted uppercase text-[11px]">Name:</span>
                  <span className="text-ink font-bold">{provisionSuccessUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-ink-muted uppercase text-[11px]">Email:</span>
                  <span className="text-ink font-bold break-all select-all">{provisionSuccessUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-ink-muted uppercase text-[11px]">Role Group:</span>
                  <span className="text-ink font-bold uppercase text-[11px]">{provisionSuccessUser.role}</span>
                </div>
              </div>

              <div className="bg-ink text-white rounded-lg p-4 font-bold space-y-3">
                <span className="text-[11px] text-emerald-400 font-semibold uppercase block">Temporary Credentials Issued</span>
                <div className="flex items-center justify-between gap-2 bg-ink p-2.5 rounded border border-zinc-800">
                  <span className="text-xs tracking-wider select-all text-emerald-400 font-extrabold">{provisionSuccessUser.tempPass}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(provisionSuccessUser.tempPass);
                      toast.success('Temporary password copied to clipboard!');
                    }}
                    className="h-7 px-3 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] font-bold uppercase gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
                <span className="text-[11px] text-ink-muted leading-normal block font-normal pt-1">
                  Important: Share this temporary key with the user. They will be prompted to replace it immediately at first login setup.
                </span>
              </div>

              <div className="flex justify-end pt-2 border-t border-line">
                <Button
                  onClick={() => {
                    setProvisionSuccessOpen(false);
                    setProvisionSuccessUser(null);
                  }}
                  className="h-9 bg-ink text-white hover:bg-zinc-800 font-bold"
                >
                  Done & Acknowledge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
