'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useRef } from 'react';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import {
  Paperclip,
  Upload,
  FileText,
  FileImage,
  FileArchive,
  File,
  X,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface AttachmentPanelProps {
  ticketId: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export default function AttachmentPanel({ ticketId }: AttachmentPanelProps) {
  const { tickets, addAttachment, deleteAttachment } = useTickets();
  const { user } = useAuth();
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticket = tickets.find((t) => t.id === ticketId);

  if (!ticket) {
    return (
      <div className="p-4 text-center border rounded-lg bg-surface-muted border-line text-ink-secondary text-xs">
        Ticket details unavailable
      </div>
    );
  }

  // Filter attachments: Customer only sees public ones; others see all
  const attachments = (ticket.attachments || []).filter(
    (a) => user?.role !== 'Customer' || a.visibility === 'public'
  );

  // File Icon selector based on name extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      return <FileImage size={18} className="text-blue-500 shrink-0" />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText size={18} className="text-red-505 shrink-0" />;
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
      return <FileText size={18} className="text-success shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive size={18} className="text-amber-500 shrink-0" />;
    }
    return <File size={18} className="text-ink-secondary shrink-0" />;
  };

  // Drag and Drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Upload processing & validation
  const processFiles = async (files: FileList) => {
    const blockedExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi', '.dll', '.scr', '.com',
      '.bin', '.cgi', '.py', '.php', '.phtml', '.pl', '.jsp', '.asp', '.aspx'
    ];
    const allowedExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'txt'
    ];

    const fileList = Array.from(files);

    for (const file of fileList) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const lastDotIdx = file.name.lastIndexOf('.');
      const fileExtension = lastDotIdx !== -1 ? file.name.slice(lastDotIdx).toLowerCase() : '';

      // Size validation (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File size exceeds 10MB limit: ${file.name}`);
        continue;
      }

      // Extension validation
      if (blockedExtensions.includes(fileExtension) || !allowedExtensions.includes(ext)) {
        toast.error(`Forbidden or unsupported file type: ${file.name}`);
        continue;
      }

      const queueId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newQueueItem: UploadQueueItem = {
        id: queueId,
        file,
        progress: 10,
        status: 'uploading'
      };

      setQueue((prev) => [...prev, newQueueItem]);

      // Simulate upload progress steps
      const progressInterval = setInterval(() => {
        setQueue((prev) =>
          prev.map((item) => {
            if (item.id === queueId && item.status === 'uploading' && item.progress < 90) {
              return { ...item, progress: item.progress + 15 };
            }
            return item;
          })
        );
      }, 100);

      try {
        const res = await addAttachment(
          ticketId,
          file.name,
          file.size,
          file.type || 'application/octet-stream',
          file,
          'public'
        );

        clearInterval(progressInterval);

        if (res.success) {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === queueId ? { ...item, progress: 100, status: 'success' } : item
            )
          );
          toast.success(`Uploaded: ${file.name}`);
          setTimeout(() => {
            setQueue((prev) => prev.filter((item) => item.id !== queueId));
          }, 1500);
        } else {
          throw new Error(res.error || 'Upload error');
        }
      } catch (err: unknown) {
        clearInterval(progressInterval);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? { ...item, status: 'error', errorMessage: getErrorMessage(err) || 'Upload failed' }
              : item
          )
        );
        toast.error(`Failed to upload ${file.name}: ${getErrorMessage(err) || 'Server error'}`);
      }
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Signed URL downloads
  const handleDownload = async (fileName: string, path: string) => {
    if (isSupabaseConfigured && supabase && path) {
      try {
        let relativePath = path;
        if (path.includes('/sap-tickets/')) {
          const parts = path.split('/sap-tickets/');
          relativePath = parts[parts.length - 1];
        }

        const { data, error } = await supabase.storage
          .from('sap-tickets')
          .createSignedUrl(relativePath, 60);

        if (error) {
          console.error('[STORAGE] Signed URL error:', error);
          if (path.startsWith('http://') || path.startsWith('https://')) {
            window.open(path, '_blank');
          } else {
            toast.error(`Download failed: ${error.message}`);
          }
          return;
        }

        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        } else {
          window.open(path, '_blank');
        }
      } catch (err: unknown) {
        console.error('[STORAGE] Signed URL exception:', err);
        window.open(path, '_blank');
      }
    } else {
      if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        window.open(path, '_blank');
      } else {
        toast.info(`Simulated download of ${fileName}`);
      }
    }
  };

  const handleDelete = async (attId: string, fileName: string) => {
    if (deletingId) return;
    setDeletingId(attId);
    try {
      const res = await deleteAttachment(ticketId, attId);
      if (res.success) {
        toast.success(`Deleted: ${fileName}`);
      } else {
        toast.error(`Delete failed: ${res.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Delete error: ${getErrorMessage(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Check delete privileges
  const canDeleteAttachment = (att: any) => {
    if (!user) return false;
    if (user.role === 'SuperAdmin' || user.role === 'Manager') return true;
    return user.name === att.uploadedBy;
  };

  return (
    <Card className="border-line shadow-card bg-surface overflow-hidden">
      <CardHeader className="border-b border-line bg-surface-muted/60 py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-ink-secondary" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
              Ticket Attachments ({attachments.length})
            </CardTitle>
          </div>
          <span className="text-[11px] text-ink-muted">Max size: 10MB</span>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 bg-surface ${
            dragActive ? 'border-ink bg-surface-muted/60' : 'border-line hover:border-line-strong'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.zip,.txt"
          />
          <Upload className="text-ink-muted" size={18} />
          <div>
            <span className="text-xs font-bold text-ink font-sans block">
              Drag & drop files here
            </span>
            <span className="text-[11px] text-ink-muted font-sans block mt-0.5">
              or click to browse files
            </span>
          </div>
        </div>

        {/* Uploading Queue */}
        {queue.length > 0 && (
          <div className="space-y-2 border-t border-line pt-4">
            <h4 className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              Uploading Queue
            </h4>
            <div className="space-y-1.5">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 border border-line rounded-lg flex items-center justify-between gap-3 text-[11px] bg-surface-muted/60"
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    {getFileIcon(item.file.name)}
                    <div className="truncate min-w-0">
                      <span className="font-bold text-ink block truncate leading-snug">
                        {item.file.name}
                      </span>
                      <span className="text-[11px] text-ink-muted block mt-0.5">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'uploading' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-zinc-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-ink transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-bold text-ink-secondary">{item.progress}%</span>
                      </div>
                    )}

                    {item.status === 'success' && (
                      <Badge className="bg-success-soft hover:bg-success-soft text-emerald-800 text-[11px] font-bold border-emerald-100 rounded px-1.5 py-0">
                        Ready
                      </Badge>
                    )}

                    {item.status === 'error' && (
                      <Badge variant="destructive" className="text-[11px] font-bold rounded px-1.5 py-0">
                        Error
                      </Badge>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQueueItem(item.id);
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

        {/* Attachment List */}
        <div className="space-y-2.5 border-t border-line pt-4">
          <h4 className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
            Files Registry ({attachments.length})
          </h4>
          {attachments.length === 0 ? (
            <p className="text-[11px] text-ink-muted italic text-center py-4 font-sans">
              No files registered to this ticket.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 border border-line rounded-lg bg-surface-muted/60 hover:border-line-strong transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0">
                    {getFileIcon(att.fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => handleDownload(att.fileName, att.fileUrl || att.filePath)}
                      className="text-xs font-semibold text-ink truncate hover:text-ink hover:underline cursor-pointer transition"
                      title={att.fileName}
                    >
                      {att.fileName}
                    </p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {(att.fileSize / 1024).toFixed(0)} KB • By {att.uploadedBy}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(att.fileName, att.fileUrl || att.filePath)}
                      className="h-7 w-7 text-ink-muted hover:text-ink rounded-lg"
                      title="Download file"
                    >
                      <Download size={13} />
                    </Button>
                    {canDeleteAttachment(att) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(att.id, att.fileName)}
                        disabled={deletingId === att.id}
                        className="h-7 w-7 text-ink-muted hover:text-critical rounded-lg"
                        title="Delete file"
                      >
                        {deletingId === att.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
