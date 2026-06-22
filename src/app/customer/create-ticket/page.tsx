'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { 
  Check, 
  ArrowLeft, 
  Send, 
  Upload, 
  File, 
  X, 
  AlertTriangle, 
  Clock, 
  Search, 
  ChevronDown, 
  FileText, 
  AlertCircle,
  Layers,
  Activity,
  Paperclip,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  Building
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { toast } from 'sonner';

interface AttachmentQueueItem {
  id: string;
  fileObj: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

const AVAILABLE_MODULES = [
  'FICO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HCM', 
  'SF EC', 'SF ECP', 'SF PMGM', 'SF RCM', 
  'SAC', 'ABAP', 'BASIS', 'CPI'
];

const REQUEST_TYPES = [
  'Incident',
  'Problem Record',
  'Service Request',
  'Support Request',
  'Change Request',
  'Enhancement Request',
  'Access Request',
  'Configuration Request',
  'Data Correction',
  'Integration Issue',
  'Report Issue',
  'Interface Issue',
  'Master Data Request',
  'SAP Authorization Request',
  'Performance Issue',
  'Training Request',
  'Advisory Request'
];

const CLASSIFICATIONS = [
  'Functional',
  'Technical',
  'Basis',
  'Integration',
  'Security',
  'Reporting',
  'Infrastructure',
  'Application Support'
];

const CATEGORIES = [
  'Transaction Error',
  'Posting Error',
  'Master Data Issue',
  'Workflow Issue',
  'Authorization Issue',
  'Interface Failure',
  'Integration Failure',
  'Report Error',
  'Performance Issue',
  'Printing Issue',
  'Background Job Issue',
  'Configuration Change',
  'Enhancement',
  'User Support',
  'Data Upload',
  'Data Correction',
  'Training',
  'System Issue'
];

const PRIORITIES = [
  { value: 'Critical', label: 'Critical (P1)', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' },
  { value: 'High', label: 'High (P2)', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30' },
  { value: 'Medium', label: 'Medium (P3)', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' },
  { value: 'Low', label: 'Low (P4)', color: 'bg-surface-muted text-ink-secondary border-line dark:bg-ink/20 dark:text-ink-muted dark:border-zinc-900/30' }
];

const BUSINESS_IMPACTS = [
  'Business Completely Blocked',
  'Major Business Impact',
  'Moderate Business Impact',
  'Minor Business Impact'
];

export default function CustomerCreateTicketPage() {
  const { createTicket } = useTickets();
  const { user } = useAuth();
  const router = useRouter();

  // Loading and error states
  const [success, setSuccess] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Resolved Customer Org
  const [resolvedOrg, setResolvedOrg] = useState('');
  const [resolvedCode, setResolvedCode] = useState('');

  // Form Section States
  // Section A: Ticket Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestType, setRequestType] = useState('');
  const [priority, setPriority] = useState('Medium');

  // Section C: SAP Classification (Multi-select + dropdowns)
  const [sapModules, setSapModules] = useState<string[]>([]);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const [classification, setClassification] = useState('');
  const [category, setCategory] = useState('');

  // Section D: Business Impact
  const [businessImpactLevel, setBusinessImpactLevel] = useState('Minor Business Impact');
  const [businessImpactDesc, setBusinessImpactDesc] = useState('');
  const [expectedResolutionDate, setExpectedResolutionDate] = useState('');
  const [businessJustification, setBusinessJustification] = useState('');

  // Section E: Attachments
  const [filesQueue, setFilesQueue] = useState<AttachmentQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically resolve Customer organization
  useEffect(() => {
    const resolveCustomerOrg = async () => {
      if (user && isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('organization_id, organizations(name, customer_code)')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            const orgs = data.organizations as any;
            const org = Array.isArray(orgs) ? orgs[0] : orgs;
            const orgName = org?.name;
            const custCode = org?.customer_code;
            if (orgName) {
              setResolvedOrg(orgName);
            }
            if (custCode) {
              setResolvedCode(custCode);
            }
            return;
          }
        } catch (e) {
          console.error('Error resolving customer organization:', e);
        }
      }
      
      // Local AuthContext fallbacks
      if (user?.company) {
        setResolvedOrg(user.company);
      } else {
        setResolvedOrg('Apex Global Industries');
      }
    };
    resolveCustomerOrg();
  }, [user, isSupabaseConfigured]);

  // Click outside handlers for custom dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target as Node)) {
        setShowModuleDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter modules for combobox
  const filteredModules = useMemo(() => {
    if (!moduleSearchQuery.trim()) return AVAILABLE_MODULES;
    const q = moduleSearchQuery.toLowerCase();
    return AVAILABLE_MODULES.filter(m => m.toLowerCase().includes(q));
  }, [moduleSearchQuery]);

  // Toggle SAP module selection
  const handleToggleModule = (mod: string) => {
    if (sapModules.includes(mod)) {
      setSapModules(sapModules.filter(m => m !== mod));
    } else {
      setSapModules([...sapModules, mod]);
    }
  };

  // Drag & drop file uploads
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
    const supportedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'zip'];
    const newItems: AttachmentQueueItem[] = [];

    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!supportedExtensions.includes(ext)) {
        toast.error(`Unsupported file type: ${file.name}. Only PDF, DOC, Excel, CSV, images, and ZIP are supported.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File size exceeds 10MB limit: ${file.name}`);
        return;
      }

