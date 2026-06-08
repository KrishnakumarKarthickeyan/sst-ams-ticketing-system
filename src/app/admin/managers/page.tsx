'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { provisionUser, deleteAuthUser, resetUserPasswordAdmin } from '../../actions/auth';
import { 
  User, Plus, Mail, ShieldCheck, XCircle, Trash2, Key, ListFilter, 
  AlertTriangle, CheckCircle, Clock, ShieldAlert, ArrowRight, Eye 
} from 'lucide-react';
import { toast } from 'sonner';

interface ManagerProfile {
  id: string;
  name: string;
  email: string;
  active: boolean;
  phoneNumber?: string;
  ticketCount: number;
  criticalCount: number;
}

export default function AdminManagersPage() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<ManagerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Provision form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwdOption, setPwdOption] = useState<'auto' | 'manual'>('auto');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Selected manager for cockpit/details
  const [selectedManager, setSelectedManager] = useState<ManagerProfile | null>(null);
  const [managerTickets, setManagerTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Password Request States
  interface PasswordChangeRequest {
    id: string;
    user_id: string;
    requester_email: string;
    requester_name: string;
    organization: string;
    status: string;
    requested_at: string;
  }
  const [passwordRequests, setPasswordRequests] = useState<PasswordChangeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchPasswordRequests = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoadingRequests(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('password_change_requests')
        .select('*')
        .eq('status', 'Pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPasswordRequests(data || []);
    } catch (err) {
      console.error('Error fetching password requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (req: PasswordChangeRequest) => {
    if (!confirm(`Are you sure you want to approve the password reset request for ${req.requester_name}?`)) return;
    const loadId = toast.loading(`Resetting password for ${req.requester_name}...`);
    try {
      const apiRes = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: req.user_id })
      });
      const res = await apiRes.json();
      if (!apiRes.ok || !res.success) throw new Error(res.error || 'Reset API failed');

      // Update password_change_requests status
      const { error: updateError } = await supabase
        .from('password_change_requests')
        .update({
          status: 'Completed',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.email || 'Admin/Manager'
        })
        .eq('id', req.id);

      if (updateError) throw updateError;

      toast.success(`Request approved! Temporary password: ${res.tempPassword}`, { id: loadId, duration: 15000 });
      fetchPasswordRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      toast.error(`Failed to approve request: ${err.message}`, { id: loadId });
    }
  };

  const handleRejectRequest = async (req: PasswordChangeRequest) => {
    if (!confirm(`Are you sure you want to reject the password reset request for ${req.requester_name}?`)) return;
    const loadId = toast.loading(`Rejecting request...`);
    try {
      const { error } = await supabase
        .from('password_change_requests')
        .update({
          status: 'Rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.email || 'Admin/Manager'
        })
        .eq('id', req.id);

      if (error) throw error;
      toast.success('Request rejected.', { id: loadId });
      fetchPasswordRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      toast.error(`Failed to reject request: ${err.message}`, { id: loadId });
    }
  };

  const fetchManagersData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const stored = localStorage.getItem('sst_admin_managers');
      if (stored) {
        setManagers(JSON.parse(stored));
      } else {
        const fallbackList: ManagerProfile[] = [
          { id: 'mgr-1', name: 'Alexander Sterling', email: 'sterling@assist360.com', active: true, phoneNumber: '+1 (555) 0192', ticketCount: 3, criticalCount: 1 },
          { id: 'mgr-2', name: 'Keerthana Rajan', email: 'keerthana@assist360.com', active: true, phoneNumber: '+91 98765 43210', ticketCount: 5, criticalCount: 0 }
        ];
        setManagers(fallbackList);
        localStorage.setItem('sst_admin_managers', JSON.stringify(fallbackList));
      }
      setLoading(false);
      return;
    }

    try {
      // Fetch profiles with Manager role
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'Manager');

      if (profErr) throw profErr;

      // Fetch all tickets to aggregate counts
      const { data: tickets, error: ticketErr } = await supabase
        .from('tickets')
        .select('id, assigned_manager_id, priority, status')
        .order('created_at', { ascending: false });

      if (ticketErr) throw ticketErr;

      const mapped: ManagerProfile[] = (profiles || []).map(p => {
        const mgrTickets = (tickets || []).filter(t => t.assigned_manager_id === p.id);
        const critical = mgrTickets.filter(t => t.priority === 'Critical' || t.priority === 'High');
        return {
          id: p.id,
          name: p.full_name || 'SAP Manager',
          email: p.email,
          active: p.is_active !== false,
          phoneNumber: p.phone_number || undefined,
          ticketCount: mgrTickets.length,
          criticalCount: critical.length
        };
      });

      setManagers(mapped);
    } catch (err: any) {
      console.error('Error fetching manager details:', err);
      toast.error(`Failed to load managers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagersData();
    fetchPasswordRequests();
  }, []);

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('All required fields must be filled out.');
      return;
    }

    const loadId = toast.loading(`Provisioning Manager account for ${email}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        const res = await provisionUser({
          email,
          fullName: name,
          role: 'Manager',
          phoneNumber: phoneNumber || 'N/A',
          initialPassword: undefined
        });

        if (res.success) {
          const actualPass = res.password || '';
          toast.success(`Manager account provisioned successfully. Initial Password: ${actualPass}`, { id: loadId, duration: 8000 });
          setName('');
          setEmail('');
          setPassword('');
          setPwdOption('auto');
          setPhoneNumber('');
          setShowAddForm(false);
          fetchManagersData();
        } else {
          throw new Error(res.error);
        }
      } catch (err: any) {
        toast.error(`Failed to provision manager: ${err.message}`, { id: loadId });
      }
    } else {
      // Local fallback
      const actualPass = 'Temp@' + Math.random().toString(36).substring(2, 10) + 'A1!';
      const newMgr: ManagerProfile = {
        id: `mgr-${Date.now()}`,
        name,
        email,
        active: true,
        phoneNumber: phoneNumber || undefined,
        ticketCount: 0,
        criticalCount: 0
      };
      const updated = [...managers, newMgr];
      setManagers(updated);
      localStorage.setItem('sst_admin_managers', JSON.stringify(updated));
      toast.success(`Manager added locally. Initial Password: ${actualPass}`, { id: loadId });
      setName('');
      setEmail('');
      setPassword('');
      setPwdOption('auto');
      setPhoneNumber('');
      setShowAddForm(false);
    }
  };

  const handleToggleStatus = async (mgr: ManagerProfile) => {
    const nextActive = !mgr.active;
    const loadId = toast.loading(`Changing status for ${mgr.name}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: nextActive })
          .eq('id', mgr.id);

        if (error) throw error;
        toast.success(`Manager is now ${nextActive ? 'Active' : 'Disabled'}`, { id: loadId });
        fetchManagersData();
      } catch (err: any) {
        toast.error(`Failed to toggle manager status: ${err.message}`, { id: loadId });
      }
    } else {
      const updated = managers.map(m => m.id === mgr.id ? { ...m, active: nextActive } : m);
      setManagers(updated);
      localStorage.setItem('sst_admin_managers', JSON.stringify(updated));
      toast.success('Status toggled locally.', { id: loadId });
    }
  };

  const handleResetPassword = async (mgr: ManagerProfile) => {
    if (!confirm(`Are you sure you want to reset the password for ${mgr.name}? This will generate a new secure temporary password and force a password change on next login.`)) {
      return;
    }

    const loadId = toast.loading(`Resetting credentials for ${mgr.name}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        const apiRes = await fetch('/api/admin/users/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId: mgr.id })
        });
        const res = await apiRes.json();
        if (!apiRes.ok || !res.success) throw new Error(res.error || 'API request failed');
        
        toast.success(`Credentials updated successfully. Password: ${res.tempPassword}`, { id: loadId, duration: 12000 });
      } catch (err: any) {
        toast.error(`Reset failed: ${err.message}`, { id: loadId });
      }
    } else {
      const finalPass = 'Temp@' + Math.random().toString(36).substring(2, 10) + 'A1!';
      alert(`Local fallback reset complete. Password set to: ${finalPass}`);
      toast.dismiss(loadId);
    }
  };

  const handleDeleteManager = async (mgr: ManagerProfile) => {
    if (mgr.ticketCount > 0) {
      alert(`Cannot delete Manager ${mgr.name} because they have ${mgr.ticketCount} active ticket assignments. Please reassign their tickets first.`);
      return;
    }

    if (!confirm(`Are you absolutely sure you want to permanently delete Manager ${mgr.name}? This action is irreversible.`)) {
      return;
    }

    const loadId = toast.loading(`Purging manager profile from system registry...`);

    if (isSupabaseConfigured && supabase) {
      try {
        const authRes = await deleteAuthUser(mgr.id);
        if (!authRes.success && authRes.error !== 'NO_SERVICE_KEY') {
          throw new Error(authRes.error);
        }

        const { error } = await supabase.from('profiles').delete().eq('id', mgr.id);
        if (error) throw error;

        toast.success('Manager removed successfully.', { id: loadId });
        fetchManagersData();
        if (selectedManager?.id === mgr.id) {
          setSelectedManager(null);
        }
      } catch (err: any) {
        toast.error(`Deletion failed: ${err.message}`, { id: loadId });
      }
    } else {
      const updated = managers.filter(m => m.id !== mgr.id);
      setManagers(updated);
      localStorage.setItem('sst_admin_managers', JSON.stringify(updated));
      toast.success('Manager deleted locally.', { id: loadId });
      if (selectedManager?.id === mgr.id) {
        setSelectedManager(null);
      }
    }
  };

  const handleViewCockpit = async (mgr: ManagerProfile) => {
    setSelectedManager(mgr);
    setManagerTickets([]);
    setLoadingTickets(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('id, title, status, priority, sap_module, created_at')
          .eq('assigned_manager_id', mgr.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setManagerTickets(data || []);
      } catch (err: any) {
        console.error('Error fetching manager cockpit tickets:', err);
        toast.error(`Failed to fetch assignments: ${err.message}`);
      } finally {
        setLoadingTickets(false);
      }
    } else {
      // Mock tickets
      setTimeout(() => {
        setManagerTickets([
          { id: 'AS360-FI-1001', title: 'Asset Depreciation Run Failure', status: 'In Progress', priority: 'High', sap_module: 'FICO', created_at: new Date().toISOString() },
          { id: 'AS360-MM-1004', title: 'Purchase Order Release Strategy Block', status: 'New', priority: 'Critical', sap_module: 'MM', created_at: new Date().toISOString() }
        ]);
        setLoadingTickets(false);
      }, 500);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 bg-white">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-zinc-950 font-mono">SAP Manager Cockpits</h1>
          <p className="text-zinc-500 mt-1">Supervise operational leads, audit oversight workloads, and provision system coordinators.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus size={12} />
          Provision Manager
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          {showAddForm && (
            <form onSubmit={handleAddManager} className="bg-white border border-zinc-200 rounded p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-950">
                  Provision SAP Manager Account
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-zinc-400 hover:text-zinc-950 uppercase text-[9px] font-bold"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Keerthana Rajan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px]">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. keerthana@assist360.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                  />
                </div>
                <div className="space-y-1 pt-1 md:col-span-2">
                  <label className="font-bold text-zinc-700 uppercase text-[9px] block">Password Assignment</label>
                  <p className="text-[10px] text-zinc-500 font-mono italic">A secure temporary password will be auto-generated for this role.</p>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 uppercase text-[9px]">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
                  />
                </div>
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
                  Provision Account
                </button>
              </div>
            </form>
          )}

          {/* Directory Table */}
          <div className="bg-white border border-zinc-200 rounded overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
                  <th className="p-4">Manager Info</th>
                  <th className="p-4">Performance Indexes</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400 font-mono">
                      Querying database profiles...
                    </td>
                  </tr>
                ) : managers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400 font-mono">
                      No active SAP Manager roles registered in system directory.
                    </td>
                  </tr>
                ) : (
                  managers.map((mgr) => {
                    const isSelected = selectedManager?.id === mgr.id;
                    return (
                      <tr key={mgr.id} className={`hover:bg-zinc-50/50 transition-colors ${isSelected ? 'bg-zinc-50 font-semibold' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 font-bold uppercase shrink-0">
                              {mgr.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <span className="font-bold text-zinc-800 text-xs block">{mgr.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{mgr.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-650">Workload Volume:</span>
                              <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-800 rounded font-bold font-mono">
                                {mgr.ticketCount} active
                              </span>
                            </div>
                            {mgr.criticalCount > 0 && (
                              <div className="flex items-center gap-1.5 text-amber-700">
                                <AlertTriangle size={11} className="shrink-0" />
                                <span className="text-[9px] font-bold">
                                  {mgr.criticalCount} SLA Risk Ticket{mgr.criticalCount > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-zinc-500 font-mono">
                          <div className="space-y-0.5">
                            <span className="block text-[10px]">{mgr.phoneNumber || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${
                            mgr.active ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-250 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${mgr.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {mgr.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewCockpit(mgr)}
                              className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition cursor-pointer"
                              title="View Assignments & Cockpit"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(mgr)}
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition cursor-pointer ${
                                mgr.active 
                                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              {mgr.active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleResetPassword(mgr)}
                              className="p-1.5 rounded border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition cursor-pointer"
                              title="Reset Password"
                            >
                              <Key size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteManager(mgr)}
                              className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-750 transition cursor-pointer"
                              title="Remove Manager"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workload Cockpit Panel */}
        <div className="bg-white border border-zinc-200 rounded p-4 shadow-sm h-fit space-y-4">
          <div className="border-b border-zinc-200 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-mono flex items-center gap-1.5">
              <ListFilter size={14} className="text-zinc-500" />
              Manager Workload Cockpit
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">Audit active service desk responsibilities and tickets in real-time.</p>
          </div>

          {selectedManager ? (
            <div className="space-y-4">
              {/* Selected manager profile block */}
              <div className="bg-zinc-50 rounded border border-zinc-200 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                    {selectedManager.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-800 text-xs">{selectedManager.name}</h3>
                    <span className="text-[9px] text-zinc-500 font-mono">{selectedManager.email}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-white rounded border border-zinc-150 p-2 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">Total Tickets</span>
                    <span className="text-base font-bold text-zinc-900">{selectedManager.ticketCount}</span>
                  </div>
                  <div className="bg-white rounded border border-zinc-150 p-2 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">High Priority</span>
                    <span className={`text-base font-bold ${selectedManager.criticalCount > 0 ? 'text-amber-600' : 'text-zinc-900'}`}>
                      {selectedManager.criticalCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment registry list */}
              <div>
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                  Assigned Tickets Registry ({managerTickets.length})
                </h4>
                {loadingTickets ? (
                  <p className="text-[10px] text-zinc-400 text-center py-4 font-mono">Fetching assigned ticket cards...</p>
                ) : managerTickets.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-200 rounded text-zinc-400 font-mono">
                    No tickets currently assigned.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {managerTickets.map((t) => (
                      <div key={t.id} className="border border-zinc-150 rounded p-2 hover:bg-zinc-50 transition-colors flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 text-[10px] font-mono">{t.id}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                            t.priority === 'Critical' ? 'bg-red-950 text-white' :
                            t.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                            t.priority === 'Medium' ? 'bg-zinc-100 text-zinc-800' :
                            'bg-zinc-50 text-zinc-600'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                        <h5 className="font-bold text-zinc-800 text-[10px] line-clamp-1">{t.title}</h5>
                        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono mt-0.5 border-t border-zinc-100 pt-1.5">
                          <span>Module: {t.sap_module}</span>
                          <span className="px-1.5 py-0.1 bg-zinc-100 text-zinc-700 rounded font-semibold">{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400 font-mono border border-dashed border-zinc-200 rounded">
              Select a manager to audit workload metrics.
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Requests Section */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden shadow-sm p-4 space-y-4">
        <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-mono flex items-center gap-1.5">
              <Key className="text-zinc-500" size={14} />
              Password Reset Requests
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">Pending password change requests from system users.</p>
          </div>
          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded-full text-[10px] font-bold font-mono">
            {passwordRequests.length} Pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
                <th className="p-3">User</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Requested At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loadingRequests ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-450 font-mono">
                    Querying reset requests...
                  </td>
                </tr>
              ) : passwordRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-450 font-mono">
                    No pending password reset requests.
                  </td>
                </tr>
              ) : (
                passwordRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50/50">
                    <td className="p-3">
                      <div>
                        <span className="font-bold text-zinc-850 text-xs block">{req.requester_name}</span>
                        <span className="text-[10px] text-zinc-450 font-mono">{req.requester_email}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-zinc-700">{req.organization}</td>
                    <td className="p-3 text-zinc-550 font-mono">
                      {new Date(req.requested_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="px-2.5 py-1 bg-zinc-950 text-white hover:bg-zinc-850 rounded text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                        >
                          Approve & Reset
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          className="px-2.5 py-1 border border-zinc-200 hover:bg-zinc-50 rounded text-[9px] font-bold uppercase tracking-wider text-zinc-600 transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
