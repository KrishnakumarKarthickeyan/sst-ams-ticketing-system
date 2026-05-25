'use client';

import React, { useState, useEffect } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { Activity, Clock, Check, Calendar, ArrowLeft, AlertCircle, CheckCircle2, XCircle, X } from 'lucide-react';
import Link from 'next/link';
import { EffortActivityType, EffortLog } from '../../../types/ticket';

export default function ConsultantEffortLogsPage() {
  const { tickets, logEffort, resubmitEffortLog } = useTickets();
  const { user } = useAuth();
  
  const consultantName = user?.name || 'Karthik Subramanian';

  // Form states
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('2.0');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<EffortActivityType>('Development');
  const [billable, setBillable] = useState(true);
  const [success, setSuccess] = useState(false);

  // Resubmit states
  const [resubmittingLog, setResubmittingLog] = useState<EffortLog | null>(null);
  const [resubmitHours, setResubmitHours] = useState('');
  const [resubmitDate, setResubmitDate] = useState('');
  const [resubmitDesc, setResubmitDesc] = useState('');
  const [resubmitActivity, setResubmitActivity] = useState<EffortActivityType>('Development');
  const [resubmitBillable, setResubmitBillable] = useState(true);

  // Filter out consultant details based on our default session user
  const myOpenTickets = tickets.filter(t => t.assignedConsultant === consultantName && t.status !== 'Resolved' && t.status !== 'Closed');

  // Compile all logs submitted by this consultant
  const logsList = tickets.flatMap(t => 
    (t.efforts || [])
      .filter(e => e.consultantName === consultantName)
      .map(e => ({
        ...e,
        ticketTitle: t.title,
        sapModule: t.sapModule
      }))
  );

  const sortedLogs = logsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const totalApprovedHours = logsList
    .filter(l => l.status === 'Approved')
    .reduce((sum, l) => sum + (l.hoursWorked || l.hoursLogged || 0), 0);

  const totalPendingHours = logsList
    .filter(l => l.status === 'Pending Approval' || l.status === 'Pending')
    .reduce((sum, l) => sum + (l.hoursWorked || l.hoursLogged || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = Number(hours);
    if (!selectedTicketId || !hours || hoursNum <= 0 || hoursNum > 24 || !description.trim()) return;

    logEffort({
      ticketId: selectedTicketId,
      hours: hoursNum,
      description,
      consultantName,
      activityType,
      billable,
      workDate: date
    });

    setDescription('');
    setHours('2.0');
    setSelectedTicketId('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleResubmitOpen = (log: EffortLog) => {
    setResubmittingLog(log);
    setResubmitHours(String(log.hoursWorked || log.hoursLogged || ''));
    setResubmitDate(log.workDate || log.activityDate || new Date().toISOString().split('T')[0]);
    setResubmitDesc(log.description || '');
    setResubmitActivity(log.activityType || 'Development');
    setResubmitBillable(log.billable);
  };

  const handleResubmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = Number(resubmitHours);
    if (!resubmittingLog || hoursNum <= 0 || hoursNum > 24 || !resubmitDesc.trim()) return;

    resubmitEffortLog(resubmittingLog.ticketId, resubmittingLog.id, {
      hoursWorked: hoursNum,
      workDate: resubmitDate,
      description: resubmitDesc,
      activityType: resubmitActivity,
      billable: resubmitBillable
    });

    setResubmittingLog(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/consultant/dashboard" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-955 transition">
          <ArrowLeft size={12} />
          Back to Dashboard
        </Link>
        <span className="text-[10px] text-zinc-400 font-bold uppercase">Time Recording Terminal</span>
      </div>

      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-955 font-mono">Timesheets & Working Time Logs</h1>
        <p className="text-zinc-500 mt-1">Submit activity descriptions, track work types, and check manager approvals on billed hours.</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-500 text-emerald-850 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5 animate-fade-in p-3 rounded">
          <CheckCircle2 size={14} className="text-emerald-600" />
          Working timesheet entry updated successfully. Queued for Manager validation.
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Form Column */}
        <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm h-fit">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2 flex items-center gap-1.5">
            <Activity size={14} />
            Log Support Effort
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ticket Selector */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-500 uppercase text-[9px]">Target Incident</label>
              <select
                required
                value={selectedTicketId}
                onChange={(e) => setSelectedTicketId(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 font-mono focus:outline-none focus:border-zinc-950"
              >
                <option value="">Choose assigned ticket</option>
                {myOpenTickets.map(t => (
                  <option key={t.id} value={t.id}>{t.id} - {t.title.substring(0, 25)}...</option>
                ))}
              </select>
            </div>

            {/* Date and Activity Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase text-[9px]">Activity Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 font-mono focus:outline-none focus:border-zinc-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase text-[9px]">Activity Type</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as EffortActivityType)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 font-mono focus:outline-none focus:border-zinc-950"
                >
                  <option value="Analysis">Analysis</option>
                  <option value="Configuration">Configuration</option>
                  <option value="Development">Development</option>
                  <option value="Testing">Testing</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Support">Support</option>
                  <option value="Debugging">Debugging</option>
                  <option value="Customer Coordination">Customer Coordination</option>
                  <option value="SAP Follow-up">SAP Follow-up</option>
                </select>
              </div>
            </div>

            {/* Hours worked */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase text-[9px]">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.1"
                  max="24"
                  placeholder="2.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 font-mono focus:outline-none focus:border-zinc-950"
                />
              </div>

              {/* Billing Checkbox */}
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="billable"
                  checked={billable}
                  onChange={(e) => setBillable(e.target.checked)}
                  className="rounded border-zinc-300 accent-zinc-950 text-zinc-900"
                />
                <label htmlFor="billable" className="font-bold text-zinc-700 uppercase text-[9px] cursor-pointer">
                  Billable hours
                </label>
              </div>
            </div>

            {/* Work description */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-500 uppercase text-[9px]">Work Description</label>
              <textarea
                required
                rows={4}
                placeholder="Detail customization codes, transactions ran, or configurations updated..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 font-mono focus:outline-none focus:border-zinc-950"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase tracking-wider text-[10px]"
            >
              Submit Timesheet entry
            </button>
          </form>
        </div>

        {/* Audit Log / History list Column */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950">Logged Time Sheets</h3>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold text-[10px]">
                Approved: {totalApprovedHours.toFixed(1)}h
              </span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold text-[10px]">
                Pending: {totalPendingHours.toFixed(1)}h
              </span>
            </div>
          </div>

          <div className="divide-y divide-zinc-200 overflow-y-auto max-h-[480px] pr-1">
            {sortedLogs.length === 0 ? (
              <p className="text-zinc-400 py-8 italic text-center">No timesheet effort logged.</p>
            ) : (
              sortedLogs.map((log) => {
                const hoursVal = log.hoursWorked !== undefined ? log.hoursWorked : log.hoursLogged;
                const dateVal = log.workDate || log.activityDate;
                
                return (
                  <div key={log.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-950">{log.ticketId}</span>
                        <span className="px-1.5 py-0.2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-[9px] rounded font-bold uppercase">
                          {log.sapModule}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                          log.billable ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                        }`}>
                          {log.billable ? 'Billable' : 'Non-Billable'}
                        </span>
                        <span className="px-1.5 py-0.2 bg-zinc-50 border border-zinc-250 text-zinc-650 rounded text-[8px] font-bold uppercase">
                          {log.activityType}
                        </span>
                      </div>
                      <p className="text-zinc-650 font-semibold">{log.description}</p>
                      <div className="text-[10px] text-zinc-450 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {dateVal}
                        </span>
                        {log.startTime && log.endTime && (
                          <span>Time: {log.startTime} - {log.endTime}</span>
                        )}
                      </div>
                      
                      {log.status === 'Rejected' && log.rejectionReason && (
                        <div className="bg-red-50 text-red-800 p-2 rounded border border-red-150 mt-1 max-w-md font-bold text-[9px]">
                          Rejection Reason: {log.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-lg font-black text-zinc-955">
                        +{hoursVal.toFixed(1)}h
                      </span>
                      
                      {log.status === 'Approved' && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold">
                          <CheckCircle2 size={11} className="text-emerald-500" />
                          Approved
                        </span>
                      )}
                      {(log.status === 'Pending' || log.status === 'Pending Approval') && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded text-[8px] uppercase">
                          Pending Approval
                        </span>
                      )}
                      {log.status === 'Resubmitted' && (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 border border-blue-200 rounded text-[8px] uppercase">
                          Resubmitted
                        </span>
                      )}
                      {log.status === 'Rejected' && (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex items-center gap-0.5 text-red-650 font-bold">
                            <XCircle size={11} className="text-red-500" />
                            Rejected
                          </span>
                          <button
                            onClick={() => handleResubmitOpen(log)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase text-[8px]"
                          >
                            Resubmit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RESUBMIT DIALOG MODAL */}
      {resubmittingLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-2xl w-full max-w-md overflow-hidden font-mono text-xs animate-fade-in">
            <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-200 flex justify-between items-center font-bold uppercase text-[10px] tracking-wide text-zinc-955 font-mono">
              <span>Resubmit Log &bull; {resubmittingLog.ticketId}</span>
              <button onClick={() => setResubmittingLog(null)} className="p-1 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-950">
                <X size={14} />
              </button>
            </div>
            
            <form onSubmit={handleResubmitSubmit} className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 p-2.5 rounded text-red-800 text-[10px]">
                <b>Manager Rejection Reason:</b>
                <p className="mt-1 italic">"{resubmittingLog.rejectionReason || 'No reason specified'}"</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="font-bold text-zinc-450 uppercase text-[9px]">Work Date</label>
                  <input
                    type="date"
                    value={resubmitDate}
                    onChange={(e) => setResubmitDate(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded p-1.5 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="font-bold text-zinc-450 uppercase text-[9px]">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    value={resubmitHours}
                    onChange={(e) => setResubmitHours(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded p-1.5 text-xs font-mono"
                    min="0.1"
                    max="24"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="font-bold text-zinc-450 uppercase text-[9px]">Activity Type</label>
                  <select
                    value={resubmitActivity}
                    onChange={(e) => setResubmitActivity(e.target.value as EffortActivityType)}
                    className="w-full bg-white border border-zinc-300 rounded p-1.5 text-xs font-mono"
                  >
                    <option value="Analysis">Analysis</option>
                    <option value="Configuration">Configuration</option>
                    <option value="Development">Development</option>
                    <option value="Testing">Testing</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Support">Support</option>
                    <option value="Debugging">Debugging</option>
                    <option value="Customer Coordination">Customer Coordination</option>
                    <option value="SAP Follow-up">SAP Follow-up</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 pt-3">
                  <input
                    type="checkbox"
                    id="resubmitBillableCheck"
                    checked={resubmitBillable}
                    onChange={(e) => setResubmitBillable(e.target.checked)}
                    className="rounded accent-zinc-950"
                  />
                  <label htmlFor="resubmitBillableCheck" className="font-bold text-zinc-655 uppercase text-[9px] cursor-pointer">Billable hours</label>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="font-bold text-zinc-450 uppercase text-[9px]">Resubmission Work Description</label>
                <textarea
                  value={resubmitDesc}
                  onChange={(e) => setResubmitDesc(e.target.value)}
                  placeholder="Explain configurations and updates details..."
                  className="w-full bg-white border border-zinc-300 rounded p-2 text-xs font-mono h-16 focus:outline-none"
                  required
                />
              </div>

              <span className="text-[9px] text-zinc-400 block">Resubmitting will create a new Pending Approval log version, and transition the rejected log status to Resubmitted.</span>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                <button type="button" onClick={() => setResubmittingLog(null)} className="px-3 py-1.5 border border-zinc-200 rounded hover:bg-zinc-50 font-bold uppercase">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase">Submit Version</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
