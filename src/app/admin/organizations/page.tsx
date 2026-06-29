'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { 
  Building2, Plus, Globe, ShieldCheck, Mail, Phone, Users, 
  AlertTriangle, Clock, HeartHandshake, Eye, Award, FileText,
  FileSpreadsheet, Edit3, Trash2, ShieldAlert, KeyRound, CheckCircle2,
  Calendar, DollarSign, BarChart3, ChevronRight, Lock, CheckCircle,
  FolderMinus, Play, Pause, ChevronLeft, Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Progress } from '../../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Separator } from '../../../components/ui/separator';
import { toast } from 'sonner';
import { provisionUser, resetUserPasswordAdmin, adminUpdatePasswordDirect } from '../../actions/auth';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend } from 'recharts';
import { PageHeader } from '../../../components/ui/page-header';

interface OrgDetail {
  id: string;
  name: string;
  domain: string;
  customer_short_code?: string;
  legal_name?: string;
  registration_number?: string;
  tax_number?: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  logo_url?: string;
  status?: string;
  notes?: string;
  internal_comments?: string;
  sla_template?: string;
  sla_critical_hours?: number;
  sla_high_hours?: number;
  sla_medium_hours?: number;
  sla_low_hours?: number;
  industry?: string;
}

export default function AdminOrganizationsPage() {
  const { tickets, contracts, refetchData } = useTickets();
  const [organizations, setOrganizations] = useState<OrgDetail[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected organization for Customer 360 View
  const [selectedOrg, setSelectedOrg] = useState<OrgDetail | null>(null);

  // Wizards & Dialogs State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);

  // -------------------------------------------------------------
  // Step Wizard Forms State
  // -------------------------------------------------------------
  // Section 1 - Company Information
  const [compName, setCompName] = useState('');
  const [compShortCode, setCompShortCode] = useState('');
  const [compLegalName, setCompLegalName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compRegNumber, setCompRegNumber] = useState('');
  const [compTaxNumber, setCompTaxNumber] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compCountry, setCompCountry] = useState('');
  const [compCity, setCompCity] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compLogoUrl, setCompLogoUrl] = useState('');

  // Section 2 - Contact Information
  const [contPerson, setContPerson] = useState('');
  const [contDesignation, setContDesignation] = useState('');
  const [contEmail, setContEmail] = useState('');
  const [contMobile, setContMobile] = useState('');
  const [contAltPhone, setContAltPhone] = useState('');

  // Section 3 - Contract Information
  const [contractType, setContractType] = useState('AMS');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractValue, setContractValue] = useState('0');
  const [contractMonthlyHours, setContractMonthlyHours] = useState('20');
  const [contractAnnualHours, setContractAnnualHours] = useState('240');

  // Section 4 - SLA & Governance
  const [slaTemplate, setSlaTemplate] = useState('Standard');
  const [slaCritical, setSlaCritical] = useState('8');
  const [slaHigh, setSlaHigh] = useState('16');
  const [slaMedium, setSlaMedium] = useState('32');
  const [slaLow, setSlaLow] = useState('64');

  // Section 5 - Access Management
  const [accessUsername, setAccessUsername] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessStatus, setAccessStatus] = useState('Active');

  // Section 6 - Internal Notes
  const [internalNotes, setInternalNotes] = useState('');
  const [internalComments, setInternalComments] = useState('');

  // Password Reset / Update Forms State
  const [pwdUserSelected, setPwdUserSelected] = useState<any | null>(null);
  const [pwdOption, setPwdOption] = useState<'temp' | 'manual'>('temp');
  const [pwdManualValue, setPwdManualValue] = useState('');
  const [pwdGeneratedTemp, setPwdGeneratedTemp] = useState('');

  // Edit Form State
  const [editNotes, setEditNotes] = useState('');
  const [editComments, setEditComments] = useState('');

  // Extend Contract State
  const [extendEnd, setExtendEnd] = useState('');
  const [extendValue, setExtendValue] = useState('0');

  // Load telemetry
  const fetchAllData = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: orgData, error: orgErr } = await supabase
          .from('organizations')
          .select('*')
          .order('name');
        if (orgErr) throw orgErr;
        setOrganizations(orgData || []);

        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*');
        if (profErr) throw profErr;
        setProfiles(profData || []);
      } catch (err: unknown) {
        console.error('Error fetching customers directory:', err);
        toast.error(`Database retrieval failed: ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Offline local simulations
      setOrganizations([
        { 
          id: 'org-1', name: 'Apex Global Industries', domain: 'apex-global.com', 
          customer_short_code: 'APX', status: 'Active', country: 'United States', city: 'Dallas',
          industry: 'Manufacturing', website: 'www.apex-global.com', sla_template: 'Standard'
        },
        { 
          id: 'org-2', name: 'Titan Energy Corp', domain: 'titanenergy.io', 
          customer_short_code: 'TTN', status: 'Active', country: 'Germany', city: 'Frankfurt',
          industry: 'Energy', website: 'www.titanenergy.io', sla_template: 'Premium'
        }
      ]);
      setProfiles([
        { id: 'mgr-1', full_name: 'Alexander Sterling', role: 'Manager' },
        { id: 'usr-1', full_name: 'Sarah Connor', role: 'Customer', organization_id: 'org-1', email: 'sarah@apex-global.com', is_active: true }
      ]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Sync state on real-time database refreshes
  useEffect(() => {
    if (selectedOrg) {
      const refreshed = organizations.find(o => o.id === selectedOrg.id);
      if (refreshed) setSelectedOrg(refreshed);
    }
  }, [organizations]);

  // SLA Health helper — engine sla_status (single source of truth), mapped to the
  // org-360 Healthy/Warning/Breached vocabulary. No wall-clock recompute.
  const getTicketSlaStatus = (ticket: any) => {
    if (!ticket.slaDueAt || ticket.slaDueAt === 'SLA Not Applicable') return 'Healthy';
    switch (ticket.slaStatus) {
      case 'Breached': return 'Breached';
      case 'At Risk': return 'Warning';
      case 'On Track':
      case 'Met':
      case 'Not Started':
      default: return 'Healthy';
    }
  };

  // -------------------------------------------------------------
  // Computations for Customer 360 Dashboard Panel
  // -------------------------------------------------------------
  const org360 = useMemo(() => {
    if (!selectedOrg) return null;

    // Filter tickets related to this org
    const orgTickets = tickets.filter(t => t.organizationId === selectedOrg.id || t.organization === selectedOrg.name);
    
    // Status splits
    const openTickets = orgTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    const closedTickets = orgTickets.filter(t => t.status === 'Closed');
    const escalatedTickets = orgTickets.filter(t => t.status === 'Escalated' || t.isEscalated);
    
    // Pending approvals (status closure requests that are pending manager review)
    const pendingApprovals = orgTickets.filter(t => t.closureStatus === 'Pending' || t.status === 'Request for Closure');
    const reopenedTickets = orgTickets.filter(t => t.reopenedCount != null && t.reopenedCount > 0);

    // SLA counters
    let breachedCount = 0;
    let healthyCount = 0;
    let warningCount = 0;
    orgTickets.forEach(t => {
      if (t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable') {
        const stat = getTicketSlaStatus(t);
        if (stat === 'Breached') breachedCount++;
        else if (stat === 'Warning') warningCount++;
        else healthyCount++;
      }
    });

    const monitoredCount = breachedCount + healthyCount + warningCount;
    const compliancePct = monitoredCount > 0 
      ? Math.round(((monitoredCount - breachedCount) / monitoredCount) * 100)
      : 100;

    // Find contract
    const contract = contracts.find(c => c.customerId === selectedOrg.id || c.organizationName === selectedOrg.name);

    // Dynamic calculations from contract metrics
    const approvedActualHours = contract?.usedHours || 0;
    const remainingHours = contract ? Math.max(0, contract.totalHours - approvedActualHours) : 0;
    const monthlyUtilization = contract?.monthlyUtilizationPct || 0;
    const annualUtilization = contract?.annualUtilizationPct || 0;
    const projectedExhaustion = contract?.projectedExhaustion || 'Never';

    // Users belonging to this org
    const orgUsers = profiles.filter(p => p.organization_id === selectedOrg.id);
    const primaryContact = orgUsers.find(u => u.role === 'Customer' && u.is_active) || orgUsers[0];

    return {
      ticketsCount: orgTickets.length,
      openTickets: openTickets.length,
      closedTickets: closedTickets.length,
      escalatedTickets: escalatedTickets.length,
      pendingApprovals: pendingApprovals.length,
      reopenedTickets: reopenedTickets.length,
      
      slaCompliance: compliancePct,
      slaBreached: breachedCount,
      slaHealthy: healthyCount,
      slaWarning: warningCount,

      contract,
      approvedActualHours,
      remainingHours,
      monthlyUtilization,
      annualUtilization,
      projectedExhaustion,
      users: orgUsers,
      primaryContact
    };
  }, [selectedOrg, tickets, contracts, profiles]);

  // -------------------------------------------------------------
  // Creation Wizard Actions
  // -------------------------------------------------------------
  const handleOpenWizard = () => {
    setWizardStep(1);
    // Clear forms
    setCompName('');
    setCompShortCode('');
    setCompLegalName('');
    setCompIndustry('');
    setCompRegNumber('');
    setCompTaxNumber('');
    setCompWebsite('');
    setCompCountry('');
    setCompCity('');
    setCompAddress('');
    setCompLogoUrl('');

    setContPerson('');
    setContDesignation('Primary Contact');
    setContEmail('');
    setContMobile('');
    setContAltPhone('');

    setContractType('AMS');
    setContractStart('');
    setContractEnd('');
    setContractValue('0');
    setContractMonthlyHours('20');
    setContractAnnualHours('240');

    setSlaTemplate('Standard');
    setSlaCritical('8');
    setSlaHigh('16');
    setSlaMedium('32');
    setSlaLow('64');

    setAccessUsername('');
    setAccessPassword('');
    setAccessStatus('Active');

    setInternalNotes('');
    setInternalComments('');

    setWizardOpen(true);
  };

  const validateWizardStep = () => {
    if (wizardStep === 1) {
      if (!compName.trim()) { toast.error('Company Name is required.'); return false; }
      if (!compShortCode.trim() || !/^[A-Z0-9]{2,6}$/.test(compShortCode.trim().toUpperCase())) {
        toast.error('Short Code must be 2 to 6 alphanumeric characters.');
        return false;
      }
    } else if (wizardStep === 2) {
      if (!contPerson.trim()) { toast.error('Contact Person is required.'); return false; }
      if (!contEmail.trim() || !contEmail.includes('@')) { toast.error('Valid contact email is required.'); return false; }
    } else if (wizardStep === 3) {
      if (!contractStart || !contractEnd) { toast.error('Contract dates are required.'); return false; }
    } else if (wizardStep === 5) {
      if (!accessUsername.trim() || !accessUsername.includes('@')) { toast.error('Valid login email username is required.'); return false; }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateWizardStep()) {
      if (wizardStep === 2 && !accessUsername) {
        setAccessUsername(contEmail); // Auto-populate access email
      }
      setWizardStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setWizardStep(prev => Math.max(1, prev - 1));
  };

  const handleWizardSubmit = async () => {
    if (!validateWizardStep()) return;
    const toastId = toast.loading(`Provisioning customer organization ${compName}...`);

    try {
      const payload = {
        email: accessUsername.trim().toLowerCase(),
        fullName: contPerson.trim(),
        role: 'Customer' as const,
        initialPassword: accessPassword.trim() || undefined,
        
        companyName: compName.trim(),
        customerShortCode: compShortCode.trim().toUpperCase(),
        address: compAddress.trim() || undefined,
        industry: compIndustry.trim() || undefined,
        phoneNumber: contMobile.trim() || undefined,
        alternatePhone: contAltPhone.trim() || undefined,
        designation: contDesignation.trim() || undefined,
        
        contractType,
        contractHours: parseFloat(contractAnnualHours) || 240,
        contractStartDate: contractStart || undefined,
        contractEndDate: contractEnd || undefined,
        monthlyAllocatedHours: parseFloat(contractMonthlyHours) || 20,
        contractStatus: accessStatus,
        loginEnabled: accessStatus === 'Active',
        contractValue: parseFloat(contractValue) || 0.00,

        legalName: compLegalName.trim() || undefined,
        registrationNumber: compRegNumber.trim() || undefined,
        taxNumber: compTaxNumber.trim() || undefined,
        website: compWebsite.trim() || undefined,
        country: compCountry.trim() || undefined,
        city: compCity.trim() || undefined,
        logoUrl: compLogoUrl.trim() || undefined,
        notes: internalNotes.trim() || undefined,
        internalComments: internalComments.trim() || undefined,
        slaTemplate,
        slaCriticalHours: parseFloat(slaCritical) || 8.00,
        slaHighHours: parseFloat(slaHigh) || 16.00,
        slaMediumHours: parseFloat(slaMedium) || 32.00,
        slaLowHours: parseFloat(slaLow) || 64.00
      };

      const res = await provisionUser(payload);
      if (res.success) {
        toast.success(`Customer ${compName} registered successfully!`, { id: toastId });
        setWizardOpen(false);
        await refetchData();
        await fetchAllData();
      } else {
        throw new Error(res.error);
      }
    } catch (e: unknown) {
      toast.error(`Setup failed: ${getErrorMessage(e)}`, { id: toastId });
    }
  };

  // -------------------------------------------------------------
  // Organization Status Controllers
  // -------------------------------------------------------------
  const updateOrgStatus = async (id: string, newStatus: string) => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured.');
      return;
    }
    const toastId = toast.loading(`Updating organization status to ${newStatus}...`);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Organization status changed to ${newStatus}`, { id: toastId });
      await fetchAllData();
    } catch (err: unknown) {
      toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  const deleteOrganization = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this customer? All organization profiles and contracts will cascade delete.')) {
      return;
    }
    const toastId = toast.loading('Removing customer from registry...');
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Customer deleted successfully.', { id: toastId });
      setSelectedOrg(null);
      await refetchData();
      await fetchAllData();
    } catch (err: unknown) {
      toast.error(`Deletion failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  // -------------------------------------------------------------
  // Edit Notes & Comments
  // -------------------------------------------------------------
  const handleOpenEdit = () => {
    if (!selectedOrg) return;
    setEditNotes(selectedOrg.notes || '');
    setEditComments(selectedOrg.internal_comments || '');
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    const toastId = toast.loading('Saving internal audits...');
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          notes: editNotes,
          internal_comments: editComments
        })
        .eq('id', selectedOrg.id);
      if (error) throw error;
      toast.success('Audits updated successfully.', { id: toastId });
      setEditDialogOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  // -------------------------------------------------------------
  // Password Management Handlers
  // -------------------------------------------------------------
  const handleOpenPassword = (userObj: any) => {
    setPwdUserSelected(userObj);
    setPwdOption('temp');
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
      if (pwdOption === 'temp') {
        const res = await resetUserPasswordAdmin(pwdUserSelected.id, 'SuperAdmin');
        if (!res.success) throw new Error(res.error);
        tempPass = res.password || '';
        setPwdGeneratedTemp(tempPass);
        toast.success('Temporary credentials generated successfully. Copy before closing.', { id: toastId });
      } else {
        if (!pwdManualValue.trim() || pwdManualValue.length < 12) {
          throw new Error('Password must be at least 12 characters long.');
        }
        const res = await adminUpdatePasswordDirect(pwdUserSelected.id, pwdManualValue, 'SuperAdmin');
        if (!res.success) throw new Error(res.error);
        toast.success('Credentials updated directly.', { id: toastId });
        setPasswordDialogOpen(false);
      }
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Credential update failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  // -------------------------------------------------------------
  // Contract Extension
  // -------------------------------------------------------------
  const handleOpenExtend = () => {
    if (!org360?.contract) {
      toast.error('No active contract found to extend.');
      return;
    }
    setExtendEnd(org360.contract.endDate);
    setExtendValue(org360.contract.contractValue ? org360.contract.contractValue.toString() : '0');
    setExtendDialogOpen(true);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org360?.contract) return;
    const toastId = toast.loading('Extending contract agreement...');
    try {
      const { error } = await supabase
        .from('customer_contracts')
        .update({
          end_date: extendEnd,
          contract_value: parseFloat(extendValue) || 0.00
        })
        .eq('id', org360.contract.id);
      if (error) throw error;
      toast.success('Contract agreement extended successfully.', { id: toastId });
      setExtendDialogOpen(false);
      await refetchData();
      await fetchAllData();
    } catch (err: unknown) {
      toast.error(`Extension failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  // -------------------------------------------------------------
  // Export Telemetry
  // -------------------------------------------------------------
  const handleExportCustomer = () => {
    if (!selectedOrg || !org360) return;
    
    // Construct CSV content
    const csvContent = [
      ['Customer 360 Registry Export', selectedOrg.name],
      [],
      ['Company Name', selectedOrg.name],
      ['Short Code', selectedOrg.customer_short_code || 'N/A'],
      ['Domain', selectedOrg.domain || 'N/A'],
      ['Website', selectedOrg.website || 'N/A'],
      ['Country', selectedOrg.country || 'N/A'],
      ['City', selectedOrg.city || 'N/A'],
      ['Status', selectedOrg.status || 'Active'],
      [],
      ['Contract Type', org360.contract?.contractType || 'N/A'],
      ['Contract Start', org360.contract?.startDate || 'N/A'],
      ['Contract End', org360.contract?.endDate || 'N/A'],
      ['Contract Value', org360.contract?.contractValue ? `$${org360.contract.contractValue}` : 'N/A'],
      ['Hourly capacity Pool', org360.contract?.totalHours || '0'],
      [],
      ['SLA Compliance Pct', `${org360.slaCompliance}%`],
      ['SLA Breached Incidents', org360.slaBreached],
      ['SLA Healthy Incidents', org360.slaHealthy],
      ['SLA Warning Incidents', org360.slaWarning],
      [],
      ['Total Approved Actual Hours', org360.approvedActualHours],
      ['Remaining Capacity Hours', org360.remainingHours]
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `customer_telemetry_${selectedOrg.customer_short_code || selectedOrg.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Telemetry exported successfully.');
  };

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (!org360?.contract) return [];
    return [
      {
        name: 'Annual Hour Pool',
        Budget: org360.contract.totalHours,
        Consumed: org360.approvedActualHours
      },
      {
        name: 'Monthly Target',
        Budget: org360.contract.monthlyBudgetHours,
        Consumed: org360.contract.monthlyUsedHours || 0
      }
    ];
  }, [org360]);

  return (
    <div className="space-y-6 font-sans text-sm text-ink pb-16">
      
      {/* Header */}
      <PageHeader
        title="Customer 360 Workspace"
        description="Audit customer telemetry, analyze SLA performance index, and track contract hour burn rates."
        actions={
          <Button onClick={handleOpenWizard} className="gap-1.5 rounded-md">
            <Plus size={13} />
            Register Customer
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Pane: Customers Directory */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-line">
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Customer Directory</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-ink-muted italic">Retrieving customer profiles...</div>
              ) : organizations.length === 0 ? (
                <div className="py-8 text-center text-ink-muted italic">No organizations found.</div>
              ) : (
                organizations.map(org => {
                  const isSelected = selectedOrg?.id === org.id;
                  const activeContract = contracts.find(c => c.customerId === org.id);
                  const isArchived = org.status === 'Archived';
                  
                  return (
                    <div
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={`p-3 border rounded-lg hover:shadow-card cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-zinc-900 ring-1 ring-zinc-900 bg-surface-muted/60' 
                          : 'border-line bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 size={15} className="text-ink-muted" />
                          <span className="font-semibold text-ink text-xs">{org.name}</span>
                          {org.customer_short_code && (
                            <Badge variant="outline" className="text-[11px] px-1 py-0 px-1.5 text-ink-secondary border-line-strong">
                              {org.customer_short_code}
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            org.status === 'Active' ? 'bg-success-soft text-success-strong' :
                            org.status === 'Inactive' ? 'bg-warning-soft text-warning-strong' :
                            'bg-surface-subtle text-ink-muted'
                          }`}
                        >
                          {org.status || 'Active'}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-ink-muted mt-3 pt-2 border-t border-line">
                        <span className="flex items-center gap-1.5">
                          <Globe size={12} />
                          {org.domain || 'no domain mapping'}
                        </span>
                        <span>
                          {activeContract ? activeContract.contractType : 'No Contract'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Customer 360 Detailed Dashboard */}
        <div className="lg:col-span-2">
          {selectedOrg && org360 ? (
            <div className="space-y-6">
              
              {/* Profile Overview Card */}
              <Card className="border-line">
                <CardHeader className="py-5 px-6 border-b border-line bg-surface-muted/20">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {selectedOrg.logo_url ? (
                          <img src={selectedOrg.logo_url} alt="Logo" className="w-8 h-8 rounded border object-contain bg-surface" />
                        ) : (
                          <div className="w-8 h-8 rounded border bg-surface-subtle flex items-center justify-center font-bold text-ink-secondary text-xs">
                            {selectedOrg.name[0]}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
                            {selectedOrg.name}
                            {selectedOrg.customer_short_code && (
                              <span className="text-xs text-ink-muted font-normal">[{selectedOrg.customer_short_code}]</span>
                            )}
                          </CardTitle>
                          <div className="text-ink-secondary text-[11px] flex items-center gap-3">
                            <span className="flex items-center gap-1"><Globe size={12} /> {selectedOrg.domain || 'N/A'}</span>
                            <span>| Industry: {selectedOrg.industry || 'N/A'}</span>
                            <span>| Location: {selectedOrg.city || 'N/A'}, {selectedOrg.country || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 cursor-pointer" onClick={handleOpenEdit}>
                        <Edit3 size={13} /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 text-ink-secondary cursor-pointer" onClick={handleExportCustomer}>
                        <Download size={13} /> Export
                      </Button>
                      
                      {selectedOrg.status !== 'Active' && (
                        <Button variant="outline" size="sm" className="text-xs text-success border-success-border hover:bg-success-soft cursor-pointer" onClick={() => updateOrgStatus(selectedOrg.id, 'Active')}>
                          <Play size={12} className="mr-1" /> Activate
                        </Button>
                      )}
                      {selectedOrg.status === 'Active' && (
                        <Button variant="outline" size="sm" className="text-xs text-warning border-warning-border hover:bg-warning-soft cursor-pointer" onClick={() => updateOrgStatus(selectedOrg.id, 'Inactive')}>
                          <Pause size={12} className="mr-1" /> Deactivate
                        </Button>
                      )}
                      {selectedOrg.status !== 'Archived' && (
                        <Button variant="outline" size="sm" className="text-xs text-ink-secondary cursor-pointer" onClick={() => updateOrgStatus(selectedOrg.id, 'Archived')}>
                          <FolderMinus size={12} className="mr-1" /> Archive
                        </Button>
                      )}

                      <Button variant="outline" size="sm" className="text-xs text-critical border-critical-border hover:bg-critical-soft cursor-pointer" onClick={() => deleteOrganization(selectedOrg.id)}>
                        <Trash2 size={13} /> Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <Tabs defaultValue="telemetry">
                    <TabsList className="grid w-full grid-cols-4 mb-6 border-b border-line bg-surface-subtle/60 p-1 rounded-lg">
                      <TabsTrigger value="telemetry" className="text-xs font-semibold py-2">Telemetry Cockpit</TabsTrigger>
                      <TabsTrigger value="contract" className="text-xs font-semibold py-2">Contract & SLA</TabsTrigger>
                      <TabsTrigger value="access" className="text-xs font-semibold py-2">Access Control</TabsTrigger>
                      <TabsTrigger value="audit" className="text-xs font-semibold py-2">Internal Auditing</TabsTrigger>
                    </TabsList>

                    {/* TELEMETRY COCKPIT TAB */}
                    <TabsContent value="telemetry" className="space-y-6">
                      
                      {/* Numeric indicators */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-surface-muted border border-line rounded-lg">
                          <span className="text-[11px] text-ink-muted font-bold uppercase tracking-wider block">SLA Compliance</span>
                          <span className="text-xl font-bold text-ink mt-1 block flex items-center gap-1.5">
                            {org360.slaCompliance}%
                            <span className={`h-2 w-2 rounded-full ${org360.slaCompliance >= 95 ? 'bg-emerald-500' : org360.slaCompliance >= 85 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          </span>
                          <span className="text-[11px] text-ink-muted block mt-1">({org360.slaBreached} Breached)</span>
                        </div>

                        <div className="p-4 bg-surface-muted border border-line rounded-lg">
                          <span className="text-[11px] text-ink-muted font-bold uppercase tracking-wider block">Approved Actual Hours</span>
                          <span className="text-xl font-bold text-ink mt-1 block">
                            {org360.approvedActualHours.toFixed(1)}h
                          </span>
                          <span className="text-[11px] text-ink-muted block mt-1">/ {org360.contract ? org360.contract.totalHours : 0}h Total</span>
                        </div>

                        <div className="p-4 bg-surface-muted border border-line rounded-lg">
                          <span className="text-[11px] text-ink-muted font-bold uppercase tracking-wider block">Remaining Capacity</span>
                          <span className="text-xl font-bold text-ink mt-1 block flex items-center gap-1.5">
                            {org360.remainingHours.toFixed(1)}h
                          </span>
                          <span className="text-[11px] text-ink-muted block mt-1">Remaining pool hours</span>
                        </div>

                        <div className="p-4 bg-surface-muted border border-line rounded-lg">
                          <span className="text-[11px] text-ink-muted font-bold uppercase tracking-wider block">Projected Exhaustion</span>
                          <span className={`text-sm font-bold mt-2.5 block ${org360.projectedExhaustion === 'Exhausted' ? 'text-critical' : 'text-ink'}`}>
                            {org360.projectedExhaustion === 'Never' ? 'Stable Burn' : org360.projectedExhaustion}
                          </span>
                        </div>
                      </div>

                      {/* Ticket stats counters */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3 bg-surface-muted/60 border border-line rounded-lg text-center">
                          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Open Tickets</span>
                          <span className="text-lg font-bold text-ink mt-1 block">{org360.openTickets}</span>
                        </div>
                        <div className="p-3 bg-surface-muted/60 border border-line rounded-lg text-center">
                          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Closed Tickets</span>
                          <span className="text-lg font-bold text-ink mt-1 block">{org360.closedTickets}</span>
                        </div>
                        <div className="p-3 bg-surface-muted/60 border border-line rounded-lg text-center">
                          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Escalated</span>
                          <span className={`text-lg font-bold mt-1 block ${org360.escalatedTickets > 0 ? 'text-critical' : 'text-ink'}`}>{org360.escalatedTickets}</span>
                        </div>
                        <div className="p-3 bg-surface-muted/60 border border-line rounded-lg text-center">
                          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Awaiting Approval</span>
                          <span className="text-lg font-bold text-ink mt-1 block">{org360.pendingApprovals}</span>
                        </div>
                        <div className="p-3 bg-surface-muted/60 border border-line rounded-lg text-center">
                          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Reopened</span>
                          <span className="text-lg font-bold text-ink mt-1 block">{org360.reopenedTickets}</span>
                        </div>
                      </div>

                      {/* SLA metrics */}
                      <div className="p-4 bg-surface-muted border border-line rounded-lg space-y-3">
                        <div className="flex items-center justify-between border-b border-line pb-2">
                          <h4 className="font-semibold text-xs text-ink-secondary">SLA Incident Telemetry Matrix</h4>
                          <span className="text-[11px] font-bold text-ink-secondary">Compliance score: {org360.slaCompliance}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <span className="text-[11px] font-bold text-ink-muted uppercase block">Healthy SLA</span>
                            <span className="text-sm font-bold text-success-strong mt-1 block">{org360.slaHealthy}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-ink-muted uppercase block">Warning SLA</span>
                            <span className="text-sm font-bold text-warning-strong mt-1 block">{org360.slaWarning}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-ink-muted uppercase block">Breached SLA</span>
                            <span className="text-sm font-bold text-critical-strong mt-1 block">{org360.slaBreached}</span>
                          </div>
                        </div>
                      </div>

                      {/* Organization Details list */}
                      <div className="border border-line rounded-lg overflow-hidden">
                        <div className="bg-surface-muted py-2.5 px-4 border-b border-line">
                          <h4 className="font-semibold text-xs text-ink-secondary">Organization Identity Registry</h4>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <div className="flex justify-between py-1 border-b border-line"><span className="text-ink-secondary font-semibold">Legal Name:</span><span className="text-ink">{selectedOrg.legal_name || 'N/A'}</span></div>
                            <div className="flex justify-between py-1 border-b border-line"><span className="text-ink-secondary font-semibold">Tax Registry ID:</span><span className="text-ink">{selectedOrg.tax_number || 'N/A'}</span></div>
                            <div className="flex justify-between py-1 border-b border-line"><span className="text-ink-secondary font-semibold">Reg. Identifier:</span><span className="text-ink">{selectedOrg.registration_number || 'N/A'}</span></div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between py-1 border-b border-line"><span className="text-ink-secondary font-semibold">Website:</span><a href={selectedOrg.website ? `https://${selectedOrg.website}` : '#'} target="_blank" className="text-info hover:underline">{selectedOrg.website || 'N/A'}</a></div>
                            <div className="flex justify-between py-1 border-b border-line"><span className="text-ink-secondary font-semibold">Location Address:</span><span className="text-ink text-right truncate max-w-[200px]">{selectedOrg.address || 'N/A'}</span></div>
                            <div className="flex justify-between py-1 border-b border-line"><span className="text-ink-secondary font-semibold">Primary contact point:</span><span className="text-ink font-medium">{org360.primaryContact?.full_name || 'N/A'}</span></div>
                          </div>
                        </div>
                      </div>

                    </TabsContent>

                    {/* CONTRACT & SLA TAB */}
                    <TabsContent value="contract" className="space-y-6">
                      {org360.contract ? (
                        <div className="space-y-6">
                          
                          {/* Hours Burn Chart */}
                          <Card className="border-line">
                            <CardHeader className="py-4 px-5 border-b border-line">
                              <CardTitle className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Hourly Capacity Burn Rate</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Bar dataKey="Budget" fill="#52525b" name="Allocated Hours" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Consumed" fill="#09090b" name="Approved Logged Hours" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Details and gauges */}
                          <div className="p-5 bg-surface-muted border border-line rounded-lg space-y-4 shadow-card">
                            <div className="flex items-center justify-between border-b border-line pb-3">
                              <div>
                                <h4 className="font-semibold text-xs text-ink-secondary uppercase">Active Contract Accounting</h4>
                                <span className="text-[11px] text-ink-muted">ID: {org360.contract.id}</span>
                              </div>
                              <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={handleOpenExtend}>
                                <Calendar size={13} className="mr-1.5" /> Extend Agreement
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-ink-muted block text-[11px] uppercase font-bold">Contract Category</span>
                                <span className="font-bold text-ink">{org360.contract.contractType}</span>
                              </div>
                              <div>
                                <span className="text-ink-muted block text-[11px] uppercase font-bold">Agreement Start</span>
                                <span className="font-bold text-ink">{org360.contract.startDate}</span>
                              </div>
                              <div>
                                <span className="text-ink-muted block text-[11px] uppercase font-bold">Agreement End</span>
                                <span className="font-bold text-ink">{org360.contract.endDate}</span>
                              </div>
                              <div>
                                <span className="text-ink-muted block text-[11px] uppercase font-bold">Contract Value</span>
                                <span className="font-bold text-ink">${org360.contract.contractValue ? org360.contract.contractValue.toLocaleString() : '0.00'}</span>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-2.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Monthly Hours Burn Progress</span>
                                <span className="">{org360.contract.monthlyUsedHours?.toFixed(1) || '0.0'}h / {org360.contract.monthlyBudgetHours}h ({(org360.monthlyUtilization ?? 0).toFixed(1)}%)</span>
                              </div>
                              <Progress value={Math.min(100, org360.monthlyUtilization)} className="h-1.5 bg-zinc-200" />
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Annual Hours Burn Progress</span>
                                <span className="">{org360.approvedActualHours.toFixed(1)}h / {org360.contract.totalHours}h ({org360.annualUtilization.toFixed(1)}%)</span>
                              </div>
                              <Progress value={Math.min(100, org360.annualUtilization)} className="h-1.5 bg-zinc-200" />
                            </div>
                          </div>

                          {/* SLA configuration override profile */}
                          <div className="border border-line rounded-lg overflow-hidden">
                            <div className="bg-surface-muted py-2.5 px-4 border-b border-line">
                              <h4 className="font-semibold text-xs text-ink-secondary">Customer SLA Override Configuration</h4>
                            </div>
                            <div className="p-4 text-xs space-y-4">
                              <div className="flex justify-between items-center"><span className="text-ink-secondary font-semibold">SLA Policy Template:</span><Badge variant="outline">{selectedOrg.sla_template || 'Standard'}</Badge></div>
                              <div className="grid grid-cols-4 gap-3 text-center">
                                <div className="p-2 border border-line rounded bg-surface">
                                  <span className="text-[11px] font-bold text-critical block uppercase">Critical</span>
                                  <span className="text-sm font-bold mt-1 block">{selectedOrg.sla_critical_hours != null ? selectedOrg.sla_critical_hours : 8} Hrs</span>
                                </div>
                                <div className="p-2 border border-line rounded bg-surface">
                                  <span className="text-[11px] font-bold text-warning block uppercase">High</span>
                                  <span className="text-sm font-bold mt-1 block">{selectedOrg.sla_high_hours != null ? selectedOrg.sla_high_hours : 16} Hrs</span>
                                </div>
                                <div className="p-2 border border-line rounded bg-surface">
                                  <span className="text-[11px] font-bold text-ink-secondary block uppercase">Medium</span>
                                  <span className="text-sm font-bold mt-1 block">{selectedOrg.sla_medium_hours != null ? selectedOrg.sla_medium_hours : 32} Hrs</span>
                                </div>
                                <div className="p-2 border border-line rounded bg-surface">
                                  <span className="text-[11px] font-bold text-ink-muted block uppercase">Low</span>
                                  <span className="text-sm font-bold mt-1 block">{selectedOrg.sla_low_hours != null ? selectedOrg.sla_low_hours : 64} Hrs</span>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="p-8 text-center text-ink-muted italic border border-dashed border-line rounded-lg">
                          No active contract setup for this customer.
                        </div>
                      )}
                    </TabsContent>

                    {/* ACCESS CONTROL TAB */}
                    <TabsContent value="access" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-ink-secondary">Customer Profile Accounts ({org360.users.length})</h4>
                      </div>

                      {org360.users.length === 0 ? (
                        <div className="p-8 text-center text-ink-muted italic border border-dashed border-line rounded-lg">
                          No customer users linked to this organization.
                        </div>
                      ) : (
                        <div className="border border-line rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-surface-muted">
                              <TableRow>
                                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-2">Account Name</TableHead>
                                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-2">Username/Email</TableHead>
                                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-2">Status</TableHead>
                                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-2 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {org360.users.map((u: any) => (
                                <TableRow key={u.id}>
                                  <TableCell className="py-2 text-xs font-semibold">{u.full_name}</TableCell>
                                  <TableCell className="py-2 text-xs text-ink-secondary">{u.email}</TableCell>
                                  <TableCell className="py-2 text-xs">
                                    <Badge variant="secondary" className={u.is_active ? 'bg-success-soft text-success-strong' : 'bg-critical-soft text-critical-strong'}>
                                      {u.is_active ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2 text-xs text-right">
                                    <Button variant="outline" size="sm" className="text-[11px] px-2 py-1.5 cursor-pointer" onClick={() => handleOpenPassword(u)}>
                                      <KeyRound size={11} className="mr-1" /> Password
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    {/* INTERNAL AUDITING TAB */}
                    <TabsContent value="audit" className="space-y-4">
                      <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-ink-secondary uppercase tracking-wider text-[11px]">Internal Notes</Label>
                          <Textarea 
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add strategic client alignment notes..."
                            className="text-xs bg-surface border border-line rounded min-h-[100px]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="font-semibold text-ink-secondary uppercase tracking-wider text-[11px]">Administrative Comments</Label>
                          <Textarea 
                            value={editComments}
                            onChange={(e) => setEditComments(e.target.value)}
                            placeholder="Add internal SLA performance history comments..."
                            className="text-xs bg-surface border border-line rounded min-h-[100px]"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button type="submit" className="bg-ink hover:bg-zinc-800 text-white text-xs cursor-pointer">
                            Save Audit Notes
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

            </div>
          ) : (
            <Card className="border-line border-dashed py-24 text-center text-ink-muted shadow-card">
              <CardContent className="space-y-2">
                <Building2 className="mx-auto text-ink-muted mb-2" size={36} />
                <span>Select a customer organization to inspect 360 telemetry.</span>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* -------------------------------------------------------------
          6-STEP CUSTOMER CREATION WIZARD DIALOG
         ------------------------------------------------------------- */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl bg-surface border border-line p-6 rounded-lg font-sans text-xs">
          <DialogHeader className="border-b border-line pb-3 mb-4">
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-ink">
              Register Customer Organization - Step {wizardStep} of 6
            </DialogTitle>
            <DialogDescription className="text-[11px] text-ink-secondary pt-1">
              Complete the enterprise provisioning wizard to initialize the customer account.
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: COMPANY INFORMATION */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted border-b border-line pb-1.5">Section 1 - Company Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-ink-secondary">Company Name *</Label>
                  <Input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="Apex Global Industries" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Short Code *</Label>
                  <Input value={compShortCode} onChange={(e) => setCompShortCode(e.target.value.toUpperCase())} maxLength={6} placeholder="APX" className="text-xs uppercase" required />
                  <span className="text-[11px] text-ink-muted block">Alphanumeric, 2–6 chars.</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Legal Name</Label>
                  <Input value={compLegalName} onChange={(e) => setCompLegalName(e.target.value)} placeholder="Apex Global Industries Inc." className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Industry</Label>
                  <Input value={compIndustry} onChange={(e) => setCompIndustry(e.target.value)} placeholder="e.g. Manufacturing" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Registration Number</Label>
                  <Input value={compRegNumber} onChange={(e) => setCompRegNumber(e.target.value)} placeholder="REG-89213" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Tax Number</Label>
                  <Input value={compTaxNumber} onChange={(e) => setCompTaxNumber(e.target.value)} placeholder="TAX-0982" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Website</Label>
                  <Input value={compWebsite} onChange={(e) => setCompWebsite(e.target.value)} placeholder="www.apex-global.com" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Country</Label>
                  <Input value={compCountry} onChange={(e) => setCompCountry(e.target.value)} placeholder="United States" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">City</Label>
                  <Input value={compCity} onChange={(e) => setCompCity(e.target.value)} placeholder="Dallas" className="text-xs" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-ink-secondary">Address</Label>
                  <Input value={compAddress} onChange={(e) => setCompAddress(e.target.value)} placeholder="100 Enterprise Way, Suite 400" className="text-xs" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-ink-secondary">Company Logo URL</Label>
                  <Input value={compLogoUrl} onChange={(e) => setCompLogoUrl(e.target.value)} placeholder="https://image-url.png" className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT INFORMATION */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted border-b border-line pb-1.5">Section 2 - Contact Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-ink-secondary">Contact Person *</Label>
                  <Input value={contPerson} onChange={(e) => setContPerson(e.target.value)} placeholder="Sarah Connor" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Designation</Label>
                  <Input value={contDesignation} onChange={(e) => setContDesignation(e.target.value)} placeholder="Director of IT Operations" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Email Address *</Label>
                  <Input type="email" value={contEmail} onChange={(e) => setContEmail(e.target.value)} placeholder="sarah@apex-global.com" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Mobile Phone</Label>
                  <Input value={contMobile} onChange={(e) => setContMobile(e.target.value)} placeholder="+1 (555) 019-2831" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Alternate Phone</Label>
                  <Input value={contAltPhone} onChange={(e) => setContAltPhone(e.target.value)} placeholder="+1 (555) 019-2832" className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONTRACT INFORMATION */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted border-b border-line pb-1.5">Section 3 - Contract Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Contract Type</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMS">AMS Support</SelectItem>
                      <SelectItem value="Implementation Support">Implementation Support</SelectItem>
                      <SelectItem value="Rollout Support">Rollout Support</SelectItem>
                      <SelectItem value="Migration Support">Migration Support</SelectItem>
                      <SelectItem value="Upgrade Support">Upgrade Support</SelectItem>
                      <SelectItem value="Hypercare Support">Hypercare Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Contract Value ($)</Label>
                  <Input type="number" value={contractValue} onChange={(e) => setContractValue(e.target.value)} placeholder="120000" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Contract Start Date *</Label>
                  <Input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Contract End Date *</Label>
                  <Input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Monthly Contract Hours</Label>
                  <Input type="number" value={contractMonthlyHours} onChange={(e) => setContractMonthlyHours(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Annual Contract Hours</Label>
                  <Input type="number" value={contractAnnualHours} onChange={(e) => setContractAnnualHours(e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SLA & GOVERNANCE */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted border-b border-line pb-1.5">Section 4 - SLA & Governance Overrides</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-ink-secondary">SLA Template</Label>
                  <Select value={slaTemplate} onValueChange={setSlaTemplate}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select SLA template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard Matrix SLA</SelectItem>
                      <SelectItem value="Premium">Premium Customer SLA</SelectItem>
                      <SelectItem value="Custom Override">Custom Override Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary font-bold">Critical SLA (Hours)</Label>
                  <Input type="number" value={slaCritical} onChange={(e) => setSlaCritical(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">High SLA (Hours)</Label>
                  <Input type="number" value={slaHigh} onChange={(e) => setSlaHigh(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Medium SLA (Hours)</Label>
                  <Input type="number" value={slaMedium} onChange={(e) => setSlaMedium(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Low SLA (Hours)</Label>
                  <Input type="number" value={slaLow} onChange={(e) => setSlaLow(e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: ACCESS MANAGEMENT */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted border-b border-line pb-1.5">Section 5 - Access Management & Provisioning</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-semibold text-ink-secondary">Username / Email *</Label>
                  <Input type="email" value={accessUsername} onChange={(e) => setAccessUsername(e.target.value)} placeholder="sarah@apex-global.com" className="text-xs" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Generated Initial Password</Label>
                  <Input type="text" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Leave blank to auto-generate" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Account Status</Label>
                  <Select value={accessStatus} onValueChange={setAccessStatus}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active / Login Enabled</SelectItem>
                      <SelectItem value="Inactive">Inactive / Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: INTERNAL NOTES */}
          {wizardStep === 6 && (
            <div className="space-y-4">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted border-b border-line pb-1.5">Section 6 - Internal Notes & Comments</div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Strategic Client Notes</Label>
                  <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Strategic alignment notes..." className="text-xs bg-surface min-h-[80px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-ink-secondary">Internal Audit Comments</Label>
                  <Textarea value={internalComments} onChange={(e) => setInternalComments(e.target.value)} placeholder="Internal audit trail logs comments..." className="text-xs bg-surface min-h-[80px]" />
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer */}
          <DialogFooter className="mt-6 border-t border-line pt-3 flex justify-between gap-2">
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
              {wizardStep < 6 ? (
                <Button size="sm" onClick={handleNextStep} className="bg-ink text-white hover:bg-zinc-800 cursor-pointer">
                  Next <ChevronRight size={14} className="ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleWizardSubmit} className="bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer">
                  <ShieldCheck size={14} className="mr-1.5" /> Provision Customer
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          EDIT DETAILS DIALOG
         ------------------------------------------------------------- */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-surface border border-line p-6 rounded-lg font-sans text-xs">
          <DialogHeader className="border-b border-line pb-3 mb-4">
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-ink">
              Edit Auditing Information
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-ink-secondary">Client Strategic Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="text-xs bg-surface min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-ink-secondary">Administrative Comments</Label>
              <Textarea value={editComments} onChange={(e) => setEditComments(e.target.value)} className="text-xs bg-surface min-h-[100px]" />
            </div>
            <DialogFooter className="border-t border-line pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" size="sm" className="bg-ink hover:bg-zinc-800 text-white cursor-pointer">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          PASSWORD RESET/UPDATE DIALOG
         ------------------------------------------------------------- */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md bg-surface border border-line p-6 rounded-lg font-sans text-xs">
          <DialogHeader className="border-b border-line pb-3 mb-4">
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Lock size={15} /> Credential Governance Panel
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="p-3 bg-surface-muted border border-line rounded text-[11px] text-ink-secondary">
              <span className="font-bold uppercase tracking-wider text-ink-secondary block mb-1">Target Account Profile:</span>
              <div>Name: {pwdUserSelected?.full_name}</div>
              <div>Email: {pwdUserSelected?.email}</div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-ink-secondary uppercase tracking-wider text-[11px]">Governance Policy</Label>
              <Select value={pwdOption} onValueChange={(val: any) => setPwdOption(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temp">Generate Secure Temporary Password</SelectItem>
                  <SelectItem value="manual">Manually Overwrite Password</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pwdOption === 'manual' && (
              <div className="space-y-1.5">
                <Label className="font-semibold text-ink-secondary">Overwrite Password</Label>
                <Input 
                  type="password" 
                  value={pwdManualValue} 
                  onChange={(e) => setPwdManualValue(e.target.value)} 
                  placeholder="Min. 8 characters" 
                  className="text-xs" 
                  required
                />
              </div>
            )}

            {pwdGeneratedTemp && (
              <div className="p-4 bg-success-soft border border-success-border rounded text-center space-y-2">
                <span className="text-[11px] text-emerald-800 font-bold block uppercase">Temporary Password Registry</span>
                <span className="text-sm font-bold bg-surface px-3 py-1.5 border border-emerald-250 rounded block select-all">
                  {pwdGeneratedTemp}
                </span>
                <span className="text-[11px] text-ink-secondary block">Copy this temporary password and deliver it to the user. They will be forced to change it on their next login.</span>
              </div>
            )}

            <DialogFooter className="border-t border-line pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPasswordDialogOpen(false)} className="cursor-pointer">Close</Button>
              <Button type="submit" size="sm" className="bg-ink hover:bg-zinc-800 text-white cursor-pointer">
                {pwdOption === 'temp' ? 'Generate Password' : 'Apply Overwrite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          CONTRACT EXTENSION DIALOG
         ------------------------------------------------------------- */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="max-w-md bg-surface border border-line p-6 rounded-lg font-sans text-xs">
          <DialogHeader className="border-b border-line pb-3 mb-4">
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-ink">
              Extend Contract Agreement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-ink-secondary">New End Date</Label>
              <Input type="date" value={extendEnd} onChange={(e) => setExtendEnd(e.target.value)} className="text-xs" required />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-ink-secondary">New Annual Contract Value ($)</Label>
              <Input type="number" value={extendValue} onChange={(e) => setExtendValue(e.target.value)} className="text-xs" required />
            </div>
            <DialogFooter className="border-t border-line pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setExtendDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" size="sm" className="bg-ink hover:bg-zinc-800 text-white cursor-pointer">Extend Agreement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
