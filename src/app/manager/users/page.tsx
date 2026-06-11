'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Actions
import {
  provisionUser,
  updateUserAuthStatus,
  deleteAuthUser,
  logUserAuditAction
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
  RefreshCw
} from 'lucide-react';

export default function UserManagementPage() {
  const { user } = useAuth();
  const { profiles, tickets, contracts, loading, refetchData } = useTickets();

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'consultants' | 'clients'>('consultants');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Functional' | 'Technical'>('All');
  const [orgFilter, setOrgFilter] = useState<string>('All');
  const [organizationsList, setOrganizationsList] = useState<{ id: string; name: string; customer_short_code: string | null }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Organizations list
  const fetchOrgs = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('organizations').select('id, name, customer_short_code');
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
    } catch (e: any) {
      toast.error('Failed to refresh data: ' + e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Map database profiles into domain objects
  const processedUsers = useMemo(() => {
    return (profiles || []).map((u: any) => {
      // Find org
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

      // Resolve Active Contract (for Clients)
      const activeContract = (contracts || []).find((c: any) => 
        (c.customerId === u.organization_id || c.customerId === orgName) &&
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

  // Filter list
  const filteredUsers = useMemo(() => {
    return processedUsers.filter(u => {
      // Role match tab
      if (activeTab === 'consultants' && u.role !== 'Consultant') return false;
      if (activeTab === 'clients' && u.role !== 'Customer') return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone.toLowerCase().includes(q);
        const matchesOrg = u.organizationName.toLowerCase().includes(q);
        const matchesModules = u.sapModules.some((m: string) => m.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesOrg && !matchesModules) return false;
      }

      // Status match
      if (statusFilter === 'Active' && !u.isActive) return false;
      if (statusFilter === 'Inactive' && u.isActive) return false;

      // Type filter (consultants only)
      if (activeTab === 'consultants' && typeFilter !== 'All' && u.consultantType !== typeFilter) return false;

      // Org filter (clients only)
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

  return (
    <div className="max-w-screen-xl mx-auto p-6 md:p-8 space-y-6">
      
      {/* 1a. Header Title, Subtitle, and Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">User Management</h1>
          <p className="text-sm text-zinc-500">Create and manage consultants and clients.</p>
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
              <Button size="sm" className="h-9 gap-1.5 bg-zinc-950 text-white hover:bg-zinc-800">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-zinc-200 shadow-md">
              <DropdownMenuItem onClick={() => toast.info('Consultant Form (Stage 2)')} className="cursor-pointer font-bold text-xs uppercase p-2.5">
                New Consultant
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info('Client Form (Stage 3)')} className="cursor-pointer font-bold text-xs uppercase p-2.5">
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
        <TabsList className="bg-zinc-100/80 p-1 rounded-lg border border-zinc-250/50 inline-flex w-full sm:w-auto">
          <TabsTrigger
            value="consultants"
            className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-900"
          >
            Consultants
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-900"
          >
            Clients
          </TabsTrigger>
        </TabsList>

        {/* Consultants Tab */}
        <TabsContent value="consultants" className="space-y-4 outline-none">
          
          {/* Tab Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  placeholder="Search name, email, module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-1 focus-visible:ring-zinc-950 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-950 h-9 w-full sm:w-36 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-950 h-9 w-full sm:w-36 cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Functional">Functional</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-zinc-500 font-mono md:ml-auto">
              {filteredUsers.length} users
            </div>
          </div>

          {/* Consultants Table */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-4">Name</TableHead>
                  <TableHead className="p-4">Type</TableHead>
                  <TableHead className="p-4">Status</TableHead>
                  <TableHead className="p-4">Active Tickets</TableHead>
                  <TableHead className="p-4">Utilization %</TableHead>
                  <TableHead className="p-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-4"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-8" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="p-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-zinc-400">
                        <User className="h-8 w-8 stroke-1" />
                        <span className="text-sm font-semibold">No consultants yet.</span>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => toast.info('Consultant Form (Stage 2)')}>
                          Add Consultant
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-zinc-200">
                            <AvatarFallback className="bg-zinc-100 text-zinc-800 font-semibold text-xs">
                              {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-zinc-900 truncate">{u.fullName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono truncate">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant={u.consultantType === 'Technical' ? 'outline' : 'secondary'} className="text-[9px] font-bold">
                          {u.consultantType}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant={u.isActive ? 'success' : 'warning'} className="text-[9px] font-bold">
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 font-mono text-xs text-zinc-700">
                        {u.activeTicketsCount}
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-700">{u.utilizationPercent}%</span>
                          <div className="w-16 bg-zinc-100 rounded-full h-1.5 overflow-hidden hidden sm:block border border-zinc-200">
                            <div
                              className={`h-full ${u.utilizationPercent >= 90 ? 'bg-red-500' : u.utilizationPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(u.utilizationPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border border-zinc-200 shadow-md w-36">
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => toast.info('Edit Consultant (Stage 4)')}>
                              <Edit className="h-3.5 w-3.5 text-zinc-500" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => toast.info('Toggle Status (Stage 4)')}>
                              {u.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 text-zinc-500" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => toast.info('Delete Consultant (Stage 4)')}>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  placeholder="Search name, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-1 focus-visible:ring-zinc-950 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-950 h-9 w-full sm:w-36 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-950 h-9 w-full sm:w-48 cursor-pointer truncate"
                >
                  <option value="All">All Companies</option>
                  {uniqueOrgsDropdown.map(orgName => (
                    <option key={orgName} value={orgName}>{orgName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-zinc-500 font-mono md:ml-auto">
              {filteredUsers.length} users
            </div>
          </div>

          {/* Clients Table */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-4">Name</TableHead>
                  <TableHead className="p-4">Organization</TableHead>
                  <TableHead className="p-4">Contract</TableHead>
                  <TableHead className="p-4">Status</TableHead>
                  <TableHead className="p-4">Open Tickets</TableHead>
                  <TableHead className="p-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-4"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-5 w-8" /></TableCell>
                      <TableCell className="p-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-zinc-400">
                        <Building className="h-8 w-8 stroke-1" />
                        <span className="text-sm font-semibold">No clients yet.</span>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => toast.info('Client Form (Stage 3)')}>
                          Add Client
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-zinc-200">
                            <AvatarFallback className="bg-zinc-100 text-zinc-800 font-semibold text-xs">
                              {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-zinc-900 truncate">{u.fullName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono truncate">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-zinc-900 font-semibold">{u.organizationName}</span>
                          {u.customerShortCode && (
                            <span className="text-[9px] text-zinc-400 font-mono font-bold uppercase">{u.customerShortCode}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-4">
                        {u.activeContract ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="success" className="text-[9px] font-bold w-max">
                              {u.activeContract.contractType}
                            </Badge>
                            {u.contractExpiryDays !== null && (
                              <span className={`text-[10px] font-medium font-mono ${u.contractExpiryDays < 30 ? 'text-amber-600 font-semibold animate-pulse' : 'text-zinc-500'}`}>
                                {u.contractExpiryDays <= 0 ? 'Expired' : `expires in ${u.contractExpiryDays}d`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[11px]">No active contract</span>
                        )}
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant={u.isActive ? 'success' : 'warning'} className="text-[9px] font-bold">
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 font-mono text-xs text-zinc-700">
                        {u.openClientTicketsCount}
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border border-zinc-200 shadow-md w-36">
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => toast.info('Edit Client (Stage 4)')}>
                              <Edit className="h-3.5 w-3.5 text-zinc-500" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => toast.info('Contract Management (Stage 4)')}>
                              <FileText className="h-3.5 w-3.5 text-zinc-500" />
                              Contract
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2" onClick={() => toast.info('Toggle Status (Stage 4)')}>
                              {u.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 text-zinc-500" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2 text-xs font-bold uppercase p-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => toast.info('Delete Client (Stage 4)')}>
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
    </div>
  );
}
