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
      priority: ticket.priority
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
      title: log.ticketTitle
    };
    return acc;
  }, {} as Record<string, { hours: number; title: string }>);

  // Group by month
  const monthBreakdown = filteredLogs.reduce((acc, log) => {
    const month = log.activityDate ? log.activityDate.substring(0, 7) : 'Unknown'; // e.g. "2026-05"
    acc[month] = (acc[month] || 0) + log.hoursLogged;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-950 transition">
          <ArrowLeft size={12} />
          Back to Dashboard
        </Link>
        <div className="bg-zinc-100 px-2 py-1 rounded text-zinc-600 border border-zinc-200 uppercase tracking-widest text-[9px] flex items-center gap-1 font-bold">
          <Shield size={10} />
          Super Admin Console
        </div>
      </div>

      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950">Consultant Timesheets & Effort Logs</h1>
        <p className="text-zinc-500 mt-1">Audit billing items, view work breakdowns, and track project efforts globally.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm space-y-1">
          <div className="text-zinc-400 font-bold text-[9px] uppercase">Total Hours</div>
          <div className="text-lg font-bold text-zinc-950 flex items-baseline gap-1">
            {totalLoggedHours.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">h</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm space-y-1">
          <div className="text-zinc-400 font-bold text-[9px] uppercase">Billable</div>
          <div className="text-lg font-bold text-zinc-950 flex items-baseline gap-1">
            {totalBillableHours.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">h</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm space-y-1">
          <div className="text-zinc-400 font-bold text-[9px] uppercase">Non-Billable</div>
          <div className="text-lg font-bold text-zinc-500 flex items-baseline gap-1">
            {totalNonBillableHours.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">h</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm space-y-1 border-l-4 border-l-emerald-500">
          <div className="text-zinc-400 font-bold text-[9px] uppercase">Approved</div>
          <div className="text-lg font-bold text-emerald-700 flex items-baseline gap-1">
            {approvedHours.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">h</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm space-y-1 border-l-4 border-l-amber-500">
          <div className="text-zinc-400 font-bold text-[9px] uppercase">Pending</div>
          <div className="text-lg font-bold text-amber-600 flex items-baseline gap-1">
            {pendingHours.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">h</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm space-y-1 border-l-4 border-l-red-500">
          <div className="text-zinc-400 font-bold text-[9px] uppercase">Rejected</div>
          <div className="text-lg font-bold text-red-600 flex items-baseline gap-1">
            {rejectedHours.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">h</span>
          </div>
        </div>
      </div>

      {/* Aggregate Grouping Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Ticket Summary */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">By Ticket</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(ticketBreakdown).length === 0 ? (
              <p className="text-zinc-400 italic text-[10px]">No efforts logged.</p>
            ) : (
              Object.entries(ticketBreakdown).map(([ticketId, info]) => (
                <div key={ticketId} className="flex justify-between items-start text-[11px]">
                  <div className="truncate w-3/4">
                    <Link href={`/admin/tickets/${ticketId}`} className="font-bold text-zinc-900 hover:underline">
                      {ticketId}
                    </Link>
                    <div className="text-zinc-400 truncate text-[9px]">{info.title}</div>
                  </div>
                  <span className="font-bold text-zinc-950 text-right">{info.hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consultant Summary */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">By Consultant</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(consultantBreakdown).length === 0 ? (
              <p className="text-zinc-400 italic text-[10px]">No efforts logged.</p>
            ) : (
              Object.entries(consultantBreakdown).map(([consultant, hours]) => (
                <div key={consultant} className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-700 font-bold">{consultant}</span>
                  <span className="font-bold text-zinc-950">{hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Summary */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">By Organization</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(customerBreakdown).length === 0 ? (
              <p className="text-zinc-400 italic text-[10px]">No efforts logged.</p>
            ) : (
              Object.entries(customerBreakdown).map(([org, hours]) => (
                <div key={org} className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-700 font-bold truncate max-w-[150px]">{org}</span>
                  <span className="font-bold text-zinc-950">{hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Month Summary */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">By Month</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {Object.keys(monthBreakdown).length === 0 ? (
              <p className="text-zinc-400 italic text-[10px]">No efforts logged.</p>
            ) : (
              Object.entries(monthBreakdown).map(([month, hours]) => (
                <div key={month} className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-700 font-bold">{month}</span>
                  <span className="font-bold text-zinc-950">{hours.toFixed(1)}h</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
            <Search size={12} />
          </span>
          <input
            type="text"
            placeholder="Search logs by ID, title, consultant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-200 pl-8 pr-3 py-1.5 rounded text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5">
            <Filter size={10} className="text-zinc-400" />
            <span className="font-bold text-zinc-500 uppercase text-[9px]">Organization:</span>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="bg-white border border-zinc-200 rounded p-1 text-[11px] font-mono focus:outline-none"
            >
              {organizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-zinc-500 uppercase text-[9px]">Consultant:</span>
            <select
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="bg-white border border-zinc-200 rounded p-1 text-[11px] font-mono focus:outline-none"
            >
              {consultants.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-zinc-500 uppercase text-[9px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-zinc-200 rounded p-1 text-[11px] font-mono focus:outline-none"
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
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px] tracking-wider">
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
          <tbody className="divide-y divide-zinc-100 text-[11px]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-zinc-400 italic">
                  No effort logs match the active query filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 transition">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <Link href={`/admin/tickets/${log.ticketId}`} className="font-bold text-zinc-900 hover:underline">
                      {log.ticketId}
                    </Link>
                    <span className="ml-1.5 px-1 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[9px]">
                      {log.sapModule}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-zinc-800 whitespace-nowrap">
                    {log.consultantName}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-500 max-w-[130px] truncate">
                    {log.organization}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-600 whitespace-nowrap">
                    <div>{log.activityDate}</div>
                    <div className="text-[9px] text-zinc-400 font-normal">
                      {log.startTime} - {log.endTime}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.5 border border-zinc-300 bg-zinc-50 rounded text-zinc-700 text-[9px] font-bold uppercase">
                      {log.activityType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-zinc-650 max-w-[200px] truncate" title={log.description}>
                    {log.description}
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold text-zinc-950">
                    {log.hoursLogged.toFixed(1)}h
                  </td>
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    {log.billable ? (
                      <span className="text-emerald-700 font-bold">Billable</span>
                    ) : (
                      <span className="text-zinc-400">Non-Billable</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    {log.status === 'Approved' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        Approved
                      </span>
                    )}
                    {log.status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-1 py-0.5 border border-amber-200 rounded text-[9px]">
                        Pending
                      </span>
                    )}
                    {log.status === 'Rejected' && (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                        <XCircle size={10} className="text-red-500" />
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
