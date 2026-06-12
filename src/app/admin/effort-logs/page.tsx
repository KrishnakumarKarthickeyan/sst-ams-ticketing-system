'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { ArrowLeft, Clock, Search, Shield, Filter, FileText, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminEffortLogsPage() {
  const { tickets } = useTickets();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedConsultant, setSelectedConsultant] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Extract all effort logs and link them with ticket metadata (organization, etc.)
  const allLogs = tickets.flatMap(ticket => 
    (ticket.efforts || []).map(effort => ({
      ...effort,
      ticketTitle: ticket.title,
      sapModule: ticket.sapModule,
      organization: ticket.organization,
      priority: ticket.priority,
      ticketNumber: ticket.ticketNumber
    }))
  );

  // Sorting: newest logged first
  allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Extracted unique filter values
  const organizations = ['All', ...Array.from(new Set(allLogs.map(l => l.organization)))];
  const consultants = ['All', ...Array.from(new Set(allLogs.map(l => l.consultantName)))];

  // Filtering
  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = 
      log.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ticketNumber && log.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.ticketTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.consultantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = selectedOrg === 'All' || log.organization === selectedOrg;
    const matchesConsultant = selectedConsultant === 'All' || log.consultantName === selectedConsultant;
    const matchesStatus = selectedStatus === 'All' || log.status === selectedStatus;

    return matchesSearch && matchesOrg && matchesConsultant && matchesStatus;
  });

  // Aggregated summaries
  const totalLoggedHours = filteredLogs.reduce((sum, l) => sum + l.hoursLogged, 0);
  const totalBillableHours = filteredLogs.filter(l => l.billable).reduce((sum, l) => sum + l.hoursLogged, 0);
  const totalNonBillableHours = filteredLogs.filter(l => !l.billable).reduce((sum, l) => sum + l.hoursLogged, 0);
  
  const approvedHours = filteredLogs.filter(l => l.status === 'Approved').reduce((sum, l) => sum + l.hoursLogged, 0);
  const pendingHours = filteredLogs.filter(l => l.status === 'Pending').reduce((sum, l) => sum + l.hoursLogged, 0);
  const rejectedHours = filteredLogs.filter(l => l.status === 'Rejected').reduce((sum, l) => sum + l.hoursLogged, 0);

  // Group by customer organization
  const customerBreakdown = filteredLogs.reduce((acc, log) => {
    acc[log.organization] = (acc[log.organization] || 0) + log.hoursLogged;
    return acc;
  }, {} as Record<string, number>);

  // Group by consultant
  const consultantBreakdown = filteredLogs.reduce((acc, log) => {
    acc[log.consultantName] = (acc[log.consultantName] || 0) + log.hoursLogged;
    return acc;
  }, {} as Record<string, number>);

  // Group by ticket
  const ticketBreakdown = filteredLogs.reduce((acc, log) => {
    acc[log.ticketId] = {
      hours: (acc[log.ticketId]?.hours || 0) + log.hoursLogged,
      title: log.ticketTitle,
      ticketNumber: log.ticketNumber
    };
    return acc;
  }, {} as Record<string, { hours: number; title: string; ticketNumber?: string }>);

  // Group by month
  const monthBreakdown = filteredLogs.reduce((acc, log) => {
    const month = log.activityDate ? log.activityDate.substring(0, 7) : 'Unknown'; // e.g. "2026-05"
    acc[month] = (acc[month] || 0) + log.hoursLogged;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 text-xs text-ink">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink transition">
          <ArrowLeft size={12} />
          Back to Dashboard
        </Link>
        <div className="bg-surface-subtle px-2 py-1 rounded text-ink-secondary border border-line uppercase tracking-widest text-[11px] flex items-center gap-1 font-bold">
          <Shield size={10} />
          Super Admin Console
        </div>
      </div>

      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">Consultant Timesheets & Effort Logs</h1>
        <p className="type-meta mt-1 text-ink-secondary">Audit billing items, view work breakdowns, and track project efforts globally.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-surface border border-line p-4 rounded-lg shadow-card space-y-1">
          <div className="text-ink-muted font-bold text-[11px] uppercase">Total Hours</div>
          <div className="text-lg font-bold text-ink flex items-baseline gap-1">
            {totalLoggedHours.toFixed(1)} <span className="text-[11px] font-normal text-ink-muted">h</span>
          </div>
        </div>

        <div className="bg-surface border border-line p-4 rounded-lg shadow-card space-y-1">
          <div className="text-ink-muted font-bold text-[11px] uppercase">Billable</div>
          <div className="text-lg font-bold text-ink flex items-baseline gap-1">
            {totalBillableHours.toFixed(1)} <span className="text-[11px] font-normal text-ink-muted">h</span>
          </div>
        </div>

        <div className="bg-surface border border-line p-4 rounded-lg shadow-card space-y-1">
          <div className="text-ink-muted font-bold text-[11px] uppercase">Non-Billable</div>
          <div className="text-lg font-bold text-ink-secondary flex items-baseline gap-1">
            {totalNonBillableHours.toFixed(1)} <span className="text-[11px] font-normal text-ink-muted">h</span>
          </div>
        </div>

        <div className="bg-surface border border-line p-4 rounded-lg shadow-card space-y-1 border-l-4 border-l-emerald-500">
          <div className="text-ink-muted font-bold text-[11px] uppercase">Approved</div>
          <div className="text-lg font-bold text-emerald-700 flex items-baseline gap-1">
            {approvedHours.toFixed(1)} <span className="text-[11px] font-normal text-ink-muted">h</span>
          </div>
        </div>

        <div className="bg-surface border border-line p-4 rounded-lg shadow-card space-y-1 border-l-4 border-l-amber-500">
          <div className="text-ink-muted font-bold text-[11px] uppercase">Pending</div>
          <div className="text-lg font-bold text-warning flex items-baseline gap-1">
            {pendingHours.toFixed(1)} <span className="text-[11px] font-normal text-ink-muted">h</span>
          </div>
        </div>

        <div className="bg-surface border border-line p-4 rounded-lg shadow-card space-y-1 border-l-4 border-l-red-500">
          <div className="text-ink-muted font-bold text-[11px] uppercase">Rejected</div>
          <div className="text-lg font-bold text-critical flex items-baseline gap-1">
            {rejectedHours.toFixed(1)} <span className="text-[11px] font-normal text-ink-muted">h</span>
          </div>
        </div>
      </div>

      {/* Aggregate Grouping Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Ticket Summary */}
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3 shadow-card">
          <h3 className="font-bold uppercase tracking-wider text-[11px] text-ink border-b border-line pb-2">By Ticket</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(ticketBreakdown).length === 0 ? (
              <p className="text-ink-muted italic text-[11px]">No efforts logged.</p>
            ) : (
              Object.entries(ticketBreakdown).map(([ticketId, info]) => (
                <div key={ticketId} className="flex justify-between items-start text-[11px]">
                  <div className="truncate w-3/4">
                    <Link href={`/admin/tickets/${ticketId}`} className="font-bold text-ink hover:underline">
                      {info.ticketNumber || ticketId}
                    </Link>
                    <div className="text-ink-muted truncate text-[11px]">{info.title}</div>
                  </div>
                  <span className="font-bold text-ink text-right">{info.hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consultant Summary */}
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3 shadow-card">
          <h3 className="font-bold uppercase tracking-wider text-[11px] text-ink border-b border-line pb-2">By Consultant</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(consultantBreakdown).length === 0 ? (
              <p className="text-ink-muted italic text-[11px]">No efforts logged.</p>
            ) : (
              Object.entries(consultantBreakdown).map(([consultant, hours]) => (
                <div key={consultant} className="flex justify-between items-center text-[11px]">
                  <span className="text-ink-secondary font-bold">{consultant}</span>
                  <span className="font-bold text-ink">{hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Summary */}
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3 shadow-card">
          <h3 className="font-bold uppercase tracking-wider text-[11px] text-ink border-b border-line pb-2">By Organization</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(customerBreakdown).length === 0 ? (
              <p className="text-ink-muted italic text-[11px]">No efforts logged.</p>
            ) : (
              Object.entries(customerBreakdown).map(([org, hours]) => (
                <div key={org} className="flex justify-between items-center text-[11px]">
                  <span className="text-ink-secondary font-bold truncate max-w-[150px]">{org}</span>
                  <span className="font-bold text-ink">{hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Month Summary */}
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3 shadow-card">
          <h3 className="font-bold uppercase tracking-wider text-[11px] text-ink border-b border-line pb-2">By Month</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(monthBreakdown).length === 0 ? (
              <p className="text-ink-muted italic text-[11px]">No efforts logged.</p>
            ) : (
              Object.entries(monthBreakdown).map(([month, hours]) => (
                <div key={month} className="flex justify-between items-center text-[11px]">
                  <span className="text-ink-secondary font-bold">{month}</span>
                  <span className="font-bold text-ink">{hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-surface border border-line rounded-lg p-4 shadow-card flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-ink-muted">
            <Search size={12} />
          </span>
          <input
            type="text"
            placeholder="Search logs by ID, title, consultant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-line pl-8 pr-3 py-1.5 rounded text-xs text-ink focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5">
            <Filter size={10} className="text-ink-muted" />
            <span className="font-bold text-ink-secondary uppercase text-[11px]">Organization:</span>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="bg-surface border border-line rounded p-1 text-[11px] focus:outline-none"
            >
              {organizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-ink-secondary uppercase text-[11px]">Consultant:</span>
            <select
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="bg-surface border border-line rounded p-1 text-[11px] focus:outline-none"
            >
              {consultants.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-ink-secondary uppercase text-[11px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-surface border border-line rounded p-1 text-[11px] focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Effort Logs Table */}
      <div className="bg-surface border border-line rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-muted border-b border-line text-ink-secondary font-bold uppercase text-[11px] tracking-wider">
              <th className="py-2.5 px-4">Ticket</th>
              <th className="py-2.5 px-4">Consultant</th>
              <th className="py-2.5 px-4">Organization</th>
              <th className="py-2.5 px-4">Date / Time</th>
              <th className="py-2.5 px-4">Activity</th>
              <th className="py-2.5 px-4">Description</th>
              <th className="py-2.5 px-4 text-center">Hours</th>
              <th className="py-2.5 px-4 text-center">Billing</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-[11px]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-muted italic">
                  No effort logs match the active query filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-muted transition">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <Link href={`/admin/tickets/${log.ticketId}`} className="font-bold text-ink hover:underline">
                      {log.ticketNumber || log.ticketId}
                    </Link>
                    <span className="ml-1.5 px-1 py-0.5 bg-surface-subtle text-ink-secondary rounded text-[11px]">
                      {log.sapModule}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-ink whitespace-nowrap">
                    {log.consultantName}
                  </td>
                  <td className="py-2.5 px-4 text-ink-secondary max-w-[130px] truncate">
                    {log.organization}
                  </td>
                  <td className="py-2.5 px-4 text-ink-secondary whitespace-nowrap">
                    <div>{log.activityDate}</div>
                    <div className="text-[11px] text-ink-muted font-normal">
                      {log.startTime} - {log.endTime}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.5 border border-line-strong bg-surface-muted rounded text-ink-secondary text-[11px] font-bold uppercase">
                      {log.activityType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-ink-secondary max-w-[200px] truncate" title={log.description}>
                    {log.description}
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold text-ink">
                    {log.hoursLogged.toFixed(1)}h
                  </td>
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    {log.billable ? (
                      <span className="text-emerald-700 font-bold">Billable</span>
                    ) : (
                      <span className="text-ink-muted">Non-Billable</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    {log.status === 'Approved' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 size={10} className="text-success" />
                        Approved
                      </span>
                    )}
                    {log.status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 text-warning font-bold bg-amber-50 px-1 py-0.5 border border-amber-200 rounded text-[11px]">
                        Pending
                      </span>
                    )}
                    {log.status === 'Rejected' && (
                      <span className="inline-flex items-center gap-1 text-critical font-bold">
                        <XCircle size={10} className="text-critical" />
                        Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
