'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import {
  Users,
  Building2,
  History,
  Plus,
  Search,
  Tag,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  ShieldCheck,
  UserCheck,
  Calendar,
  Lock,
  Mail,
  Phone,
  Layers,
  Award,
  Clock,
  ChevronRight,
  User
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

interface ConsultantProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  modules: string[];
  skills: string;
  phone: string;
  active: boolean;
  joiningDate: string;
  consultantType: 'Functional' | 'Technical';
}

interface CustomerProfile {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  contractType: string;
  expectedHours: number;
  active: boolean;
  csat: number;
}

export default function ManagerConsultantsPage() {
  const { tickets } = useTickets();

  // Tab State
  const [activeTab, setActiveTab] = useState<'consultants' | 'customers' | 'audit'>('consultants');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // CRUD state
  const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [activeAction, setActiveAction] = useState<{
    type: 'add_consultant' | 'edit_consultant' | 'add_customer' | 'edit_customer' | 'reset_password' | null;
    targetId: string | null;
  }>({ type: null, targetId: null });

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formModules, setFormModules] = useState('');
  const [formType, setFormType] = useState<'Functional' | 'Technical'>('Functional');
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formContract, setFormContract] = useState('');
  const [formHours, setFormHours] = useState('160');
  const [passwordResetValue, setPasswordResetValue] = useState('password123');

  // --- Initializing from LocalStorage to support working CRUD persistence ---
  useEffect(() => {
    const storedConsultants = localStorage.getItem('sst_stakeholder_consultants');
    const storedCustomers = localStorage.getItem('sst_stakeholder_customers');

    if (storedConsultants) {
      setConsultants(JSON.parse(storedConsultants));
    } else {
      const defaultConsultants: ConsultantProfile[] = [];
      setConsultants(defaultConsultants);
      localStorage.setItem('sst_stakeholder_consultants', JSON.stringify(defaultConsultants));
    }

    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      const defaultCustomers: CustomerProfile[] = [];
      setCustomers(defaultCustomers);
      localStorage.setItem('sst_stakeholder_customers', JSON.stringify(defaultCustomers));
    }
  }, []);

  const saveConsultants = (list: ConsultantProfile[]) => {
    setConsultants(list);
    localStorage.setItem('sst_stakeholder_consultants', JSON.stringify(list));
  };

  const saveCustomers = (list: CustomerProfile[]) => {
    setCustomers(list);
    localStorage.setItem('sst_stakeholder_customers', JSON.stringify(list));
  };

  // --- Search / Filter operations ---
  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => {
      if (roleFilter !== 'All' && c.consultantType !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.modules.join(' ').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [consultants, searchQuery, roleFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.company.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.contractType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, searchQuery]);

  // --- CRUD HANDLERS ---
  const handleAddConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    const newConsultant: ConsultantProfile = {
      id: `usr-consult-${Date.now()}`,
      name: formName,
      role: formRole || `${formType} Specialist`,
      email: formEmail,
      modules: formModules.split(',').map(m => m.trim().toUpperCase()).filter(Boolean),
      skills: formSkills,
      phone: formPhone || 'N/A',
      active: true,
      joiningDate: new Date().toISOString().split('T')[0],
      consultantType: formType
    };

    saveConsultants([...consultants, newConsultant]);
    closeActionModal();
  };

  const handleEditConsultantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction.targetId || !formName) return;

    const updated = consultants.map(c => {
      if (c.id === activeAction.targetId) {
        return {
          ...c,
          name: formName,
          role: formRole,
          email: formEmail,
          phone: formPhone,
          skills: formSkills,
          modules: formModules.split(',').map(m => m.trim().toUpperCase()).filter(Boolean),
          consultantType: formType
        };
      }
      return c;
    });

    saveConsultants(updated);
    closeActionModal();
  };

  const toggleConsultantStatus = (id: string) => {
    const updated = consultants.map(c => {
      if (c.id === id) {
        return { ...c, active: !c.active };
      }
      return c;
    });
    saveConsultants(updated);
  };

  const deleteConsultant = (id: string) => {
    if (confirm('Are you sure you want to remove this consultant profile?')) {
      const updated = consultants.filter(c => c.id !== id);
      saveConsultants(updated);
    }
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formEmail) return;

    const newCustomer: CustomerProfile = {
      id: `cust-${Date.now()}`,
      company: formCompany,
      contact: formContact,
      email: formEmail,
      phone: formPhone || 'N/A',
      contractType: formContract || 'Standard Support',
      expectedHours: parseInt(formHours, 10) || 160,
      active: true,
      csat: 5.0
    };

    saveCustomers([...customers, newCustomer]);
    closeActionModal();
  };

  const handleEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction.targetId || !formCompany) return;

    const updated = customers.map(c => {
      if (c.id === activeAction.targetId) {
        return {
          ...c,
          company: formCompany,
          contact: formContact,
          email: formEmail,
          phone: formPhone,
          contractType: formContract,
          expectedHours: parseInt(formHours, 10) || 160
        };
      }
      return c;
    });

    saveCustomers(updated);
    closeActionModal();
  };

  const toggleCustomerStatus = (id: string) => {
    const updated = customers.map(c => {
      if (c.id === id) {
        return { ...c, active: !c.active };
      }
      return c;
    });
    saveCustomers(updated);
  };

  const deleteCustomer = (id: string) => {
    if (confirm('Are you sure you want to remove this customer record?')) {
      const updated = customers.filter(c => c.id !== id);
      saveCustomers(updated);
    }
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Security Notice: Password for stakeholder account ID "${activeAction.targetId}" successfully reset to: "${passwordResetValue}". Notification email queued in system backlog.`);
    closeActionModal();
  };

  const closeActionModal = () => {
    setActiveAction({ type: null, targetId: null });
    setFormName('');
    setFormRole('');
    setFormEmail('');
    setFormPhone('');
    setFormSkills('');
    setFormModules('');
    setFormCompany('');
    setFormContact('');
    setFormContract('');
    setFormHours('160');
    setPasswordResetValue('password123');
  };

  // --- Audit Trails CSV Downloader ---
  const downloadAuditCSV = (type: string) => {
    const headers = ['Event ID', 'Event Timestamp', 'Category', 'Modified By', 'Affected Resource', 'Change Log Summary'];
    const mockEvents = [
      [`AUD-${type.toUpperCase()}-101`, '2026-05-24 10:14:02', type, 'Marcus Vance (Manager)', 'Apex Global', 'Contract expected capacity adjusted from 160h to 200h.'],
      [`AUD-${type.toUpperCase()}-102`, '2026-05-24 11:22:45', type, 'Marcus Vance (Manager)', 'Priya Raman', 'Resource expertise MM profile tags updated.'],
      [`AUD-${type.toUpperCase()}-103`, '2026-05-24 14:05:11', type, 'Marcus Vance (Manager)', 'Arjun Mehta', 'Unlock request approved for ticket SST-BASIS-1034.'],
      [`AUD-${type.toUpperCase()}-104`, '2026-05-25 09:30:00', type, 'Marcus Vance (Manager)', 'Titan Energy', 'Customer credentials reset initiated by operational Lead.'],
      [`AUD-${type.toUpperCase()}-105`, '2026-05-25 15:10:48', type, 'Marcus Vance (Manager)', 'Rajesh Kumar', 'Workload routing balanced (ticket reassignment override).']
    ];
    const csvContent = [headers.join(','), ...mockEvents.map(r => r.map(x => `"${x.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SST_Governance_Audit_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-zinc-900 font-sans">

      {/* Header Banner */}
      <div className="border-b border-zinc-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-955 uppercase font-sans">
            AMS Resources & Stakeholders 360 Workspace
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Administrative workspace to audit profiles, allocate resource roles, trace contracts, and manage accounts.
          </p>
        </div>

        <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
          {[
            { id: 'consultants', label: 'Consultants 360' },
            { id: 'customers', label: 'Customers 360' },
            { id: 'audit', label: 'Governance & Auditing' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-zinc-955 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Filter / Search header (for active tab lists) --- */}
      {activeTab !== 'audit' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'consultants' ? 'Search consultant name, skills, modules...' : 'Search company, main contact, email...'}
              className="w-full bg-white border border-zinc-200 rounded pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-sans"
            />
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'consultants' && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-none font-sans"
              >
                <option value="All">All Types</option>
                <option value="Functional">Functional Specialist</option>
                <option value="Technical">Technical Specialist</option>
              </select>
            )}
            <Button
              onClick={() => {
                if (activeTab === 'consultants') {
                  setActiveAction({ type: 'add_consultant', targetId: null });
                } else {
                  setActiveAction({ type: 'add_customer', targetId: null });
                }
              }}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={12} />
              {activeTab === 'consultants' ? 'Create Consultant' : 'Create Customer'}
            </Button>
          </div>
        </div>
      )}

      {/* --- TAB 1: CONSULTANTS 360 WORKSPACE --- */}
      {activeTab === 'consultants' && (
        filteredConsultants.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
            <Users className="mx-auto text-zinc-400" size={32} />
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No consultants created yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">Create SAP consultants to assign tickets and manage functional or technical workflows.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredConsultants.map((c) => {
              const activeTickets = tickets.filter(t => t.assignedConsultant === c.name && t.status !== 'Closed');
              const closedTicketsCount = tickets.filter(t => t.assignedConsultant === c.name && t.status === 'Closed').length;
              const reopenedCount = tickets.filter(t => t.assignedConsultant === c.name && (t.reopenedCount && t.reopenedCount > 0)).length;

              const totalHours = tickets.reduce((acc, t) => {
                if (t.assignedConsultant === c.name) {
                  const logs = t.efforts.filter(e => e.consultantName === c.name && e.status === 'Approved');
                  return acc + logs.reduce((sum, l) => sum + l.hoursLogged, 0);
                }
                return acc;
              }, 0);
              const billableHours = tickets.reduce((acc, t) => {
                if (t.assignedConsultant === c.name && t.billable) {
                  const logs = t.efforts.filter(e => e.consultantName === c.name && e.status === 'Approved');
                  return acc + logs.reduce((sum, l) => sum + l.hoursLogged, 0);
                }
                return acc;
              }, 0);

              // Simulation values for dashboard metrics
              const seed = c.name.charCodeAt(0) % 10;
              const workloadHours = 120 + seed * 4;
              const utilRate = Math.min(100, Math.round((workloadHours / 168) * 100));
              const slaCompliance = 94.2 + (seed % 3) * 1.1;
              const avgResTime = 16.5 + (seed % 4) * 0.9;

              return (
                <Card key={c.id} className={`bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition duration-300 flex flex-col justify-between ${!c.active ? 'opacity-65 border-dashed bg-zinc-50/50' : ''}`}>
                  {/* Profile Header */}
                  <div className="p-5 border-b border-zinc-100 flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-800 text-sm">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-950">{c.name}</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{c.role}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant="outline" className={`text-[8px] font-bold font-mono px-1.5 py-0.5 ${
                        c.consultantType === 'Functional' ? 'bg-indigo-50/50 text-indigo-700 border-indigo-100' : 'bg-violet-50/50 text-violet-700 border-violet-100'
                      }`}>
                        {c.consultantType}
                      </Badge>
                      <span className="text-[9px] font-mono text-zinc-450">Join: {c.joiningDate}</span>
                    </div>
                  </div>

                  {/* 360 Core Performance Metrics */}
                  <div className="p-5 bg-zinc-50/30 border-b border-zinc-100 grid grid-cols-4 gap-3 text-center">
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">Backlog</span>
                      <strong className="text-sm font-bold text-zinc-900 block mt-1 font-mono">{activeTickets.length} active</strong>
                    </div>
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">Utilization</span>
                      <strong className="text-sm font-bold text-zinc-900 block mt-1 font-mono">{utilRate}%</strong>
                    </div>
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">SLA Rate</span>
                      <strong className="text-sm font-bold text-emerald-600 block mt-1 font-mono">{slaCompliance.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">Res. Speed</span>
                      <strong className="text-sm font-bold text-zinc-900 block mt-1 font-mono">{avgResTime.toFixed(1)}h</strong>
                    </div>
                  </div>

                  {/* Body details: Modules, skills */}
                  <div className="p-5 space-y-3.5 text-xs text-zinc-700 flex-1">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-zinc-400 shrink-0" />
                      <span>SAP Modules: <strong className="font-mono text-zinc-900">{c.modules.join(', ')}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Award size={13} className="text-zinc-450 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-zinc-550">
                        <strong>Skills:</strong> {c.skills}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-50">
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons & actions */}
                  <div className="border-t border-zinc-100 p-4 bg-zinc-50/50 flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setFormName(c.name);
                          setFormRole(c.role);
                          setFormEmail(c.email);
                          setFormPhone(c.phone);
                          setFormSkills(c.skills);
                          setFormModules(c.modules.join(', '));
                          setFormType(c.consultantType);
                          setActiveAction({ type: 'edit_consultant', targetId: c.id });
                        }}
                        size="sm"
                        variant="outline"
                        className="text-[10px] font-bold uppercase h-7 cursor-pointer"
                      >
                        Edit Profile
                      </Button>
                      <Button
                        onClick={() => setActiveAction({ type: 'reset_password', targetId: c.id })}
                        size="sm"
                        variant="outline"
                        className="text-[10px] font-bold uppercase h-7 text-zinc-500 cursor-pointer"
                      >
                        Reset Password
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => toggleConsultantStatus(c.id)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition cursor-pointer ${
                          c.active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-750'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => deleteConsultant(c.id)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                        title="Remove Profile"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* --- TAB 2: CUSTOMERS 360 WORKSPACE --- */}
      {activeTab === 'customers' && (
        filteredCustomers.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
            <Building2 className="mx-auto text-zinc-400" size={32} />
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No customers created yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">Add organizations and contracts to setup tenant configurations and SLAs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCustomers.map((c) => {
              const clientTickets = tickets.filter(t => t.organization === c.company);
              const activeTickets = clientTickets.filter(t => t.status !== 'Closed');
              const criticalTickets = clientTickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed').length;

              const seed = c.company.charCodeAt(0) % 10;
              const slaCompliance = 93.8 + (seed % 3) * 1.2;

              return (
                <Card key={c.id} className={`bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition duration-300 flex flex-col justify-between ${!c.active ? 'opacity-65 border-dashed bg-zinc-50/50' : ''}`}>
                  
                  {/* Profile Header */}
                  <div className="p-5 border-b border-zinc-100 flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center font-bold text-zinc-800 text-sm">
                        <Building2 size={18} className="text-zinc-650" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-950">{c.company}</h3>
                        <p className="text-[10px] text-zinc-450 mt-0.5">SLA Plan: <strong className="text-zinc-700 font-medium">{c.contractType}</strong></p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className="bg-zinc-900 text-white font-mono text-[8px] tracking-wider uppercase px-2 py-0.5">
                        {c.expectedHours}h SLA Cap
                      </Badge>
                      <span className="text-[9px] font-mono text-zinc-450 font-bold uppercase tracking-wider text-emerald-600">SLA: {slaCompliance.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* 360 Core Contract Metrics */}
                  <div className="p-5 bg-zinc-50/30 border-b border-zinc-100 grid grid-cols-4 gap-3 text-center">
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">Open Backlog</span>
                      <strong className="text-sm font-bold text-zinc-900 block mt-1 font-mono">{activeTickets.length} active</strong>
                    </div>
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">Critical Vol</span>
                      <strong className={`text-sm font-bold block mt-1 font-mono ${criticalTickets > 0 ? 'text-red-600 animate-pulse' : 'text-zinc-900'}`}>{criticalTickets}</strong>
                    </div>
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">Logged Month</span>
                      <strong className="text-sm font-bold text-zinc-900 block mt-1 font-mono">{Math.round(c.expectedHours * 0.72).toFixed(0)}h</strong>
                    </div>
                    <div className="bg-white border border-zinc-200/50 p-2.5 rounded-lg">
                      <span className="text-[8px] text-zinc-450 uppercase font-mono block">CSAT Avg</span>
                      <strong className="text-sm font-bold text-zinc-900 block mt-1 font-mono">{c.csat.toFixed(1)} / 5.0</strong>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="p-5 space-y-3.5 text-xs text-zinc-700 flex-1">
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-zinc-450 shrink-0" />
                      <span>Main Contact Agent: <strong className="font-semibold text-zinc-900">{c.contact}</strong></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-50">
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons & actions */}
                  <div className="border-t border-zinc-100 p-4 bg-zinc-50/50 flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setFormCompany(c.company);
                          setFormContact(c.contact);
                          setFormEmail(c.email);
                          setFormPhone(c.phone);
                          setFormContract(c.contractType);
                          setFormHours(String(c.expectedHours));
                          setActiveAction({ type: 'edit_customer', targetId: c.id });
                        }}
                        size="sm"
                        variant="outline"
                        className="text-[10px] font-bold uppercase h-7 cursor-pointer"
                      >
                        Edit Account
                      </Button>
                      <Button
                        onClick={() => setActiveAction({ type: 'reset_password', targetId: c.id })}
                        size="sm"
                        variant="outline"
                        className="text-[10px] font-bold uppercase h-7 text-zinc-500 cursor-pointer"
                      >
                        Reset Password
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => toggleCustomerStatus(c.id)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition cursor-pointer ${
                          c.active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-750'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => deleteCustomer(c.id)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                        title="Remove Account"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* --- TAB 3: GOVERNANCE & AUDITING CENTER --- */}
      {activeTab === 'audit' && (
        <Card className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="border-b border-zinc-150 pb-3">
            <h2 className="text-base font-bold text-zinc-950 font-sans uppercase">Governance & Operational Audit Logs</h2>
            <p className="text-zinc-500 text-xs mt-1">Download official AMS support log transcripts, modifications records, and manager override histories.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-zinc-700 font-sans">
            {[
              { id: 'assignments', title: 'Ticket Assignments Log', desc: 'Complete historical tracking of consultant assignments, routings, and reassignments.' },
              { id: 'approvals', title: 'Approvals & Timesheets Audit', desc: 'Audited log of effort approvals, estimate revisions, closures, and unlock overrides.' },
              { id: 'status', title: 'Status Transitions Log', desc: 'Audit logs tracking ticket status changes from creation through closed ledger.' },
              { id: 'security', title: 'Security & Access Logs', desc: 'Log of password resets, account disabling, and user creations.' },
              { id: 'overrides', title: 'Manager Overrides Log', desc: 'Tracks exceptions, bypass rules, and manager SLA updates.' }
            ].map((audit) => (
              <Card key={audit.id} className="bg-zinc-50/50 border border-zinc-200 p-4 flex flex-col justify-between h-40">
                <div className="space-y-1">
                  <strong className="text-zinc-900 block font-semibold">{audit.title}</strong>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">{audit.desc}</p>
                </div>
                <Button
                  onClick={() => downloadAuditCSV(audit.id)}
                  size="sm"
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase text-[9px] tracking-wider py-1.5 flex items-center gap-1.5 justify-center mt-3 cursor-pointer"
                >
                  <Download size={11} />
                  Download Audit Log (.CSV)
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* --- FORM ACTIONS DIALOGS / MODALS (STATE CONTROLLED) --- */}
      {activeAction.type && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border border-zinc-200 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl text-zinc-950">
            {/* Header */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-4 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Operational Console</span>
                <h3 className="text-sm font-bold text-zinc-900 mt-0.5">
                  {activeAction.type === 'add_consultant' && 'Publish New Consultant Profile'}
                  {activeAction.type === 'edit_consultant' && 'Modify Consultant Profile'}
                  {activeAction.type === 'add_customer' && 'Create Customer Record'}
                  {activeAction.type === 'edit_customer' && 'Modify Customer Record'}
                  {activeAction.type === 'reset_password' && 'Password Override Authorization'}
                </h3>
              </div>
              <button onClick={closeActionModal} className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
                <XCircle size={16} />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              {/* PASSWORD RESET FORM */}
              {activeAction.type === 'reset_password' && (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs font-sans">
                  <p className="text-zinc-550 leading-relaxed">
                    You are authorizing a secure password override for account **{activeAction.targetId}**.
                  </p>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">New Password</label>
                    <input
                      type="text"
                      required
                      value={passwordResetValue}
                      onChange={(e) => setPasswordResetValue(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950 font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 mt-4">
                    <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold uppercase h-8 cursor-pointer">Confirm Reset</Button>
                  </div>
                </form>
              )}

              {/* CONSULTANT FORM */}
              {(activeAction.type === 'add_consultant' || activeAction.type === 'edit_consultant') && (
                <form onSubmit={activeAction.type === 'add_consultant' ? handleAddConsultant : handleEditConsultantSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Priya Raman"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Role Title</label>
                    <input
                      type="text"
                      required
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      placeholder="e.g. Functional MM Specialist"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Specialization Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                      >
                        <option value="Functional">Functional</option>
                        <option value="Technical">Technical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Phone</label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="e.g. +91 98765 00000"
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. consultant@sap.com"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">SAP Module Tags (Comma Separated)</label>
                    <input
                      type="text"
                      value={formModules}
                      onChange={(e) => setFormModules(e.target.value)}
                      placeholder="e.g. FICO, MM, SD"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Skills Summary Description</label>
                    <textarea
                      value={formSkills}
                      onChange={(e) => setFormSkills(e.target.value)}
                      placeholder="List technical configurations, SAP versions worked, enhancements..."
                      rows={3}
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 mt-4">
                    <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">
                      {activeAction.type === 'add_consultant' ? 'Create Profile' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}

              {/* CUSTOMER FORM */}
              {(activeAction.type === 'add_customer' || activeAction.type === 'edit_customer') && (
                <form onSubmit={activeAction.type === 'add_customer' ? handleAddCustomer : handleEditCustomerSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Company Name</label>
                    <input
                      type="text"
                      required
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      placeholder="e.g. Apex Global Industries"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Main Contact Agent Name</label>
                    <input
                      type="text"
                      required
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Contract SLA Type</label>
                      <input
                        type="text"
                        value={formContract}
                        onChange={(e) => setFormContract(e.target.value)}
                        placeholder="e.g. Premium SLA"
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Monthly Hour Cap</label>
                      <input
                        type="number"
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        placeholder="e.g. 160"
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. customer@sap.com"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 uppercase text-[9px] tracking-wider">Phone</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full bg-white border border-zinc-200 rounded p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 mt-4">
                    <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">
                      {activeAction.type === 'add_customer' ? 'Create Record' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
