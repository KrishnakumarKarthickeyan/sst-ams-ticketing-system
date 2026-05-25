'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { KanbanSquare, Check, Users, Sparkles, Filter, ShieldCheck, UserCheck, Trash2, Plus, Clock, HelpCircle, CornerDownLeft } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';

// Helper: Calculate Sunday through Thursday working days in a month (excluding Friday/Saturday)
function getWorkingDaysCount(year: number, monthIndex: number) {
  let count = 0;
  const date = new Date(year, monthIndex, 1);
  while (date.getMonth() === monthIndex) {
    const day = date.getDay();
    if (day !== 5 && day !== 6) { // 5 = Friday, 6 = Saturday
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count;
}

const defaultConsultants = [
  { id: 'usr-consult-333', name: 'Priya Raman', role: 'Functional MM/SD Lead', email: 'consultant@sap.com', modules: ['MM', 'SD', 'FICO', 'HCM'], skills: 'MM Configuration, Pricing Procedures, Shipping Points, OB52, LSMW', active: true, consultantType: 'Functional' },
  { id: 'usr-consult-444', name: 'Arjun Mehta', role: 'Technical BASIS Administrator', email: 'arjun.technical@example.com', modules: ['BASIS', 'ABAP', 'CPI', 'Fiori'], skills: 'Transport Management, RLS Policies, RFC Destinations, SSL Encryption, Kernel Updates', active: true, consultantType: 'Technical' },
  { id: 'usr-consult-111', name: 'Karthik Subramanian', role: 'Senior Functional Consultant', email: 'karthik@sap.com', modules: ['MM', 'SD', 'PP'], skills: 'Subcontracting, Purchase Orders, Batch Management, MRP configurations', active: true, consultantType: 'Functional' },
  { id: 'usr-consult-222', name: 'Sanjay Dutt', role: 'Technical ABAP Developer', email: 'sanjay@sap.com', modules: ['ABAP', 'CPI', 'Fiori'], skills: 'BADI, User Exits, Smartforms, IDOCs, Adobe Forms, Enhancement Spots', active: true, consultantType: 'Technical' },
  { id: 'usr-consult-555', name: 'Elena Rostova', role: 'Functional FICO Consultant', email: 'elena@sap.com', modules: ['FICO', 'TRM'], skills: 'General Ledger, Accounts Payable, Cost Centers, Asset Accounting', active: true, consultantType: 'Functional' },
  { id: 'usr-consult-666', name: 'Rajesh Kumar', role: 'Technical Integration Architect', email: 'rajesh@sap.com', modules: ['CPI/Integration', 'BASIS', 'ABAP'], skills: 'CPI iflows, EDI mappings, RFC, SOAP, IDoc integrations', active: true, consultantType: 'Technical' },
];

export default function ManagerAssignmentBoardPage() {
  const { tickets, updateTicket, updateTicketStatus } = useTickets();
  const [consultants, setConsultants] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load Stakeholders from LocalStorage or fallback
  useEffect(() => {
    const stored = localStorage.getItem('sst_stakeholder_consultants');
    if (stored) {
      setConsultants(JSON.parse(stored));
    } else {
      setConsultants(defaultConsultants);
    }
  }, []);

  // Compute live metrics for each consultant
  const consultantMetrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const workingDays = getWorkingDaysCount(currentYear, currentMonth);
    const expectedCapacityHours = workingDays * 8; // skip Fri/Sat

    return consultants.map(consultant => {
      // 1. Active backlog (assigned in tickets, not Closed and not Resolved)
      const activeBacklog = tickets.filter(t => {
        const isAssigned = (t.consultantEfforts || []).some(e => e.consultantName === consultant.name) ||
                            t.assignedConsultant === consultant.name;
        return isAssigned && t.status !== 'Closed' && t.status !== 'Resolved';
      }).length;

      // 2. Critical tickets assigned
      const criticalCount = tickets.filter(t => {
        const isAssigned = (t.consultantEfforts || []).some(e => e.consultantName === consultant.name) ||
                            t.assignedConsultant === consultant.name;
        return isAssigned && t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved';
      }).length;

      // 3. Current month actual approved effort hours
      const actualHours = tickets.reduce((sum, ticket) => {
        const approvedLogs = (ticket.efforts || []).filter(e => {
          const isMe = e.consultantName === consultant.name;
          if (!isMe) return false;
          const d = new Date(e.workDate || e.activityDate || e.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.status === 'Approved';
        });
        return sum + approvedLogs.reduce((s, l) => s + (l.hoursWorked || l.hoursLogged || 0), 0);
      }, 0);

      // 4. Utilization %
      const utilization = expectedCapacityHours > 0 
        ? Math.min(120, Math.round((actualHours / expectedCapacityHours) * 100))
        : 0;

      // 5. Workload status flag (Healthy, Near Capacity, Overloaded)
      let workloadStatus: 'Healthy' | 'Near Capacity' | 'Overloaded' = 'Healthy';
      if (utilization > 92 || activeBacklog > 5) {
        workloadStatus = 'Overloaded';
      } else if (utilization >= 70 || activeBacklog >= 4) {
        workloadStatus = 'Near Capacity';
      }

      return {
        ...consultant,
        activeBacklog,
        criticalCount,
        actualHours,
        utilization,
        workloadStatus
      };
    });
  }, [consultants, tickets]);

  // Selected Ticket Object
  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Track checked consultants for assignment modification
  const [selectedFuncNames, setSelectedFuncNames] = useState<string[]>([]);
  const [selectedTechNames, setSelectedTechNames] = useState<string[]>([]);

  // Update selection states when selected ticket changes
  useEffect(() => {
    if (selectedTicket) {
      const currentEfforts = selectedTicket.consultantEfforts || [];
      
      const funcAssigned = currentEfforts
        .filter(e => e.consultantType === 'Functional')
        .map(e => e.consultantName);

      const techAssigned = currentEfforts
        .filter(e => e.consultantType === 'Technical')
        .map(e => e.consultantName);

      // Backwards compatibility fallback if efforts are empty but assignedConsultant exists
      if (currentEfforts.length === 0 && selectedTicket.assignedConsultant) {
        const primaryMatch = consultants.find(c => c.name === selectedTicket.assignedConsultant);
        if (primaryMatch) {
          if (primaryMatch.consultantType === 'Functional') {
            funcAssigned.push(primaryMatch.name);
          } else {
            techAssigned.push(primaryMatch.name);
          }
        }
      }

      setSelectedFuncNames(funcAssigned);
      setSelectedTechNames(techAssigned);
    } else {
      setSelectedFuncNames([]);
      setSelectedTechNames([]);
    }
  }, [selectedTicket, consultants]);

  // Handle saving allocations (Multiple Functional and Technical resources)
  const handleSaveAllocations = () => {
    if (!selectedTicket) return;

    const mergedNames = [...selectedFuncNames, ...selectedTechNames];
    
    // 1. Build consultant efforts array
    const oldEfforts = selectedTicket.consultantEfforts || [];
    const newEfforts = mergedNames.map(name => {
      const match = consultantMetrics.find(c => c.name === name);
      const existing = oldEfforts.find(e => e.consultantName === name);

      return {
        id: existing?.id || `eff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ticketId: selectedTicket.id,
        consultantId: match?.id || name,
        consultantName: name,
        consultantType: match?.consultantType || 'Functional',
        estimatedHours: existing?.estimatedHours || 0,
        actualHours: existing?.actualHours || 0,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // 2. Map Primary Assigned Consultant (Usually first functional, or first in list)
    const primaryConsultant = selectedFuncNames[0] || selectedTechNames[0] || '';

    // 3. Auto-transition status from New -> Assigned
    let nextStatus = selectedTicket.status;
    if (primaryConsultant && selectedTicket.status === 'New') {
      nextStatus = 'Assigned';
    }

    // 4. Construct Audit history
    const hist = [...selectedTicket.history];
    const oldAssignedList = oldEfforts.map(e => e.consultantName).join(', ') || selectedTicket.assignedConsultant || 'None';
    const newAssignedList = mergedNames.join(', ') || 'Unassigned';

    hist.push({
      id: `h-alloc-${Date.now()}`,
      ticketId: selectedTicket.id,
      changedBy: 'Marcus Vance (Manager)',
      fieldChanged: 'Assigned Consultant',
      oldValue: oldAssignedList,
      newValue: newAssignedList,
      createdAt: new Date().toISOString()
    });

    if (nextStatus !== selectedTicket.status) {
      hist.push({
        id: `h-status-auto-${Date.now()}`,
        ticketId: selectedTicket.id,
        changedBy: 'Marcus Vance (Manager)',
        fieldChanged: 'Status',
        oldValue: selectedTicket.status,
        newValue: nextStatus,
        createdAt: new Date().toISOString()
      });
    }

    // 5. Submit update
    updateTicket(selectedTicket.id, {
      consultantEfforts: newEfforts,
      assignedConsultant: primaryConsultant || undefined,
      status: nextStatus,
      history: hist
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleFunc = (name: string) => {
    setSelectedFuncNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleToggleTech = (name: string) => {
    setSelectedTechNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Kanban Column Filter lists
  const newTickets = tickets.filter(t => t.status === 'New');
  const assignedTickets = tickets.filter(t => t.status === 'Assigned');
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress' || t.status === 'In Progress - Functional' || t.status === 'In Progress - Technical' || t.status === 'Requirement Gathering');
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Request for Closure');

  const renderColumn = (title: string, list: typeof tickets, statusVal: string, dotColor: string) => {
    return (
      <div className="flex-1 min-w-[240px] bg-zinc-50 border-r border-zinc-200 p-3 flex flex-col h-[calc(100vh-14rem)] space-y-3">
        <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
          <span className="font-bold text-xs uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            <span>{title}</span>
            <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 font-mono text-[9px] py-0 px-1.5 border-none font-bold">
              {list.length}
            </Badge>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
          {list.length === 0 ? (
            <div className="h-20 border border-dashed border-zinc-250 rounded flex items-center justify-center">
              <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Queue Empty</span>
            </div>
          ) : (
            list.map((ticket) => {
              const isSelected = selectedTicketId === ticket.id;
              
              // Priority dots mapping
              let pColor = 'bg-zinc-400';
              if (ticket.priority === 'Critical') pColor = 'bg-red-500';
              else if (ticket.priority === 'High') pColor = 'bg-amber-400';
              else if (ticket.priority === 'Medium') pColor = 'bg-blue-400';

              const assignedCount = (ticket.consultantEfforts || []).length || (ticket.assignedConsultant ? 1 : 0);

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`group relative p-2.5 bg-white border rounded shadow-sm hover:shadow transition cursor-pointer select-none ${
                    isSelected ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-200 hover:border-zinc-350'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-[9px] text-zinc-950 tracking-wider font-mono">{ticket.id}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${pColor}`} />
                  </div>

                  <div className="text-[11px] font-bold text-zinc-900 line-clamp-2 mt-1 leading-snug">{ticket.title}</div>
                  <div className="text-[9px] text-zinc-450 mt-0.5 truncate">{ticket.organization}</div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 text-[9px] font-mono text-zinc-500">
                    <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border-none font-bold text-[8px] py-0 px-1 uppercase">
                      {ticket.sapModule}
                    </Badge>
                    <span className="font-semibold text-zinc-600">
                      {assignedCount === 0 ? 'Unassigned' : `${assignedCount} Staff`}
                    </span>
                  </div>

                  {/* Inline move status options */}
                  <div className="absolute top-1.5 right-4.5 hidden group-hover:block bg-white border border-zinc-950 rounded px-1 py-0.5 shadow-sm z-30">
                    <select
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.value) {
                          updateTicketStatus(ticket.id, e.target.value as any, 'Marcus Vance');
                        }
                      }}
                      className="bg-transparent text-[8px] font-bold uppercase tracking-wider font-mono text-zinc-950 focus:outline-none cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>Move</option>
                      <option value="New">New</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* Title */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 flex items-center gap-2">
          <KanbanSquare size={16} className="text-zinc-600" />
          <span>Smart Assignment board</span>
        </h1>
        <p className="text-zinc-500 mt-1">
          Perform live workload audits, select active queues, and assign multiple Functional and Technical consultants to tickets.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Kanban Board columns (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-zinc-200 rounded-lg shadow-sm flex overflow-x-auto min-h-[500px]">
          {renderColumn('Incoming', newTickets, 'New', 'bg-zinc-400')}
          {renderColumn('Assigned', assignedTickets, 'Assigned', 'bg-blue-400')}
          {renderColumn('Active Work', inProgressTickets, 'In Progress', 'bg-amber-400')}
          {renderColumn('Resolved', resolvedTickets, 'Resolved', 'bg-emerald-500')}
        </div>

        {/* Selected Ticket details & Allocation Panel (4 Cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border border-zinc-250 shadow-md">
            
            <CardHeader className="bg-zinc-950 text-white rounded-t-lg">
              <div className="flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest text-zinc-400">
                <Sparkles size={11} className="text-zinc-350" />
                <span>Allocation Command Console</span>
              </div>
              <CardTitle className="text-white text-xs uppercase tracking-wide mt-1.5">Resource Allocator</CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {!selectedTicket ? (
                <div className="py-16 text-center text-zinc-400 italic space-y-2">
                  <Users size={20} className="mx-auto text-zinc-300" />
                  <p className="text-[10px] uppercase font-bold text-zinc-500">No ticket selected</p>
                  <p className="text-[9px] text-zinc-450 leading-relaxed">
                    Select a ticket from the Kanban board to trigger matches and allocate Functional/Technical staff.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Selected Ticket Metadata */}
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50 space-y-2">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold text-zinc-950">{selectedTicket.id}</span>
                      <Badge className="bg-zinc-900 text-white hover:bg-zinc-900 text-[8px] py-0 px-1 border-none font-bold uppercase">
                        {selectedTicket.sapModule}
                      </Badge>
                    </div>
                    <div className="font-bold text-zinc-900 leading-snug">{selectedTicket.title}</div>
                    <div className="text-[10px] text-zinc-500">
                      <strong>Client:</strong> {selectedTicket.organization} | <strong>Priority:</strong> {selectedTicket.priority}
                    </div>
                  </div>

                  {saveSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded font-bold uppercase text-[9px] flex items-center gap-1 animate-pulse">
                      <Check size={11} className="text-emerald-600" />
                      <span>Assignments updated successfully</span>
                    </div>
                  )}

                  {/* Functional Consultant Selection */}
                  <div className="space-y-2">
                    <span className="font-bold block text-[10px] uppercase tracking-wide text-zinc-600 pb-1 border-b border-zinc-100">
                      Functional Staff (Multi-Select)
                    </span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {consultantMetrics
                        .filter(c => c.consultantType === 'Functional')
                        .map(c => {
                          const isChecked = selectedFuncNames.includes(c.name);
                          const isExpertMatch = c.modules.includes(selectedTicket.sapModule);

                          // Workload Color
                          let uColor = 'bg-emerald-500';
                          if (c.workloadStatus === 'Overloaded') uColor = 'bg-red-655';
                          else if (c.workloadStatus === 'Near Capacity') uColor = 'bg-amber-500';

                          return (
                            <label
                              key={c.id}
                              className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer select-none transition ${
                                isChecked ? 'border-zinc-900 bg-zinc-50/20' : 'border-zinc-200 hover:border-zinc-350'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleFunc(c.name)}
                                className="accent-zinc-950 mt-1 cursor-pointer h-3.5 w-3.5 rounded border-zinc-300"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-zinc-900">{c.name}</span>
                                  {isExpertMatch && (
                                    <Badge className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[7px] py-0 px-1 font-bold">
                                      Match
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                                  <span>Active: {c.activeBacklog} tix ({c.criticalCount} crit)</span>
                                  <span className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${uColor}`} />
                                    <span>Ute: {c.utilization}% ({c.actualHours}h)</span>
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  {/* Technical Consultant Selection */}
                  <div className="space-y-2">
                    <span className="font-bold block text-[10px] uppercase tracking-wide text-zinc-600 pb-1 border-b border-zinc-100">
                      Technical Staff (Multi-Select)
                    </span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {consultantMetrics
                        .filter(c => c.consultantType === 'Technical')
                        .map(c => {
                          const isChecked = selectedTechNames.includes(c.name);
                          const isExpertMatch = c.modules.includes(selectedTicket.sapModule);

                          // Workload Color
                          let uColor = 'bg-emerald-500';
                          if (c.workloadStatus === 'Overloaded') uColor = 'bg-red-655';
                          else if (c.workloadStatus === 'Near Capacity') uColor = 'bg-amber-500';

                          return (
                            <label
                              key={c.id}
                              className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer select-none transition ${
                                isChecked ? 'border-zinc-900 bg-zinc-50/20' : 'border-zinc-200 hover:border-zinc-350'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleTech(c.name)}
                                className="accent-zinc-950 mt-1 cursor-pointer h-3.5 w-3.5 rounded border-zinc-300"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-zinc-900">{c.name}</span>
                                  {isExpertMatch && (
                                    <Badge className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[7px] py-0 px-1 font-bold">
                                      Match
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                                  <span>Active: {c.activeBacklog} tix ({c.criticalCount} crit)</span>
                                  <span className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${uColor}`} />
                                    <span>Ute: {c.utilization}% ({c.actualHours}h)</span>
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-zinc-150 flex gap-2">
                    <button
                      onClick={() => { setSelectedTicketId(null); }}
                      className="flex-1 py-1.5 border border-zinc-250 hover:bg-zinc-50 rounded uppercase font-bold text-[10px] text-zinc-700 transition"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveAllocations}
                      className="flex-1 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded uppercase font-bold text-[10px] tracking-wider transition"
                    >
                      Save Allocations
                    </button>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
