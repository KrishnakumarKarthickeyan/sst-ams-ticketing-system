'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, Send, Upload, File, X, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

const AVAILABLE_MODULES = [
  'FICO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HCM', 
  'SuccessFactors', 'BASIS', 'ABAP', 'Security/GRC', 
  'CPI/Integration', 'BW/BI', 'Fiori', 'TRM'
];

const DEFAULT_CUSTOMERS = [
  'Apex Global Industries',
  'Titan Energy Services',
  'Nexa Manufacturing Solutions',
  'Orion Logistics Operations',
  'Stellar Retail Enterprises',
  'Summit Healthcare Systems',
  'Pinnacle Financials Ltd'
];

export default function ManagerCreateTicketPage() {
  const { createTicket, contracts } = useTickets();
  const { user } = useAuth();
  const router = useRouter();

  // Form states
  const [selectedOrg, setSelectedOrg] = useState(DEFAULT_CUSTOMERS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sapModules, setSapModules] = useState<any[]>(['FICO']);
  const [category, setCategory] = useState<any>('Functional Issue');
  const [priority, setPriority] = useState<any>('Medium');
  const [ticketType, setTicketType] = useState<any>('Incident');
  const [functionalOrTechnical, setFunctionalOrTechnical] = useState<any>('Functional');
  const [businessImpact, setBusinessImpact] = useState('');
  const [expectedResolutionDate, setExpectedResolutionDate] = useState('');

  // Attachments state
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Compile list of unique companies from contract lists
  const customerList = useMemo(() => {
    const list = contracts.map(c => c.organizationName);
    const set = new Set([...list, ...DEFAULT_CUSTOMERS]);
    return Array.from(set);
  }, [contracts]);

  const handleToggleModule = (mod: string) => {
    if (sapModules.includes(mod)) {
      if (sapModules.length > 1) {
        setSapModules(sapModules.filter(m => m !== mod));
      }
    } else {
      setSapModules([...sapModules, mod]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList) => {
    const newFiles = Array.from(files).map(file => {
      const id = `f-upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const uploadItem: UploadingFile = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'uploading'
      };

      // Simulate file upload progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 25) + 12;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setUploadingFiles(prev =>
            prev.map(f => (f.id === id ? { ...f, progress: 100, status: 'success' } : f))
          );
        } else {
          setUploadingFiles(prev =>
            prev.map(f => (f.id === id ? { ...f, progress: currentProgress } : f))
          );
        }
      }, 150);

      return uploadItem;
    });

    setUploadingFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !user) return;

    // Filter successfully uploaded files
    const attachments = uploadingFiles
      .filter(f => f.status === 'success')
      .map(f => ({
        fileName: f.name,
        fileSize: f.size,
        fileType: f.type
      }));

    createTicket({
      title,
      description,
      sapModule: sapModules[0], // Primary
      sapModules, // Multi-select list
      category,
      priority,
      organization: selectedOrg,
      requestedBy: 'Marcus Vance (SAP Manager)',
      requestedByEmail: 'manager@sap.com',
      ticketType,
      functionalOrTechnical,
      businessImpact,
      expectedResolutionDate: expectedResolutionDate || undefined,
      attachments,
      source: 'Created by Super Admin' // Registered as Internal Admin created
    });

    setSuccess(true);
    setTitle('');
    setDescription('');
    setBusinessImpact('');
    setExpectedResolutionDate('');
    setUploadingFiles([]);
    
    setTimeout(() => {
      setSuccess(false);
      router.push('/manager/tickets');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto font-mono text-xs text-[#09090b]">
      
      {/* Back link */}
      <Link href="/manager/tickets" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-955 transition">
        <ArrowLeft size={13} />
        <span>Back to Tickets Desk</span>
      </Link>

      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase tracking-wider text-zinc-950">
          Create Incident ticket
        </h1>
        <p className="text-zinc-500 mt-1">
          Open a new support ticket directly in the operations queue on behalf of a customer account.
        </p>
      </div>

      {success && (
        <div className="bg-zinc-950 text-white border border-zinc-900 rounded p-4 font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
          <Check size={14} className="text-emerald-400" />
          <span>Ticket successfully created. Redirecting to workspace...</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-sm">
        
        {/* Row 1: Customer Account & Ticket Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Customer account</Label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
            >
              {customerList.map(cust => (
                <option key={cust} value={cust}>{cust}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Subject / title</Label>
            <input
              type="text"
              required
              placeholder="e.g. PP: Production Order confirmation error CO15"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>
        </div>

        {/* Row 2: SAP Module checkboxes (Multi-Select) */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
            SAP Modules scope <span className="text-zinc-400 font-normal font-sans">(Select all that apply)</span>
          </Label>
          <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {AVAILABLE_MODULES.map((mod) => {
              const isSelected = sapModules.includes(mod);
              return (
                <label
                  key={mod}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition select-none ${
                    isSelected
                      ? 'border-zinc-950 bg-white text-zinc-955 shadow-sm'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleModule(mod)}
                    className="accent-zinc-950 h-3.5 w-3.5 rounded border-zinc-300 cursor-pointer"
                  />
                  <span>{mod}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Row 3: Classifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Issue Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
            >
              <option value="Functional Issue">Functional Issue</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Authorization Issue">Authorization Issue</option>
              <option value="Integration Issue">Integration Issue</option>
              <option value="Performance Issue">Performance Issue</option>
              <option value="Configuration Issue">Configuration Issue</option>
              <option value="Enhancement Request">Enhancement Request</option>
              <option value="Bug Fix">Bug Fix</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Severity Priority</Label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
            >
              <option value="Low">Low (P4)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="High">High (P2)</option>
              <option value="Critical">Critical (P1)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Classification</Label>
            <select
              value={functionalOrTechnical}
              onChange={(e) => setFunctionalOrTechnical(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
            >
              <option value="Functional">Functional (SPRO/Config)</option>
              <option value="Technical">Technical (ABAP/Code)</option>
            </select>
          </div>
        </div>

        {/* Row 4: Ticket Type & expected target date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Request Type</Label>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono cursor-pointer"
            >
              <option value="Incident">Incident (SLA Applies)</option>
              <option value="Service Request">Service Request</option>
              <option value="Enhancement Request">Enhancement Request</option>
              <option value="Change Request">Change Request</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Target Resolution Date</Label>
            <input
              type="date"
              value={expectedResolutionDate}
              onChange={(e) => setExpectedResolutionDate(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>

          <div className="flex items-center">
            {ticketType === 'Incident' ? (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex items-start gap-2 text-[9px] text-zinc-500 font-mono">
                <Clock className="text-zinc-650 shrink-0 mt-0.5" size={12} />
                <div>
                  <span className="font-bold text-zinc-950 uppercase block">SLA Notice</span>
                  <span>Incident under active SLA. P1: 4h, P2: 8h, P3: 48h, P4: 120h.</span>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex items-start gap-2 text-[9px] text-zinc-400 font-mono">
                <AlertTriangle className="text-zinc-400 shrink-0 mt-0.5" size={12} />
                <div>
                  <span className="font-bold text-zinc-600 uppercase block">SLA Exempted</span>
                  <span>This request type is exempted from SLA response countdowns.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business Impact */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Operational & Business Impact</Label>
          <textarea
            rows={2}
            placeholder="Describe the operational impact of this request (e.g. unable to dispatch monthly stock reports)..."
            value={businessImpact}
            onChange={(e) => setBusinessImpact(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        {/* Detailed Description */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Detailed description / Steps to reproduce</Label>
          <textarea
            required
            rows={5}
            placeholder="Include relevant SAP T-Codes (e.g. MB1A, VL02N), detailed error messages, or custom code lines..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        {/* Drag & Drop File Upload */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Log dumps / Screenshots Attachments</Label>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 bg-white ${
              dragActive ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-250 hover:border-zinc-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <Upload className="text-zinc-450" size={16} />
            <div>
              <span className="text-[11px] font-bold text-zinc-800 font-mono block">Drag and drop file here</span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">or click to browse local files (max 10MB each)</span>
            </div>
          </div>

          {/* Upload progress list */}
          {uploadingFiles.length > 0 && (
            <div className="border border-zinc-150 rounded-lg divide-y divide-zinc-150 bg-zinc-50/50 max-h-36 overflow-y-auto">
              {uploadingFiles.map(file => (
                <div key={file.id} className="p-2.5 flex items-center justify-between gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <File size={13} className="text-zinc-400 shrink-0" />
                    <div className="truncate space-y-0.5">
                      <span className="font-bold text-zinc-800 block truncate">{file.name}</span>
                      <span className="text-[8px] text-zinc-450 block font-mono">{(file.size / 1024).toFixed(0)}kb</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {file.status === 'uploading' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
                          <div className="h-full bg-zinc-950" style={{ width: `${file.progress}%` }}></div>
                        </div>
                        <span className="text-[8px] font-bold text-zinc-500">{file.progress}%</span>
                      </div>
                    )}
                    {file.status === 'success' && (
                      <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-800 border-none font-mono text-[8px] rounded py-0 px-1 font-bold">Success</Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-950"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <Send size={12} />
          <span>Register Support Ticket</span>
        </button>

      </form>
    </div>
  );
}