      const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const item: AttachmentQueueItem = {
        id,
        fileObj: file,
        progress: 0,
        status: 'uploading'
      };
      newItems.push(item);

      // Simulate smooth upload progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 20) + 10;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setFilesQueue(prev => 
            prev.map(f => f.id === id ? { ...f, progress: 100, status: 'success' } : f)
          );
        } else {
          setFilesQueue(prev => 
            prev.map(f => f.id === id ? { ...f, progress: currentProgress } : f)
          );
        }
      }, 120);
    });

    setFilesQueue(prev => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeQueueFile = (id: string) => {
    setFilesQueue(prev => prev.filter(f => f.id !== id));
  };

  // Get helper file icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg'].includes(ext)) return <FileImage size={16} className="text-blue-500 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={16} className="text-green-600 shrink-0" />;
    if (['zip'].includes(ext)) return <FileArchive size={16} className="text-amber-500 shrink-0" />;
    return <FileText size={16} className="text-ink-secondary shrink-0" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const errors: string[] = [];
    if (!title.trim()) errors.push('Subject / Title is required');
    if (!description.trim()) errors.push('Description is required');
    if (!requestType) errors.push('Request Type is required');
    if (!classification) errors.push('Classification is required');
    if (!category) errors.push('Category is required');
    if (!priority) errors.push('Priority is required');
    if (sapModules.length === 0) errors.push('At least one SAP Module must be selected');

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Validation failed. Please fill all required fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Submitting ticket and uploading attachments...');

    try {
      // Map files successfully uploaded
      const attachments = filesQueue
        .filter(f => f.status === 'success')
        .map(f => ({
          fileName: f.fileObj.name,
          fileSize: f.fileObj.size,
          fileType: f.fileObj.type,
          fileObj: f.fileObj // Passed to Context
        }));

      const ticketPayload = {
        title,
        description,
        sapModule: sapModules[0] as any,
        sapModules: sapModules as any[],
        category,
        priority: priority as any,
        organization: resolvedOrg,
        requestedBy: user?.name || 'Customer Requestor',
        requestedByEmail: user?.email || 'customer@sap.com',
        ticketType: requestType,
        functionalOrTechnical: classification === 'Technical' ? 'Technical' : 'Functional',
        classification,
        businessImpact: businessImpactLevel,
        businessImpactLevel,
        businessJustification,
        expectedResolutionDate: expectedResolutionDate || undefined,
        attachments,
        source: 'Created by Client' as any
      };

      const res = await createTicket(ticketPayload);

      if (res.success && res.ticketId) {
        const displayId = res.ticketNumber || res.ticketId;
        toast.success(`Ticket ${displayId} created successfully!`, { id: toastId });
        setSuccessTicketId(displayId);
        setSuccess(true);
        
        // Reset form
        setTitle('');
        setDescription('');
        setSapModules([]);
        setCategory('');
        setClassification('');
        setRequestType('');
        setBusinessImpactDesc('');
        setExpectedResolutionDate('');
        setBusinessJustification('');
        setFilesQueue([]);

        setTimeout(() => {
          setSuccess(false);
          router.push(`/customer/tickets/${res.ticketId}`);
        }, 1500);
      } else {
        throw new Error(res.error || 'Server error occurred while inserting records.');
      }
    } catch (err: any) {
      toast.error(`Failed to create ticket: ${err.message}`, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-5xl mx-auto pb-12 px-4">
        
        {/* Back link */}
        <Link href="/customer/tickets" className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-ink transition text-xs font-sans font-medium">
          <ArrowLeft size={13} />
          <span>Back to My Tickets</span>
        </Link>

        {/* Header */}
        <div className="border-b border-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="type-title text-ink">
              Open Support Ticket
            </h1>
            <p className="text-ink-secondary text-sm mt-1">
              Submit a support request directly to your dedicated SAP BASIS, Functional, and Technical support desk.
            </p>
          </div>

          {/* Org Display */}
          <div className="flex items-center gap-2 border border-line bg-surface-muted/60 p-3 rounded-lg font-sans shrink-0 max-w-xs self-start md:self-center">
            <Building size={14} className="text-ink-secondary" />
            <div className="text-left truncate">
              <span className="text-[11px] uppercase font-bold text-ink-muted block">Assigned Account</span>
              <span className="text-xs font-bold text-ink truncate block leading-snug">
                {resolvedOrg} {resolvedCode && <span className="text-ink-muted text-[11px]">[{resolvedCode}]</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Validation Errors Alert Box */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-xs font-sans space-y-2 flex items-start gap-3">
            <AlertCircle className="text-critical shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="font-bold uppercase text-[11px] tracking-wider block">Submission Blocked (Validation Failures)</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4 font-sans font-medium flex items-center gap-3 animate-fade-in">
            <Check size={18} className="text-success shrink-0" />
            <div className="text-xs">
              <span className="font-bold block uppercase text-[11px] tracking-wider">Ticket Created Successfully</span>
              <span>Ticket Number: <strong>{successTicketId}</strong>. Records saved, and workspace view refreshing...</span>
            </div>
          </div>
        )}

        {/* Form Container Grid */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT 2 COLUMNS: Ticket & Classification Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section A: Ticket Information */}
            <Card className="shadow-card border-line">
              <CardHeader className="border-b border-line bg-surface-muted/60 py-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-zinc-200/60 rounded">
                    <FileText size={14} className="text-ink-secondary" />
                  </div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink font-sans">Section A: Ticket Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* Subject Line */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Subject / Title *</Label>
                    <span className="text-[11px] text-ink-muted font-sans">Mandatory field</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. MM: Unable to release purchasing requisition 10002345"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-card transition-all"
                  />
                </div>

                {/* Request Type & Priority Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Request Type Select */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Request Type *</Label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans cursor-pointer shadow-card transition-all"
                    >
                      <option value="">-- Select Request Type --</option>
                      {REQUEST_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Select */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Severity Priority *</Label>
                    <div className="flex items-center gap-2">
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans cursor-pointer shadow-card transition-all flex-1"
                      >
                        <option value="Low">Low (P4)</option>
                        <option value="Medium">Medium (P3)</option>
                        <option value="High">High (P2)</option>
                        <option value="Critical">Critical (P1)</option>
                      </select>
                      
                      {/* Priority Color Indicator */}
                      <Badge className={`border uppercase tracking-widest text-[11px] font-bold shrink-0 px-2 py-1.5 rounded-md hover:bg-inherit cursor-default shadow-none ${
                        PRIORITIES.find(p => p.value === priority)?.color
                      }`}>
                        {priority}
                      </Badge>
                    </div>
                  </div>

                </div>

                {/* SLA Indicator Banner */}
                {requestType === 'Incident' && (
                  <div className="bg-surface-muted border border-line/80 rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-ink-secondary font-sans">
                    <Clock className="text-ink-secondary shrink-0 mt-0.5" size={14} />
                    <div className="space-y-0.5">
                      <span className="font-bold text-ink uppercase block text-[11px]">SLA Response Notice</span>
                      <span>This incident falls under active Service Level Agreements (SLA). Critical: 4h, High: 8h, Medium: 48h, Low: 120h.</span>
                    </div>
                  </div>
                )}

                {/* Description Textarea */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Detailed Description *</Label>
                  <textarea
                    rows={6}
                    placeholder="Include SAP T-Codes, steps to reproduce, exact error logs, or business impact details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg p-3 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-card transition-all"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Section C: SAP Classification */}
            <Card className="shadow-card border-line">
              <CardHeader className="border-b border-line bg-surface-muted/60 py-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-zinc-200/60 rounded">
                    <Layers size={14} className="text-ink-secondary" />
                  </div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink font-sans">Section C: SAP Classification</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* SAP Modules Searchable Multi-Select Combobox */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">SAP Modules Scope *</Label>
                  <div className="relative" ref={moduleDropdownRef}>
                    <div 
                      onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                      className="min-h-10 w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink cursor-pointer shadow-card flex flex-wrap items-center gap-1.5 pr-8 transition-all hover:border-line-strong"
                    >
                      {sapModules.length === 0 ? (
                        <span className="text-ink-muted">Search and select SAP modules...</span>
                      ) : (
                        sapModules.map(mod => (
                          <Badge 
                            key={mod} 
                            className="bg-surface-subtle text-ink hover:bg-surface-subtle border-none text-[11px] rounded flex items-center gap-1 py-0.5 px-1.5"
                          >
                            <span>{mod}</span>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleModule(mod);
                              }}
                              className="text-ink-muted hover:text-ink font-bold ml-0.5"
                            >
                              &times;
                            </span>
                          </Badge>
                        ))
                      )}
                      
                      <ChevronDown size={14} className="text-ink-muted absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {showModuleDropdown && (
                      <div className="absolute z-50 w-full mt-1.5 bg-surface border border-line rounded-lg shadow-lg p-3 space-y-2 animate-in fade-in-50 slide-in-from-top-1">
                        
                        {/* Search Input */}
                        <div className="flex items-center gap-2 border border-line rounded-lg px-2 py-1.5 bg-surface-muted/60">
                          <Search size={12} className="text-ink-muted" />
                          <input 
                            type="text" 
                            placeholder="Filter modules..." 
                            value={moduleSearchQuery}
                            onChange={(e) => setModuleSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs outline-none font-sans font-medium"
                          />
                        </div>

                        {/* Quick Selection Buttons */}
                        <div className="flex gap-2 border-b border-line pb-2">
                          <button 
                            type="button"
                            onClick={() => setSapModules(AVAILABLE_MODULES)}
                            className="text-[11px] font-bold text-ink bg-surface-subtle hover:bg-surface-subtle px-2 py-1 rounded"
                          >
                            Select All
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSapModules([])}
                            className="text-[11px] font-bold text-ink-secondary bg-surface-subtle hover:bg-surface-subtle px-2 py-1 rounded"
                          >
                            Clear All
                          </button>
                        </div>

                        {/* List */}
                        <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                          {filteredModules.length === 0 ? (
                            <div className="text-[11px] text-ink-muted text-center py-2">No matching modules.</div>
                          ) : (
                            filteredModules.map(mod => {
                              const isChecked = sapModules.includes(mod);
                              return (
                                <div 
                                  key={mod}
                                  onClick={() => handleToggleModule(mod)}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                                    isChecked 
                                      ? 'bg-ink text-white font-bold' 
                                      : 'hover:bg-surface-muted text-ink-secondary'
                                  }`}
                                >
                                  <span>{mod}</span>
                                  {isChecked && <Check size={11} className="text-white" />}
                                </div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                {/* Classification & Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Classification Dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Classification *</Label>
                    <select
                      value={classification}
                      onChange={(e) => setClassification(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans cursor-pointer shadow-card transition-all"
                    >
                      <option value="">-- Select Classification --</option>
                      {CLASSIFICATIONS.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Category Master *</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans cursor-pointer shadow-card transition-all"
                    >
                      <option value="">-- Select Category --</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                </div>

              </CardContent>
            </Card>

            {/* Section D: Business Impact */}
            <Card className="shadow-card border-line">
              <CardHeader className="border-b border-line bg-surface-muted/60 py-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-zinc-200/60 rounded">
                    <Activity size={14} className="text-ink-secondary" />
                  </div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink font-sans">Section D: Business Impact</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* Impact Level and Expected Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Impact Level */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Business Impact Level</Label>
                    <select
                      value={businessImpactLevel}
                      onChange={(e) => setBusinessImpactLevel(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans cursor-pointer shadow-card transition-all"
                    >
                      {BUSINESS_IMPACTS.map(imp => (
                        <option key={imp} value={imp}>{imp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Expected Resolution Date */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Expected Resolution Date</Label>
                    <input
                      type="date"
                      value={expectedResolutionDate}
                      onChange={(e) => setExpectedResolutionDate(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans shadow-card transition-all"
                    />
                  </div>

                </div>

                {/* Business Impact Description */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Impact Description</Label>
                  <textarea
                    rows={2}
                    placeholder="Describe how the business is impacted (e.g. unable to release stock order updates)..."
                    value={businessImpactDesc}
                    onChange={(e) => setBusinessImpactDesc(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg p-3 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans shadow-card transition-all"
                  />
                </div>

                {/* Business Justification */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider font-sans">Business Justification</Label>
                  <textarea
                    rows={2}
                    placeholder="Provide justification for resolution priority or expedited processing requests..."
                    value={businessJustification}
                    onChange={(e) => setBusinessJustification(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg p-3 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-sans shadow-card transition-all"
                  />
                </div>

              </CardContent>
            </Card>

          </div>

          {/* RIGHT 1 COLUMN: Attachments & Submit Actions */}
          <div className="space-y-6">
            
            {/* Section E: Attachments */}
            <Card className="shadow-card border-line">
              <CardHeader className="border-b border-line bg-surface-muted/60 py-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-zinc-200/60 rounded">
                    <Paperclip size={14} className="text-ink-secondary" />
                  </div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink font-sans">Section E: Attachments</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 bg-surface ${
                    dragActive ? 'border-zinc-900 bg-surface-muted' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                  />
                  <Upload className="text-ink-muted" size={20} />
                  <div>
                    <span className="text-xs font-bold text-ink font-sans block">Drag & drop files here</span>
                    <span className="text-[11px] text-ink-muted font-sans block mt-1">or click to browse local files</span>
                  </div>
                  <span className="text-[11px] text-ink-muted mt-1 uppercase">PDF, DOC, Excel, CSV, Images, ZIP (max 10MB)</span>
                </div>

                {/* Queue Display */}
                {filesQueue.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-ink-muted font-sans uppercase font-bold border-b border-line pb-1.5">
                      <span>Upload Queue</span>
                      <span>
                        {filesQueue.length} {filesQueue.length === 1 ? 'file' : 'files'} (
                        {(filesQueue.reduce((sum, f) => sum + f.fileObj.size, 0) / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {filesQueue.map(item => (
                        <div key={item.id} className="p-2 border border-line rounded-lg flex items-center justify-between gap-3 text-[11px] bg-surface-muted/60">
                          
                          {/* File Details */}
                          <div className="flex items-center gap-2 truncate flex-1">
                            {getFileIcon(item.fileObj.name)}
                            <div className="truncate">
                              <span className="font-bold text-ink block truncate leading-snug">{item.fileObj.name}</span>
                              <span className="text-[11px] text-ink-muted block">{(item.fileObj.size / 1024).toFixed(0)} KB</span>
                            </div>
                          </div>

                          {/* Progress & Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.status === 'uploading' && (
                              <div className="flex items-center gap-1">
                                <div className="w-12 h-1 bg-surface-subtle rounded-full overflow-hidden border border-line">
                                  <div className="h-full bg-ink" style={{ width: `${item.progress}%` }}></div>
                                </div>
                                <span className="text-[11px] font-bold text-ink-secondary">{item.progress}%</span>
                              </div>
                            )}
                            
                            {item.status === 'success' && (
                              <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-800 text-[11px] font-bold border-emerald-100 rounded px-1.5 py-0 leading-none">Ready</Badge>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeQueueFile(item.id);
                              }}
                              className="p-1 text-ink-muted hover:text-ink hover:bg-surface-subtle rounded transition"
                            >
                              <X size={12} />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Submission Actions */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-ink hover:bg-zinc-850 disabled:bg-zinc-400 text-white rounded-lg font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all shadow-card font-sans"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>

              <Link 
                href="/customer/tickets"
                className="w-full py-3 bg-surface border border-line hover:bg-surface-muted text-ink-secondary hover:text-ink rounded-lg font-bold uppercase tracking-wider text-[11px] flex items-center justify-center transition-all shadow-card font-sans"
              >
                Cancel Submission
              </Link>
            </div>

          </div>

        </form>

      </div>
    </TooltipProvider>
  );
}
