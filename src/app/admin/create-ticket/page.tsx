'use client';

import React, { useState, useEffect } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, Send, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { SAPModule, IssueCategory, TicketPriority } from '../../../types/ticket';

export default function AdminCreateTicketPage() {
  const { createTicket } = useTickets();
  const { user } = useAuth();
  const router = useRouter();

  // Dynamic database states
  const [dbOrganizations, setDbOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [dbManagers, setDbManagers] = useState<string[]>([]);
  const [dbConsultants, setDbConsultants] = useState<string[]>([]);

  useEffect(() => {
    const loadStakeholders = async () => {
      const { isSupabaseConfigured, supabase } = await import('../../../lib/supabase/client');
      if (isSupabaseConfigured && supabase) {
        // Fetch organizations
        const { data: orgs } = await supabase.from('organizations').select('id, name');
        if (orgs) setDbOrganizations(orgs);

        // Fetch profiles
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, role, organization_id');
        if (profiles) {
          // Customers
          setDbCustomers(profiles.filter(p => p.role === 'Customer').map(p => ({
            id: p.id,
            name: p.full_name,
            email: p.email,
            orgId: p.organization_id
          })));

          // Managers
          setDbManagers(profiles.filter(p => p.role === 'Manager' || p.role === 'SuperAdmin').map(p => p.full_name));

          // Consultants
          setDbConsultants(profiles.filter(p => p.role === 'Consultant').map(p => p.full_name));
        }
      }
    };
    loadStakeholders();
  }, []);

  // Form states
  const [organization, setOrganization] = useState('');
  const [customerIndex, setCustomerIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sapModule, setSapModule] = useState<SAPModule>('FICO');
  const [category, setCategory] = useState<IssueCategory>('Functional Issue');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  
  // Optional assignments
  const [assignedManager, setAssignedManager] = useState('');
  const [assignedConsultant, setAssignedConsultant] = useState('');

  // Auto-select first organization once loaded
  useEffect(() => {
    if (!organization && dbOrganizations.length > 0) {
      setOrganization(dbOrganizations[0].name);
    }
  }, [dbOrganizations, organization]);

  // Attachment states
  const [attachments, setAttachments] = useState<{ fileName: string; fileSize: number; fileType: string; fileObj?: File }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const org = e.target.value;
    setOrganization(org);
    setCustomerIndex(0); // Reset customer index when organization changes
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    
    const { toast } = await import('sonner');
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi', '.dll', '.scr', '.com', '.bin', '.cgi', '.py', '.php', '.phtml', '.pl', '.jsp', '.asp', '.aspx'];
    
    const files = Array.from(e.target.files || []);
    const validAtts: typeof attachments = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File size exceeds 10MB limit: ${file.name}`);
        continue;
      }
      
      const lastDotIdx = file.name.lastIndexOf('.');
      const fileExtension = lastDotIdx !== -1 ? file.name.slice(lastDotIdx).toLowerCase() : '';
      if (blockedExtensions.includes(fileExtension)) {
        toast.error(`Forbidden file extension: ${file.name}. Executable and script files are blocked.`);
        continue;
      }
      
      validAtts.push({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileObj: file
      });
    }

    if (validAtts.length > 0) {
      setTimeout(() => {
        setAttachments(prev => [...prev, ...validAtts]);
        setIsUploading(false);
      }, 600);
    } else {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !user) return;

    const selectedOrgObj = dbOrganizations.find(o => o.name === organization);
    const selectedCustomers = dbCustomers.filter(c => c.orgId === selectedOrgObj?.id);
    const customerUser = selectedCustomers[customerIndex] || { name: 'Unassigned Customer', email: '' };

    const { toast } = await import('sonner');
    const toastId = toast.loading('Registering support ticket in database...');

    const res = await createTicket({
      title,
      description,
      sapModule,
      category,
      priority,
      organization,
      requestedBy: customerUser.name,
      requestedByEmail: customerUser.email,
      assignedManager: assignedManager || undefined,
      assignedConsultant: assignedConsultant || undefined,
      source: 'Created by Super Admin',
      attachments: attachments
    });

    if (res.success && res.ticketId) {
      toast.success('Ticket registered successfully!', { id: toastId });
      setSuccess(true);
      setTitle('');
      setDescription('');
      setAttachments([]);
      setAssignedManager('');
      setAssignedConsultant('');

      setTimeout(() => {
        setSuccess(false);
        router.push(`/admin/tickets/${res.ticketId}`);
      }, 1500);
    } else {
      toast.error(`Database Error: ${res.error}`, { id: toastId, duration: 8000 });
    }
  };

  const selectedOrgObj = dbOrganizations.find(o => o.name === organization);
  const selectedCustomers = dbCustomers.filter(c => c.orgId === selectedOrgObj?.id);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900 max-w-2xl mx-auto">
      
      {/* Navigation */}
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-950 font-mono transition">
        <ArrowLeft size={12} />
        Back to Admin Dashboard
      </Link>

      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Create Ticket on Behalf of Customer</h1>
        <p className="text-zinc-500 mt-1">Submit, categorize, and optionally assign a new incident or service request directly.</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-500 rounded p-3 text-emerald-800 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 animate-fade-in">
          <Check size={14} className="text-emerald-600" />
          Ticket registered on behalf of customer. Redirecting to queue...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 shadow-sm">
        
        {/* Customer Organization & Requester */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Customer Organization</label>
            <select
              value={organization}
              onChange={handleOrgChange}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
            >
              {dbOrganizations.map((org) => (
                <option key={org.id} value={org.name}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Requested By (Customer User)</label>
            <select
              value={customerIndex}
              onChange={(e) => setCustomerIndex(Number(e.target.value))}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              {selectedCustomers.map((cust, idx) => (
                <option key={idx} value={idx}>
                  {cust.name} ({cust.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-700 uppercase text-[9px]">Brief Summary / Title</label>
          <input
            type="text"
            required
            placeholder="e.g. FICO AFAB depreciation balance invalid error AA617"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">SAP Module</label>
            <select
              value={sapModule}
              onChange={(e) => setSapModule(e.target.value as SAPModule)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="FICO">FICO</option>
              <option value="MM">MM</option>
              <option value="SD">SD</option>
              <option value="PP">PP</option>
              <option value="PM">PM</option>
              <option value="QM">QM</option>
              <option value="HCM">HCM</option>
              <option value="SuccessFactors">SuccessFactors</option>
              <option value="BASIS">BASIS</option>
              <option value="ABAP">ABAP</option>
              <option value="Security/GRC">Security/GRC</option>
              <option value="CPI/Integration">CPI/Integration</option>
              <option value="BW/BI">BW/BI</option>
              <option value="Fiori">Fiori</option>
              <option value="TRM">TRM</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Issue Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="Functional Issue">Functional Issue</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Authorization Issue">Authorization Issue</option>
              <option value="Integration Issue">Integration Issue</option>
              <option value="Performance Issue">Performance Issue</option>
              <option value="Master Data Issue">Master Data Issue</option>
              <option value="Configuration Issue">Configuration Issue</option>
              <option value="Enhancement Request">Enhancement Request</option>
              <option value="Bug Fix">Bug Fix</option>
              <option value="Training / How-to Support">Training / How-to Support</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Severity Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="Low">Low (P4)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="High">High (P2)</option>
              <option value="Critical">Critical (P1)</option>
            </select>
          </div>
        </div>

        {/* Assignment Overrides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-zinc-100 py-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Optionally Assign Manager</label>
            <select
              value={assignedManager}
              onChange={(e) => setAssignedManager(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="">-- Leave Unassigned --</option>
              {dbManagers.map((mgr) => (
                <option key={mgr} value={mgr}>
                  {mgr}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 uppercase text-[9px]">Optionally Assign Consultant</label>
            <select
              value={assignedConsultant}
              onChange={(e) => setAssignedConsultant(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="">-- Leave Unassigned --</option>
              {dbConsultants.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {assignedConsultant && (
              <p className="text-[10px] text-emerald-600 mt-1">Ticket will be auto-set to "Assigned" status.</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-700 uppercase text-[9px]">Detailed Description & Error Logs</label>
          <textarea
            required
            rows={5}
            placeholder="Explain error codes, steps to reproduce, or enhancement specifications..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        {/* Attachment Upload (Simulated) */}
        <div className="space-y-2">
          <label className="font-bold text-zinc-700 uppercase text-[9px]">Attachments</label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition">
              <Paperclip size={12} />
              {isUploading ? 'Uploading...' : 'Choose File'}
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            <span className="text-zinc-500 text-[10px]">Maximum file size: 10MB. Allowed: PDF, Images, TXT, CSV, LOG.</span>
          </div>

          {attachments.length > 0 && (
            <div className="mt-2 space-y-1 bg-zinc-50 border border-zinc-200 rounded p-3">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-100 last:border-b-0">
                  <span className="text-zinc-700 flex items-center gap-1.5 truncate">
                    <Paperclip size={10} className="text-zinc-400" />
                    {att.fileName} <span className="text-zinc-400">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-zinc-400 hover:text-red-600 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition"
        >
          <Send size={12} />
          Create Ticket on Behalf of Customer
        </button>

      </form>
    </div>
  );
}
