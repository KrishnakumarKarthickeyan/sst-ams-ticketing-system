'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { User, Plus, ShieldCheck, Mail, ShieldAlert } from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([
    { id: 'usr-manager-default', name: 'SAP Manager', email: 'manager@supportstudio.com', role: 'Manager', organization: 'Support Studio' }
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Customer');
  const [newOrg, setNewOrg] = useState('Apex Global Industries');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newUser = {
      id: `usr-${Date.now()}`,
      name: newName,
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      organization: newOrg
    };

    setUsersList([...usersList, newUser]);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">User Management</h1>
          <p className="text-zinc-500 mt-1">Manage platform authorization, issue roles, and assign organizational scopes.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus size={12} />
          Provision User
        </button>
      </div>

      {/* Invite User Form */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="bg-white border border-zinc-900 rounded p-4 max-w-md space-y-4">
          <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2">
            Provision New User Access
          </h3>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Elena Rostova"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. elena@sap.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Role Group</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
              >
                <option value="Customer">Customer Client</option>
                <option value="Consultant">SAP Consultant</option>
                <option value="Manager">SAP Manager</option>
                <option value="SuperAdmin">Super Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 uppercase text-[9px]">Assigned Company</label>
              <select
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
              >
                <option value="SST SAP Operations">SST SAP Operations</option>
                <option value="Apex Global Industries">Apex Global Industries</option>
                <option value="Titan Energy Corp">Titan Energy Corp</option>
                <option value="Nexa Manufacturing">Nexa Manufacturing</option>
              </select>
            </div>
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
              Invite User
            </button>
          </div>
        </form>
      )}

      {/* Users Table List */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">SaaS Role</th>
              <th className="p-4">Company Assigned</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {usersList.map((u) => {
              const isAdmin = u.role === 'SuperAdmin';
              const isManager = u.role === 'Manager';
              const isConsultant = u.role === 'Consultant';

              return (
                <tr key={u.id} className="hover:bg-zinc-50/50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-150 flex items-center justify-center text-zinc-900 font-bold">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 text-xs block">{u.name}</span>
                      {user?.email === u.email && (
                        <span className="text-[8px] bg-zinc-900 text-white font-mono px-1 rounded">YOUR SESSION</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-500 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Mail size={12} />
                      {u.email}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAdmin ? 'bg-zinc-950 text-white' :
                      isManager ? 'bg-zinc-800 text-white' :
                      isConsultant ? 'bg-zinc-100 text-zinc-800 border border-zinc-300' :
                      'bg-white text-zinc-650 border border-zinc-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-zinc-600">{u.organization}</td>
                  <td className="p-4 text-right font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-[10px]">
                      <ShieldCheck size={11} className="text-zinc-600" />
                      Active
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
