'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { MOCK_ORGANIZATIONS } from '../../../utils/mockData';
import { Building2, Plus, Globe, ShieldCheck } from 'lucide-react';

export default function AdminOrganizationsPage() {
  const { tickets, contracts } = useTickets();
  const [orgs, setOrgs] = useState(MOCK_ORGANIZATIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const handleAddOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newOrg = {
      id: `org-${Date.now()}`,
      name: newName,
      domain: newDomain || 'n/a'
    };

    setOrgs([...orgs, newOrg]);
    setNewName('');
    setNewDomain('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Organization Registry</h1>
          <p className="text-zinc-500 mt-1">Configure customer systems, billing profiles, and SLA isolation levels.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus size={12} />
          Register Org
        </button>
      </div>

      {/* Add Org Form */}
      {showAddForm && (
        <form onSubmit={handleAddOrg} className="bg-white border border-zinc-900 rounded p-4 max-w-md space-y-4">
          <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2">
            New Organization Registration
          </h3>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Organization Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Domain Mapping</label>
            <input
              type="text"
              placeholder="e.g. acme.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded uppercase tracking-wider text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded uppercase tracking-wider text-[10px]"
            >
              Confirm Setup
            </button>
          </div>
        </form>
      )}

      {/* Organizations Table List */}
      {orgs.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center space-y-3">
          <Building2 className="mx-auto text-zinc-400" size={32} />
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No organizations registered yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">Register new customer organizations to manage client SLA contracts and ticket isolation.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
                <th className="p-4">Organization</th>
                <th className="p-4">Domain Mapped</th>
                <th className="p-4 text-center">Open Tickets</th>
                <th className="p-4 text-center">Active Contracts</th>
                <th className="p-4 text-right">Security Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {orgs.map((org) => {
                const openTicketCount = tickets.filter(t => t.organization === org.name && t.status !== 'Resolved' && t.status !== 'Closed').length;
                const contract = contracts.find(c => c.organizationName === org.name);

                return (
                  <tr key={org.id} className="hover:bg-zinc-50/50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-950">
                        <Building2 size={14} />
                      </div>
                      <span className="font-bold text-zinc-800 text-xs">{org.name}</span>
                    </td>
                    <td className="p-4 text-zinc-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        {org.domain}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold font-mono">
                      <span className={`px-2 py-0.5 rounded-full ${openTicketCount > 0 ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        {openTicketCount}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono">
                      {contract ? (
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded font-semibold text-[10px]">
                          {contract.contractType}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-600 text-[10px]">
                        <ShieldCheck size={11} className="text-zinc-500" />
                        RLS Isolated
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
