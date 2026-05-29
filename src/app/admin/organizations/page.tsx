'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { 
  Building2, Plus, Globe, ShieldCheck, Mail, Phone, Users, 
  AlertTriangle, Clock, HeartHandshake, Eye, Award, FileText 
} from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationItem {
  id: string;
  name: string;
  domain: string;
}

export default function AdminOrganizationsPage() {
  const { tickets, contracts } = useTickets();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Org form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  // Selected organization for Customer 360 View
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);

  const fetchOrgsAndProfiles = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: orgData, error: orgErr } = await supabase.from('organizations').select('*');
        if (orgErr) throw orgErr;
        setOrganizations(orgData || []);

        const { data: profData, error: profErr } = await supabase.from('profiles').select('*');
        if (profErr) throw profErr;
        setProfiles(profData || []);
      } catch (err: any) {
        console.error('Error fetching orgs/profiles:', err);
        toast.error(`Database query failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallbacks
      setOrganizations([
        { id: 'org-1', name: 'Apex Global Industries', domain: 'apex-global.com' },
        { id: 'org-2', name: 'Titan Energy Corp', domain: 'titanenergy.io' },
        { id: 'org-3', name: 'Nexa Manufacturing', domain: 'nexa-mfg.com' }
      ]);
      setProfiles([
        { id: 'mgr-1', full_name: 'Alexander Sterling', role: 'Manager' },
        { id: 'cons-1', full_name: 'Priya Raman', role: 'Consultant' }
      ]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgsAndProfiles();
  }, []);

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const loadId = toast.loading(`Registering organization ${newName}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .insert({
            name: newName.trim(),
            domain: newDomain.trim() || null
          })
          .select('*')
          .single();

        if (error) throw error;
        toast.success(`Organization ${newName} registered successfully.`, { id: loadId });
        setNewName('');
        setNewDomain('');
        setShowAddForm(false);
        fetchOrgsAndProfiles();
      } catch (err: any) {
        toast.error(`Setup failed: ${err.message}`, { id: loadId });
      }
    } else {
      const newOrg: OrganizationItem = {
        id: `org-${Date.now()}`,
        name: newName.trim(),
        domain: newDomain.trim() || 'n/a'
      };
      const updated = [...organizations, newOrg];
      setOrganizations(updated);
      toast.success('Organization added locally.', { id: loadId });
      setNewName('');
      setNewDomain('');
      setShowAddForm(false);
    }
  };

  // --- Customer 360 Analytics Computations for Selected Org ---
  const org360Data = useMemo(() => {
    if (!selectedOrg) return null;

    // Filter tickets related to this org
    const orgTickets = tickets.filter(t => t.organization === selectedOrg.name);
    
    // Status splits
    const openTickets = orgTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    const closedResolvedTickets = orgTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved');
    
    // Priorities
    const criticalCount = openTickets.filter(t => t.priority === 'Critical').length;
    const highCount = openTickets.filter(t => t.priority === 'High').length;

    // Escalation Log
    const escalations = orgTickets.flatMap(t => t.escalations || []);
    
    // Actual Hours burned
    const allEfforts = orgTickets.flatMap(t => t.efforts || []);
    const totalHours = allEfforts.reduce((sum, e) => sum + (e.hoursLogged || e.hoursWorked || 0), 0);
    const billableHours = allEfforts.filter(e => e.billable).reduce((sum, e) => sum + (e.hoursLogged || e.hoursWorked || 0), 0);
    const nonBillableHours = totalHours - billableHours;

    // Average resolution time
    let totalResTimeMs = 0;
    const resolved = orgTickets.filter(t => t.resolvedAt || t.closedAt);
    resolved.forEach(t => {
      const end = t.resolvedAt || t.closedAt || t.updatedAt;
      totalResTimeMs += new Date(end).getTime() - new Date(t.createdAt).getTime();
    });
    const avgResolutionHours = resolved.length > 0 
      ? (totalResTimeMs / (1000 * 60 * 60) / resolved.length).toFixed(1)
      : 'N/A';

    // CSAT
    const rated = orgTickets.filter(t => t.rating);
    const avgCsat = rated.length > 0
      ? (rated.reduce((acc, t) => acc + (t.rating?.score || 0), 0) / rated.length).toFixed(1)
      : '5.0';

    // SLA compliance
    const now = Date.now();
    const breached = orgTickets.filter(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
      return t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && new Date(t.slaDueAt).getTime() < now;
    }).length;
    const compliancePct = orgTickets.length > 0 
      ? Math.round(((orgTickets.length - breached) / orgTickets.length) * 100)
      : 100;

    // Active Consultant Roster (unique consultants currently assigned to active tickets for this org)
    const consultantMap: Record<string, { name: string; count: number; module: string }> = {};
    openTickets.forEach(t => {
      if (t.assignedConsultant) {
        if (!consultantMap[t.assignedConsultant]) {
          consultantMap[t.assignedConsultant] = { name: t.assignedConsultant, count: 0, module: t.sapModule };
        }
        consultantMap[t.assignedConsultant].count += 1;
      }
    });
    const activeConsultants = Object.values(consultantMap);

    // Attachments registry
    const attachments = orgTickets.flatMap(t => t.attachments || []);

    // Contract info
    const contract = contracts.find(c => c.organizationName === selectedOrg.name);

    return {
      totalTicketsCount: orgTickets.length,
      openTicketsCount: openTickets.length,
      criticalCount,
      highCount,
      totalHours,
      billableHours,
      nonBillableHours,
      avgResolutionHours,
      avgCsat,
      compliancePct,
      activeConsultants,
      escalations,
      attachments,
      contract,
      tickets: orgTickets
    };
  }, [selectedOrg, tickets, contracts]);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 bg-white">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-zinc-955 font-mono">
            Customer 360 Dashboard
          </h1>
          <p className="text-zinc-500 mt-1">Audit customer telemetry, analyze SLA performance index, and track contract hour burn rates.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus size={12} />
          Register Org
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Pane: Organization roster */}
        <div className="lg:col-span-1 space-y-4">
          {showAddForm && (
            <form onSubmit={handleAddOrg} className="bg-white border border-zinc-200 rounded p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-950">
                  New Customer Registration
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-zinc-400 hover:text-zinc-950 uppercase text-[9px] font-bold"
                >
                  Close
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 uppercase text-[9px]">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Industries"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 uppercase text-[9px]">Domain Mapping</label>
                <input
                  type="text"
                  placeholder="e.g. apex-global.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  Register Org
                </button>
              </div>
            </form>
          )}

          {/* Roster Cards List */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-zinc-400 italic text-center py-8">Loading customer registry...</p>
            ) : organizations.length === 0 ? (
              <p className="text-zinc-400 italic text-center py-8">No organizations registered.</p>
            ) : (
              organizations.map(org => {
                const isSelected = selectedOrg?.id === org.id;
                const openCount = tickets.filter(t => t.organization === org.name && t.status !== 'Closed' && t.status !== 'Resolved').length;
                
                return (
                  <div
                    key={org.id}
                    onClick={() => setSelectedOrg(org)}
                    className={`p-3 bg-white border rounded-xl shadow-sm hover:shadow cursor-pointer transition-all ${
                      isSelected ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-50/50' : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-zinc-400" />
                        <span className="font-bold text-zinc-800 text-xs">{org.name}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                        openCount > 0 ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                      }`}>
                        {openCount} active
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-zinc-450 font-mono mt-2 pt-2 border-t border-zinc-100">
                      <span className="flex items-center gap-1">
                        <Globe size={11} />
                        {org.domain || 'no domain'}
                      </span>
                      <span className="text-zinc-400">Isolated Profile</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Customer 360 Dashboard Panel */}
        <div className="lg:col-span-2">
          {selectedOrg && org360Data ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-6">
              
              {/* Dashboard Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-zinc-950 uppercase">{selectedOrg.name}</h2>
                  <span className="text-[10px] text-zinc-450 font-mono flex items-center gap-1.5 mt-1">
                    <Globe size={12} />
                    Domain: {selectedOrg.domain || 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-zinc-400 block uppercase">Billing Capacity</span>
                  <span className="text-xs font-bold text-zinc-800">
                    {org360Data.contract ? `${org360Data.contract.contractType} (${org360Data.contract.totalHours}h)` : 'No Contract Active'}
                  </span>
                </div>
              </div>

              {/* Top Row: Telemetry Gauges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-50 rounded border border-zinc-200 p-3 text-center">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block">SLA Compliance</span>
                  <span className="text-lg font-bold text-zinc-950 mt-1 block flex items-center justify-center gap-1">
                    {org360Data.compliancePct}%
                    <span className={`h-1.5 w-1.5 rounded-full ${org360Data.compliancePct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  </span>
                </div>

                <div className="bg-zinc-50 rounded border border-zinc-200 p-3 text-center">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block">Hours Logged</span>
                  <span className="text-lg font-bold text-zinc-950 mt-1 block">{org360Data.totalHours.toFixed(1)}h</span>
                  <span className="text-[8px] text-zinc-400 block mt-0.5">({org360Data.billableHours.toFixed(1)}h billable)</span>
                </div>

                <div className="bg-zinc-50 rounded border border-zinc-200 p-3 text-center">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block">Avg Resolution</span>
                  <span className="text-lg font-bold text-zinc-950 mt-1 block">
                    {org360Data.avgResolutionHours} {org360Data.avgResolutionHours !== 'N/A' ? 'hrs' : ''}
                  </span>
                </div>

                <div className="bg-zinc-50 rounded border border-zinc-200 p-3 text-center">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block">Average CSAT</span>
                  <span className="text-lg font-bold text-zinc-950 mt-1 block flex items-center justify-center gap-1">
                    {org360Data.avgCsat}
                    <HeartHandshake size={11} className="text-zinc-500" />
                  </span>
                </div>
              </div>

              {/* Roster of Active Consultants assigned to this Customer */}
              <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-450 mb-2">Active Consultant Roster</h3>
                {org360Data.activeConsultants.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 italic">No consultants actively assigned to open issues.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {org360Data.activeConsultants.map(c => (
                      <div key={c.name} className="px-2.5 py-1 rounded bg-zinc-50 border border-zinc-200 text-[10px] flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[8px]">
                          {c.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-800">{c.name}</span>
                          <span className="text-[8px] text-zinc-400 font-mono ml-1.5 bg-zinc-150 px-1 rounded uppercase">{c.module}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Escalations History Log */}
              <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-450 mb-2">Escalation Events Registry</h3>
                {org360Data.escalations.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 italic">No escalation records found for this organization.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {org360Data.escalations.map(esc => (
                      <div key={esc.id} className="p-2 border border-zinc-150 rounded bg-red-50/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-700">
                          <AlertTriangle size={12} className="text-amber-600" />
                          <span className="font-semibold">{esc.ticketId} escalated by {esc.escalatedBy}</span>
                        </div>
                        <span className={`px-1.5 py-0.1 rounded text-[8px] font-bold uppercase ${
                          esc.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {esc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ticket list for this Org */}
              <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-450 mb-2 flex items-center gap-1.5">
                  <FileText size={12} />
                  Incidents & Tickets Registry ({org360Data.tickets.length})
                </h3>
                {org360Data.tickets.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-200 rounded text-zinc-400">
                    No tickets registered for this organization.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {org360Data.tickets.map(t => (
                      <div key={t.id} className="border border-zinc-150 rounded p-2 hover:bg-zinc-50 transition-colors flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 text-[10px] font-mono">{t.id}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                            t.priority === 'Critical' ? 'bg-red-950 text-white' :
                            t.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                            t.priority === 'Medium' ? 'bg-zinc-100 text-zinc-800' :
                            'bg-zinc-50 text-zinc-650'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                        <h4 className="font-bold text-zinc-800 text-[10px] line-clamp-1">{t.title}</h4>
                        <div className="flex items-center justify-between text-[8px] text-zinc-400 font-mono mt-0.5 border-t border-zinc-100 pt-1">
                          <span>Owner: {t.assignedConsultant || 'Unassigned'}</span>
                          <span className="px-1.5 py-0.1 bg-zinc-100 text-zinc-700 rounded font-semibold">{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Assets/Attachments */}
              <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-450 mb-2">Shared File Assets ({org360Data.attachments.length})</h3>
                {org360Data.attachments.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 italic">No attachments registered on ticket operations.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                    {org360Data.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.fileUrl || att.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-zinc-150 rounded bg-zinc-50 hover:bg-zinc-100 transition flex items-center justify-between gap-2 text-zinc-750"
                      >
                        <span className="font-semibold truncate max-w-[120px]">{att.fileName}</span>
                        <span className="text-[8px] text-zinc-400 shrink-0">{(att.fileSize / 1024).toFixed(0)} KB</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-zinc-200 border-dashed rounded-xl py-24 text-center text-zinc-400 font-mono shadow-sm">
              <Building2 className="mx-auto text-zinc-300 mb-2" size={32} />
              Select an organization from the directory to inspect 360 telemetry.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
