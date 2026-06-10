'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { 
  Users, UserCheck, AlertTriangle, Clock, Search, ShieldCheck, 
  ChevronRight, Activity, BookOpen, BarChart3, TrendingUp, Grid,
  Plus, Edit3, Trash2, KeyRound, Mail, Phone, Calendar, ShieldAlert,
  ChevronLeft, Award, HelpCircle, Layers, CheckSquare, RefreshCw, Eye, Lock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { provisionUser, resetUserPasswordAdmin, adminUpdatePasswordDirect } from '../../actions/auth';

interface ConsultantDetail {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  consultant_type?: 'Functional' | 'Technical';
  sap_modules?: string[];
  phone_number?: string;
  role_title?: string;
  skills?: string;
  employee_id?: string;
  gender?: string;
  dob?: string;
  specialization?: string;
  join_date?: string;
  emergency_contact?: string;
  experience_years?: number;
  certifications?: string;
  daily_capacity_hours?: number;
  weekly_capacity_hours?: number;
  monthly_capacity_hours?: number;
  reporting_manager_id?: string;
  team_lead_id?: string;
  avatar_url?: string;
}

export default function AdminConsultantsPage() {
  const { tickets, refetchData } = useTickets();
  const [consultants, setConsultants] = useState<ConsultantDetail[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [efforts, setEfforts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Functional' | 'Technical'>('All');
  
  // Selected consultant for details modal
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantDetail | null>(null);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  // -------------------------------------------------------------
  // Step Wizard Form States
  // -------------------------------------------------------------
  // Step 1: Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');

  // Step 2: Contact Information
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Step 3: Professional Information
  const [consultantType, setConsultantType] = useState<'Functional' | 'Technical'>('Functional');
  const [designation, setDesignation] = useState('');
  const [experience, setExperience] = useState('0');
  const [certification, setCertification] = useState('');

  // Step 4: SAP Modules (Multi-select array)
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Step 5: Capacity Settings
  const [dailyCapacity, setDailyCapacity] = useState('8');
  const [weeklyCapacity, setWeeklyCapacity] = useState('40');
  const [monthlyCapacity, setMonthlyCapacity] = useState('160');

  // Step 6: Reporting Structure
  const [reportingManager, setReportingManager] = useState('');
  const [teamLead, setTeamLead] = useState('');

  // Step 7: Account Access
  const [accessPassword, setAccessPassword] = useState('');
  const [accessPwdOption, setAccessPwdOption] = useState<'auto' | 'manual'>('auto');

  // Password Reset Dialog State
  const [pwdUserSelected, setPwdUserSelected] = useState<any | null>(null);
  const [pwdResetOption, setPwdResetOption] = useState<'temp' | 'manual'>('temp');
  const [pwdManualValue, setPwdManualValue] = useState('');
  const [pwdGeneratedTemp, setPwdGeneratedTemp] = useState('');

  const sapModulesList = [
    'FICO', 'SD', 'MM', 'PP', 'PM', 'QM', 'WM', 
    'ABAP', 'BASIS', 'CPI', 'SAC', 
    'SuccessFactors EC', 'SuccessFactors ECP', 
    'SuccessFactors PMGM', 'SuccessFactors RCM'
  ];

  const fetchConsultantsAndEfforts = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name');
        if (profErr) throw profErr;
        setProfiles(profs || []);

        const consList = (profs || []).filter(p => p.role === 'Consultant');
        setConsultants(consList);

        const { data: effData, error: effErr } = await supabase
          .from('ticket_consultant_efforts')
          .select('*');
        if (effErr) throw effErr;
        setEfforts(effData || []);
      } catch (err: any) {
        console.error('Error loading consultants registry:', err);
        toast.error(`Database retrieval failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallbacks
      const mockList: ConsultantDetail[] = [
        {
          id: 'cons-1',
          full_name: 'Priya Raman',
          email: 'priya@assist360.com',
          role: 'Consultant',
          is_active: true,
          consultant_type: 'Functional',
          role_title: 'Senior FICO Consultant',
          sap_modules: ['FICO'],
          skills: 'SAP General Ledger',
          employee_id: 'EMP-001',
          join_date: '2026-01-10',
          monthly_capacity_hours: 160
        }
      ];
      setConsultants(mockList);
      setProfiles(mockList);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultantsAndEfforts();
  }, []);

  // Filter lists
  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => {
      const matchesSearch = c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email.toLowerCase().includes(c.email.toLowerCase()) ||
                            (c.employee_id && c.employee_id.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === 'All' || c.consultant_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [consultants, searchQuery, typeFilter]);

  // Dynamic statistics calculator for a specific consultant
  const getConsultantStats = (c: ConsultantDetail) => {
    const assignedTickets = tickets.filter(t => t.assignedConsultantId === c.id || t.primaryConsultantId === c.id || t.assignedConsultant === c.full_name);
    const openTickets = assignedTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    const closedTickets = assignedTickets.filter(t => t.status === 'Closed');
    
    // Pending approvals: tickets assigned to them which are awaiting closures
    const pendingApprovals = assignedTickets.filter(t => t.closureStatus === 'Pending' || t.status === 'Request for Closure');
    const escalations = assignedTickets.filter(t => t.status === 'Escalated' || t.isEscalated);

    // Dynamic SLA calculation
    let breachedCount = 0;
    assignedTickets.forEach(t => {
      if (t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable') {
        const due = new Date(t.slaDueAt).getTime();
        if (t.status === 'Closed' || t.status === 'Resolved') {
          const closed = new Date(t.closedAt || t.resolvedAt || t.updatedAt).getTime();
          if (closed > due) breachedCount++;
        } else {
          if (due < Date.now()) breachedCount++;
        }
      }
    });
    const monitoredTickets = assignedTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length;
    const slaCompliancePct = monitoredTickets > 0 
      ? Math.round(((monitoredTickets - breachedCount) / monitoredTickets) * 100)
      : 100;

    // Efforts estimation & approved actuals
    const consultantEfforts = efforts.filter(e => e.consultant_id === c.id);
    const estimatedHours = consultantEfforts.reduce((sum, e) => sum + Number(e.estimated_hours || 0), 0);
    const approvedActualHours = consultantEfforts
      .filter(e => e.closure_status === 'Approved' || e.status === 'Approved')
      .reduce((sum, e) => sum + Number(e.actual_hours || 0), 0);

    // Capacity & Utilization rates
    const monthlyCapacity = c.monthly_capacity_hours || 160;
    const utilizationPct = Math.round((approvedActualHours / monthlyCapacity) * 100);
    
    // Capacity % represents current allocated estimated hours vs total capacity
    const capacityPct = Math.round((estimatedHours / monthlyCapacity) * 100);

    // Average resolution time (resolved tickets cycle speed)
    const resolvedTickets = assignedTickets.filter(t => t.resolvedAt || t.closedAt);
    let totalResTimeMs = 0;
    resolvedTickets.forEach(t => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.resolvedAt || t.closedAt || t.updatedAt).getTime();
      totalResTimeMs += (end - start);
    });
    const avgResolutionTime = resolvedTickets.length > 0
      ? (totalResTimeMs / (1000 * 60 * 60) / resolvedTickets.length).toFixed(1)
      : 'N/A';

    return {
      assigned: assignedTickets.length,
      open: openTickets.length,
      closed: closedTickets.length,
      pending: pendingApprovals.length,
      escalated: escalations.length,
      estimatedHours,
      approvedActualHours,
      utilizationPct,
      capacityPct,
      avgResolutionTime,
      slaCompliancePct
    };
  };

  // -------------------------------------------------------------
  // Wizard Handlers
  // -------------------------------------------------------------
  const handleOpenWizard = () => {
    setWizardStep(1);
    setFirstName('');
    setLastName('');
    setEmployeeId('');
    setDob('');
    setGender('Male');
    setEmail('');
    setMobile('');
    setEmergencyContact('');
    setConsultantType('Functional');
    setDesignation('');
    setExperience('0');
    setCertification('');
    setSelectedModules([]);
    setDailyCapacity('8');
    setWeeklyCapacity('40');
    setMonthlyCapacity('160');
    setReportingManager('');
    setTeamLead('');
    setAccessPassword('');
    setAccessPwdOption('auto');
    setWizardOpen(true);
  };

  const toggleModule = (module: string) => {
    if (selectedModules.includes(module)) {
      setSelectedModules(prev => prev.filter(m => m !== module));
    } else {
      setSelectedModules(prev => [...prev, module]);
    }
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!firstName.trim() || !lastName.trim()) { toast.error('First Name and Last Name are required.'); return; }
      if (!employeeId.trim()) { toast.error('Employee ID is required.'); return; }
    } else if (wizardStep === 2) {
      if (!email.trim() || !email.includes('@')) { toast.error('Valid contact email is required.'); return; }
    } else if (wizardStep === 3) {
      if (!designation.trim()) { toast.error('Designation is required.'); return; }
    }
    setWizardStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setWizardStep(prev => Math.max(1, prev - 1));
  };

  const handleWizardSubmit = async () => {
    const toastId = toast.loading(`Provisioning consultant account for ${firstName} ${lastName}...`);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        fullName: `${firstName} ${lastName}`.trim(),
        role: 'Consultant' as const,
        initialPassword: accessPwdOption === 'manual' && accessPassword.trim() ? accessPassword.trim() : undefined,
        
        consultantType,
        sapModules: selectedModules,
        phoneNumber: mobile.trim() || undefined,
        roleTitle: designation.trim(),
        skills: certification.trim() || 'SAP Certified Specialist',
        
        employeeId: employeeId.trim(),
        gender,
        dob: dob || undefined,
        specialization: designation.trim(),
        joinDate: new Date().toISOString().split('T')[0],
        emergencyContact: emergencyContact.trim() || undefined,
        experienceYears: parseFloat(experience) || 0,
        certifications: certification.trim() || undefined,
        dailyCapacityHours: parseFloat(dailyCapacity) || 8.00,
        weeklyCapacityHours: parseFloat(weeklyCapacity) || 40.00,
        monthlyCapacityHours: parseFloat(monthlyCapacity) || 160.00,
        reportingManagerId: reportingManager || undefined,
        teamLeadId: teamLead || undefined
      };

      const res = await provisionUser(payload);
      if (res.success) {
        toast.success(`Consultant ${firstName} provisioned successfully!`, { id: toastId });
        setWizardOpen(false);
        await refetchData();
        await fetchConsultantsAndEfforts();
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast.error(`Provisioning failed: ${e.message}`, { id: toastId });
    }
  };

  // Status and delete handlers
  const toggleConsultantStatus = async (c: ConsultantDetail) => {
    const toastId = toast.loading(`Toggling activation status...`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !c.is_active })
        .eq('id', c.id);
      if (error) throw error;
      toast.success(`Account status modified.`, { id: toastId });
      await fetchConsultantsAndEfforts();
    } catch (err: any) {
      toast.error(`Status toggle failed: ${err.message}`, { id: toastId });
    }
  };

  const deleteConsultant = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this consultant? This action is irreversible.')) {
      return;
    }
    const toastId = toast.loading('Pruning consultant registration...');
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Consultant pruned successfully.', { id: toastId });
      setSelectedConsultant(null);
      await fetchConsultantsAndEfforts();
    } catch (err: any) {
      toast.error(`Pruning failed: ${err.message}`, { id: toastId });
    }
  };

  // Password Dialog Handlers
  const handleOpenPassword = (c: ConsultantDetail) => {
    setPwdUserSelected(c);
    setPwdResetOption('temp');
    setPwdManualValue('');
    setPwdGeneratedTemp('');
    setPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdUserSelected) return;
    const toastId = toast.loading('Processing credential update...');
    try {
      let tempPass = '';
      if (pwdResetOption === 'temp') {
        const res = await resetUserPasswordAdmin(pwdUserSelected.id, 'SuperAdmin');
        if (!res.success) throw new Error(res.error);
        tempPass = res.password || '';
        setPwdGeneratedTemp(tempPass);
        toast.success('Temporary credentials generated successfully. Copy before closing.', { id: toastId });
      } else {
        if (!pwdManualValue.trim() || pwdManualValue.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        const res = await adminUpdatePasswordDirect(pwdUserSelected.id, pwdManualValue, 'SuperAdmin');
        if (!res.success) throw new Error(res.error);
        toast.success('Credentials updated directly.', { id: toastId });
        setPasswordDialogOpen(false);
      }
      await refetchData();
    } catch (err: any) {
      toast.error(`Credential update failed: ${err.message}`, { id: toastId });
    }
  };

  // List of managers for reporting structure dropdown
  const managersList = useMemo(() => {
    return profiles.filter(p => p.role === 'Manager' || p.role === 'SuperAdmin');
  }, [profiles]);

  return (
    <div className="space-y-6 font-sans text-sm text-zinc-900 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 bg-white">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Consultant Capacity Workspace
          </h1>
          <p className="text-zinc-500 text-xs mt-1">Manage delivery capacity settings, inspect consultant rosters, and track performance scores.</p>
        </div>
        <Button
          onClick={handleOpenWizard}
          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} />
          Add Consultant
        </Button>
      </div>

      {/* Roster list & filters */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="py-4 px-5 border-b border-zinc-100 flex flex-row items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search employee, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
              <SelectTrigger className="w-32 text-xs h-9">
                <SelectValue placeholder="Type filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Functional">Functional</SelectItem>
                <SelectItem value="Technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-zinc-500 border-zinc-300">
            {filteredConsultants.length} Active Resources
          </Badge>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-12 text-center text-zinc-400 italic flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={16} /> Retrieving consultant profiles...
              </div>
            ) : filteredConsultants.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400 italic">No resources matching filter constraints.</div>
            ) : (
              filteredConsultants.map(c => {
                const stats = getConsultantStats(c);
                return (
                  <Card key={c.id} className="border-zinc-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="p-5 space-y-4">
                      
                      {/* Avatar/Name row */}
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full border bg-zinc-100 flex items-center justify-center font-bold text-zinc-650 text-xs">
                            {c.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-semibold text-xs text-zinc-900">{c.full_name}</h3>
                            <span className="text-[10px] text-zinc-400 font-mono block">ID: {c.employee_id || 'N/A'}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">{c.role_title || `${c.consultant_type} Consultant`}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-[8px] font-bold uppercase ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {c.is_active ? 'Active' : 'Suspended'}
                        </Badge>
                      </div>

                      {/* Info details */}
                      <div className="text-[11px] space-y-1 font-mono text-zinc-500 border-t border-zinc-100 pt-3">
                        <div className="flex justify-between"><span>Email:</span><span className="text-zinc-800">{c.email}</span></div>
                        <div className="flex justify-between"><span>Phone:</span><span className="text-zinc-800">{c.phone_number || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Join Date:</span><span className="text-zinc-800">{c.join_date || 'N/A'}</span></div>
                      </div>

                      {/* SAP modules multi-select badges */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Expertise Modules</span>
                        <div className="flex flex-wrap gap-1">
                          {c.sap_modules && c.sap_modules.length > 0 ? (
                            c.sap_modules.map(mod => (
                              <Badge key={mod} variant="outline" className="text-[9px] px-1 py-0 border-zinc-300 text-zinc-650">
                                {mod}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">No modules allocated</span>
                          )}
                        </div>
                      </div>

                      {/* Statistics indicators */}
                      <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-zinc-100">
                        <div className="bg-zinc-50/50 p-2 border border-zinc-150 rounded">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase">SLA COMPLIANCE</span>
                          <span className="text-xs font-bold block mt-0.5 text-zinc-800">{stats.slaCompliancePct}%</span>
                        </div>
                        <div className="bg-zinc-50/50 p-2 border border-zinc-150 rounded">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase">ACTIVE INCIDENTS</span>
                          <span className="text-xs font-bold block mt-0.5 text-zinc-800">{stats.open} Open</span>
                        </div>
                        <div className="bg-zinc-50/50 p-2 border border-zinc-150 rounded">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase">ALLOCATED LOAD</span>
                          <span className="text-xs font-bold block mt-0.5 text-zinc-800">{stats.capacityPct}%</span>
                        </div>
                        <div className="bg-zinc-50/50 p-2 border border-zinc-150 rounded">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase">APPROVED HOURS</span>
                          <span className="text-xs font-bold block mt-0.5 text-zinc-800">{stats.approvedActualHours.toFixed(0)} Hrs</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-1.5 border-t border-zinc-100 pt-3">
                        <Button variant="outline" size="sm" className="text-[10px] h-7 px-2 cursor-pointer" onClick={() => handleOpenPassword(c)}>
                          <KeyRound size={11} className="mr-1" /> Password
                        </Button>
                        <Button variant="outline" size="sm" className="text-[10px] h-7 px-2 cursor-pointer" onClick={() => { setSelectedConsultant(c); }}>
                          <Eye size={11} className="mr-1" /> Inspect
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`text-[10px] h-7 px-2 cursor-pointer ${c.is_active ? 'text-amber-600 border-amber-200' : 'text-emerald-600 border-emerald-200'}`}
                          onClick={() => toggleConsultantStatus(c)}
                        >
                          {c.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="outline" size="sm" className="text-[10px] h-7 px-2 text-red-650 border-red-200 cursor-pointer" onClick={() => deleteConsultant(c.id)}>
                          <Trash2 size={11} />
                        </Button>
                      </div>

                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------
          7-STEP CONSULTANT CREATION WIZARD
         ------------------------------------------------------------- */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl bg-white border border-zinc-200 p-6 rounded-lg font-sans text-xs">
          <DialogHeader className="border-b border-zinc-200 pb-3 mb-4">
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
              Register Consultant Profile - Step {wizardStep} of 7
            </DialogTitle>
            <DialogDescription className="text-[11px] text-zinc-500 pt-1">
              Initialize the consultant directory profile and set system capacity parameters.
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: PERSONAL INFORMATION */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 1 - Personal Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">First Name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Last Name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Employee ID *</Label>
                  <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="EMP-4982" className="text-xs font-mono" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Date of Birth</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT INFORMATION */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 2 - Contact Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-zinc-700">Email Address *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john.doe@assist360.com" className="text-xs font-mono" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Mobile Phone</Label>
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+1 (555) 019-4821" className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Emergency Contact</Label>
                  <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Jane Doe (+1 555-019-4822)" className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROFESSIONAL INFORMATION */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 3 - Professional Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Consultant Type</Label>
                  <Select value={consultantType} onValueChange={(val: any) => setConsultantType(val)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Functional">Functional Consultant</SelectItem>
                      <SelectItem value="Technical">Technical Specialist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Designation *</Label>
                  <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Senior ABAP Developer" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Experience (Years)</Label>
                  <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Core Specialization / Certifications</Label>
                  <Input value={certification} onChange={(e) => setCertification(e.target.value)} placeholder="SAP Certified ABAP Architect" className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SAP MODULES */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 4 - Allocate SAP Modules</div>
              <div className="grid grid-cols-3 gap-2">
                {sapModulesList.map(mod => {
                  const isChecked = selectedModules.includes(mod);
                  return (
                    <div 
                      key={mod}
                      onClick={() => toggleModule(mod)}
                      className={`p-2.5 border rounded cursor-pointer transition text-center font-semibold text-[11px] ${
                        isChecked 
                          ? 'border-zinc-900 bg-zinc-50 text-zinc-950 font-bold' 
                          : 'border-zinc-200 text-zinc-500 bg-white hover:bg-zinc-50/50'
                      }`}
                    >
                      {mod}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: CAPACITY SETTINGS */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 5 - Working Capacity Settings</div>
              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700 font-sans">Daily Capacity (Hours)</Label>
                  <Input type="number" value={dailyCapacity} onChange={(e) => setDailyCapacity(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700 font-sans">Weekly Capacity (Hours)</Label>
                  <Input type="number" value={weeklyCapacity} onChange={(e) => setWeeklyCapacity(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700 font-sans">Monthly Capacity (Hours)</Label>
                  <Input type="number" value={monthlyCapacity} onChange={(e) => setMonthlyCapacity(e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REPORTING STRUCTURE */}
          {wizardStep === 6 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 6 - Reporting Structure & Hierarchy</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Reporting Manager</Label>
                  <Select value={reportingManager} onValueChange={setReportingManager}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managersList.map(mgr => (
                        <SelectItem key={mgr.id} value={mgr.id}>{mgr.full_name} ({mgr.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-zinc-700">Team Lead</Label>
                  <Select value={teamLead} onValueChange={setTeamLead}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {managersList.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>{lead.full_name} ({lead.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: ACCOUNT ACCESS */}
          {wizardStep === 7 && (
            <div className="space-y-4">
              <div className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">Section 7 - Credential Setup</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-zinc-700">Governance Method</Label>
                  <Select value={accessPwdOption} onValueChange={(val: any) => setAccessPwdOption(val)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-generate Secure Temporary Password</SelectItem>
                      <SelectItem value="manual">Configure Initial Password Manually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {accessPwdOption === 'manual' && (
                  <div className="space-y-1.5 col-span-2">
                    <Label className="font-semibold text-zinc-700">Manual Password</Label>
                    <Input type="password" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Min. 8 characters with numbers & symbols" className="text-xs font-mono" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer controls */}
          <DialogFooter className="mt-6 border-t border-zinc-200 pt-3 flex justify-between gap-2">
            <div>
              {wizardStep > 1 && (
                <Button variant="outline" size="sm" onClick={handlePrevStep} className="cursor-pointer">
                  <ChevronLeft size={14} className="mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              {wizardStep < 7 ? (
                <Button size="sm" onClick={handleNextStep} className="bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer">
                  Next <ChevronRight size={14} className="ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleWizardSubmit} className="bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer">
                  <ShieldCheck size={14} className="mr-1.5" /> Provision Consultant
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          DETAILS INSPECTION MODAL
         ------------------------------------------------------------- */}
      <Dialog open={!!selectedConsultant} onOpenChange={() => setSelectedConsultant(null)}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg font-sans text-xs">
          {selectedConsultant && (
            <>
              <DialogHeader className="border-b border-zinc-200 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border bg-zinc-150 flex items-center justify-center font-bold text-zinc-700 text-xs">
                    {selectedConsultant.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
                      {selectedConsultant.full_name}
                    </DialogTitle>
                    <span className="text-[10px] text-zinc-400 font-mono">Employee ID: {selectedConsultant.employee_id}</span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                  <span className="font-bold text-zinc-700 uppercase tracking-wider text-[9px] block mb-1">Personal Details</span>
                  <div className="flex justify-between"><span>Gender:</span><span>{selectedConsultant.gender || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Date of Birth:</span><span>{selectedConsultant.dob || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Designation:</span><span>{selectedConsultant.role_title}</span></div>
                  <div className="flex justify-between"><span>Emergency Contact:</span><span>{selectedConsultant.emergency_contact || 'N/A'}</span></div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                  <span className="font-bold text-zinc-700 uppercase tracking-wider text-[9px] block mb-1">Capacity allocations</span>
                  <div className="flex justify-between"><span>Daily capacity limit:</span><span>{selectedConsultant.daily_capacity_hours || 8}h</span></div>
                  <div className="flex justify-between"><span>Weekly capacity limit:</span><span>{selectedConsultant.weekly_capacity_hours || 40}h</span></div>
                  <div className="flex justify-between"><span>Monthly capacity limit:</span><span>{selectedConsultant.monthly_capacity_hours || 160}h</span></div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded font-mono text-[11px] space-y-1">
                  <span className="font-bold text-zinc-700 uppercase tracking-wider text-[9px] block mb-1">Structure hierarchies</span>
                  <div className="flex justify-between"><span>Reporting Manager:</span><span>{profiles.find(p => p.id === selectedConsultant.reporting_manager_id)?.full_name || 'None Assigned'}</span></div>
                  <div className="flex justify-between"><span>Team Lead Advisor:</span><span>{profiles.find(p => p.id === selectedConsultant.team_lead_id)?.full_name || 'None Assigned'}</span></div>
                </div>
              </div>

              <DialogFooter className="mt-6 border-t border-zinc-200 pt-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedConsultant(null)} className="cursor-pointer">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          PASSWORD MANAGEMENT PANEL
         ------------------------------------------------------------- */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 p-6 rounded-lg font-sans text-xs">
          <DialogHeader className="border-b border-zinc-200 pb-3 mb-4">
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <Lock size={15} /> Credential Governance Panel
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded font-mono text-[10px] text-zinc-650">
              <span className="font-bold uppercase tracking-wider text-zinc-700 block mb-1">Target Account Profile:</span>
              <div>Name: {pwdUserSelected?.full_name}</div>
              <div>Email: {pwdUserSelected?.email}</div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-zinc-700 uppercase tracking-wider text-[10px]">Governance Policy</Label>
              <Select value={pwdResetOption} onValueChange={(val: any) => setPwdResetOption(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temp">Generate Secure Temporary Password</SelectItem>
                  <SelectItem value="manual">Manually Overwrite Password</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pwdResetOption === 'manual' && (
              <div className="space-y-1.5">
                <Label className="font-semibold text-zinc-700">Overwrite Password</Label>
                <Input 
                  type="password" 
                  value={pwdManualValue} 
                  onChange={(e) => setPwdManualValue(e.target.value)} 
                  placeholder="Min. 8 characters" 
                  className="text-xs font-mono" 
                  required
                />
              </div>
            )}

            {pwdGeneratedTemp && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-center space-y-2">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">Temporary Password Registry</span>
                <span className="text-sm font-mono font-bold bg-white px-3 py-1.5 border border-emerald-250 rounded block select-all">
                  {pwdGeneratedTemp}
                </span>
                <span className="text-[9px] text-zinc-500 block">Copy this temporary password and deliver it to the user. They will be forced to change it on their next login.</span>
              </div>
            )}

            <DialogFooter className="border-t border-zinc-200 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPasswordDialogOpen(false)} className="cursor-pointer">Close</Button>
              <Button type="submit" size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                {pwdResetOption === 'temp' ? 'Generate Password' : 'Apply Overwrite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
