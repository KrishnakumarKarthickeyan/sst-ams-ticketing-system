'use client';

import React, { useState, useRef } from 'react';
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

export default function CustomerCreateTicketPage() {
  const { createTicket } = useTickets();
  const { user } = useAuth();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sapModules, setSapModules] = useState<any[]>(['FICO']);
  const [category, setCategory] = useState<any>('Functional Issue');
  const [priority, setPriority] = useState<any>('Medium');
  
  // New redesign fields
  const [ticketType, setTicketType] = useState<any>('Incident');
  const [functionalOrTechnical, setFunctionalOrTechnical] = useState<any>('Functional');
  const [businessImpact, setBusinessImpact] = useState('');
  const [expectedResolutionDate, setExpectedResolutionDate] = useState('');

  // Available SAP modules array
  const AVAILABLE_MODULES = [
    'FICO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HCM', 
    'SuccessFactors', 'BASIS', 'ABAP', 'Security/GRC', 
    'CPI/Integration', 'BW/BI', 'Fiori', 'TRM'
  ];

  const handleToggleModule = (mod: string) => {
    if (sapModules.includes(mod)) {
      if (sapModules.length > 1) {
        setSapModules(sapModules.filter(m => m !== mod));
      }
    } else {
      setSapModules([...sapModules, mod]);
    }
  };

  // Attachments state
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop state
  const [dragActive, setDragActive] = useState(false);

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
      
      // Simulate file upload progress
      const uploadItem: UploadingFile = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'uploading'
      };

      // Progress simulation timer
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 25) + 10;
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
      }, 200);

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
      sapModule: sapModules[0], // primary
      sapModules, // all selected modules
      category,
      priority,
      organization: user.company || 'Apex Global Industries',
      requestedBy: user.name,
      requestedByEmail: user.email,
      ticketType,
      functionalOrTechnical,
      businessImpact,
      expectedResolutionDate: expectedResolutionDate || undefined,
      attachments
    });

    setSuccess(true);
    setTitle('');
    setDescription('');
    setBusinessImpact('');
    setExpectedResolutionDate('');
    setUploadingFiles([]);
    
    setTimeout(() => {
      setSuccess(false);
      router.push('/customer/tickets');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Back button */}
      <Link href="/customer/dashboard" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-950 font-mono text-xs transition">
        <ArrowLeft size={13} />
        Back to Dashboard
      </Link>

      {/* Header Title */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight font-mono text-zinc-950 uppercase">
          Submit Service Request
        </h1>
        <p className="text-xs text-zinc-500 font-medium">
          Create functional error logs, technical bug requests, or BASIS customization needs.
        </p>
      </div>

      {success && (
        <div className="bg-zinc-950 text-white border border-zinc-900 rounded-lg p-4 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
          <Check size={14} className="text-emerald-400" />
          <span>Ticket Registered Successfully. Redirecting to workspace...</span>
        </div>
      )}

      {/* Form Submission Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-sm">
        
        {/* Row 1: Title & Ticket Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Brief Title / Incident Summary</Label>
            <input
              type="text"
              required
              placeholder="e.g., SD pricing condition record missing in billing doc"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Request Type</Label>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="Incident">Incident (SLA Applies)</option>
              <option value="Service Request">Service Request</option>
              <option value="Enhancement Request">Enhancement Request</option>
              <option value="Change Request">Change Request</option>
              <option value="Training Request">Training Request</option>
              <option value="Configuration Request">Configuration Request</option>
              <option value="Report Request">Report Request</option>
            </select>
          </div>
        </div>

        {/* Row 2: SAP Modules (Multi-select) */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">
            SAP Modules <span className="text-zinc-400 font-normal font-sans">(Select all that apply)</span>
          </Label>
          <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 font-mono">
            {AVAILABLE_MODULES.map((mod) => {
              const isSelected = sapModules.includes(mod);
              return (
                <label
                  key={mod}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition select-none ${
                    isSelected
                      ? 'border-zinc-950 bg-white text-zinc-955 shadow-sm'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleModule(mod)}
                    className="accent-zinc-950 h-3.5 w-3.5 rounded border-zinc-350 cursor-pointer"
                  />
                  <span>{mod}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Row 3: Category, Priority, Category Classification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Issue Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
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
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Severity Priority</Label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="Low">Low (P4)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="High">High (P2)</option>
              <option value="Critical">Critical (P1)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Classification</Label>
            <select
              value={functionalOrTechnical}
              onChange={(e) => setFunctionalOrTechnical(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="Functional">Functional (SPRO/Config)</option>
              <option value="Technical">Technical (ABAP/Code)</option>
            </select>
          </div>
        </div>

        {/* Row 3: Expected Date & SLA Notice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Target Expectation Date</Label>
            <input
              type="date"
              value={expectedResolutionDate}
              onChange={(e) => setExpectedResolutionDate(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
            />
          </div>

          {ticketType === 'Incident' ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex items-start gap-2.5 text-[10px] text-zinc-500 font-mono">
              <Clock className="text-zinc-650 shrink-0 mt-0.5" size={13} />
              <div>
                <span className="font-bold text-zinc-950 uppercase block">SLA Allocation Notice</span>
                <span>As an **Incident**, this request falls under active SLA response metrics. P1: 4h, P2: 8h, P3: 48h, P4: 120h.</span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex items-start gap-2.5 text-[10px] text-zinc-400 font-mono">
              <AlertTriangle className="text-zinc-400 shrink-0 mt-0.5" size={13} />
              <div>
                <span className="font-bold text-zinc-600 uppercase block">SLA Exemption Notice</span>
                <span>As a **{ticketType}**, this request is exempted from incident-based SLA countdowns. Resolution will be mapped by expected dates.</span>
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Business Impact */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Operational & Business Impact</Label>
          <textarea
            rows={2}
            placeholder="Explain how this issue impacts operations (e.g., unable to close SD billing period, blocking warehouse shipments)..."
            value={businessImpact}
            onChange={(e) => setBusinessImpact(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        {/* Row 5: Detailed Description */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Detailed Description & Replication Steps</Label>
          <textarea
            required
            rows={5}
            placeholder="Provide transaction codes (T-Codes), error dump references, configuration links, or expected result outputs..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        {/* Drag and Drop Upload Area */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">File Attachments (Log dumps, Screenshots)</Label>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
              dragActive 
                ? 'border-zinc-950 bg-zinc-50' 
                : 'border-zinc-200 hover:border-zinc-400 bg-white'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <Upload className="text-zinc-400" size={20} />
            <div>
              <span className="text-xs font-bold text-zinc-800 font-mono">Drag and drop file here</span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-1">or click to browse local files (max 10MB each)</span>
            </div>
          </div>

          {/* Upload progress list */}
          {uploadingFiles.length > 0 && (
            <div className="border border-zinc-100 rounded-lg divide-y divide-zinc-100 bg-zinc-50/50 max-h-48 overflow-y-auto">
              {uploadingFiles.map(file => (
                <div key={file.id} className="p-3 flex items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <File size={14} className="text-zinc-400 shrink-0" />
                    <div className="truncate space-y-0.5">
                      <span className="font-bold text-zinc-800 text-[11px] block truncate">{file.name}</span>
                      <span className="text-[9px] text-zinc-400 block font-mono">{(file.size / 1024).toFixed(0)}kb</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {file.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
                          <div className="h-full bg-zinc-950 transition-all" style={{ width: `${file.progress}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500">{file.progress}%</span>
                      </div>
                    )}
                    {file.status === 'success' && (
                      <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-0 font-mono text-[9px] rounded py-0.5 px-1.5">Success</Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="p-1 rounded-full text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100"
                    >
                      <X size={12} />
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
          <Send size={13} />
          Register Support Request
        </button>

      </form>
    </div>
  );
}
