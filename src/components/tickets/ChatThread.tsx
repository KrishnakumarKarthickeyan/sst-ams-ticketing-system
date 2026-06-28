'use client';

import React, { useRef, useEffect } from 'react';
import { Comment, Ticket } from '@/types/ticket';
import { 
  Paperclip, 
  Send, 
  Download, 
  Trash2, 
  Lock, 
  Eye, 
  User, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface ChatThreadProps {
  ticket: Ticket;
  currentUserEmail: string;
  role: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
  commentText: string;
  setCommentText: (val: string) => void;
  isInternalComment: boolean;
  setIsInternalComment: (val: boolean) => void;
  commentAttachments: any[];
  setCommentAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  handleCommentSubmit: (e: React.FormEvent) => void;
  handleRealFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  simFileName: string;
  setSimFileName: (val: string) => void;
  simFileSize: string;
  setSimFileSize: (val: string) => void;
  handleAttachSimulatedFile: () => void;
  handleDownloadFile: (fileName: string, storagePath: string) => void;
}

// Client-side relative time formatter
function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return 'Just now'; // handle slight clock drifts
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Client-side date separator helper
function isSameDay(d1Str: string, d2Str: string) {
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function formatDateHeader(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  ticket,
  currentUserEmail,
  role,
  commentText,
  setCommentText,
  isInternalComment,
  setIsInternalComment,
  commentAttachments,
  setCommentAttachments,
  handleCommentSubmit,
  handleRealFileChange,
  simFileName,
  setSimFileName,
  simFileSize,
  setSimFileSize,
  handleAttachSimulatedFile,
  handleDownloadFile
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isCustomer = role === 'Customer';

  // Filter out internal comments for Customers
  const visibleComments = (ticket.comments || []).filter(c => {
    if (isCustomer && c.isInternal) return false;
    return true;
  });

  // Sort comments chronologically (oldest first for chat flow)
  const sortedComments = [...visibleComments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Auto scroll to bottom when new messages load
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.comments?.length]);

  // Handle typing height resize (growing composer)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [commentText]);

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case 'Customer': return 'bg-surface-subtle text-ink-secondary border-line';
      case 'Manager': return 'bg-ink text-white border-zinc-800';
      case 'SuperAdmin': return 'bg-ink text-white border-zinc-900';
      default: return 'bg-surface-subtle text-ink border-line-strong'; // Consultant
    }
  };

  return (
    <div className="bg-surface border border-line rounded-lg flex flex-col h-[650px] overflow-hidden shadow-card">
      
      {/* Chat Header Info */}
      <div className="bg-surface-muted border-b border-line py-3 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-ink uppercase text-[11px] tracking-wide">Ticket Conversation Feed</span>
        </div>
        <span className="text-[11px] text-ink-muted font-bold uppercase">
          {visibleComments.length} Message{visibleComments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-muted/20">
        
        {sortedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-muted space-y-2 py-8">
            <MessageSquare size={36} className="text-ink-muted stroke-[1.5]" />
            <p className="text-xs italic">No messages posted. Start the conversation below.</p>
          </div>
        ) : (
          sortedComments.map((comment, idx) => {
            const isMe = comment.authorEmail.trim().toLowerCase() === currentUserEmail.trim().toLowerCase();
            const showDateHeader = idx === 0 || !isSameDay(sortedComments[idx - 1].createdAt, comment.createdAt);
            
            return (
              <div key={comment.id || idx} className="space-y-3">
                {/* Date separator */}
                {showDateHeader && (
                  <div className="flex items-center justify-center my-4 shrink-0">
                    <div className="h-[1px] bg-zinc-200 flex-1"></div>
                    <span className="px-3 text-[11px] uppercase tracking-wider font-bold text-ink-muted bg-surface-muted border border-line rounded-full py-0.5">
                      {formatDateHeader(comment.createdAt)}
                    </span>
                    <div className="h-[1px] bg-zinc-200 flex-1"></div>
                  </div>
                )}

                {/* Chat Bubble Layout */}
                <div className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  
                  {/* User Avatar */}
                  <div className="h-8 w-8 rounded-full bg-zinc-200 border border-line-strong flex items-center justify-center font-bold text-[11px] text-ink uppercase shrink-0">
                    {comment.authorName ? comment.authorName.split(' ').map(n => n[0]).join('').slice(0, 2) : <User size={12} />}
                  </div>

                  {/* Bubble Content Area */}
                  <div className="space-y-1">
                    {/* Metadata Header */}
                    <div className={`flex items-center gap-1.5 text-[11px] ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-bold text-ink">{comment.authorName}</span>
                      <span className={`px-1 py-0.1 border rounded text-[11px] font-bold uppercase ${getRoleBadgeStyle(comment.authorRole)}`}>
                        {comment.authorRole}
                      </span>
                      <span className="text-ink-muted">{formatRelativeTime(comment.createdAt)}</span>
                    </div>

                    {/* Bubble */}
                    <div className={`p-3 rounded-lg border leading-relaxed text-xs break-words shadow-xs ${
                      comment.isInternal
                        ? 'bg-warning-soft/80 border-amber-250 text-ink rounded-tl-none'
                        : isMe
                          ? 'bg-ink text-white border-zinc-900 rounded-tr-none'
                          : 'bg-surface text-ink border-line rounded-tl-none'
                    }`}>
                      {comment.isInternal && (
                        <span className="text-[11px] bg-amber-200 text-amber-800 font-bold px-1 rounded block w-max mb-1 uppercase tracking-wider flex items-center gap-1">
                          <Lock size={9} />
                          Internal Support Note
                        </span>
                      )}
                      
                      <p className="whitespace-pre-wrap">{comment.content}</p>

                      {/* Attachments inside bubble */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-line/50 space-y-1.5">
                          {comment.attachments.map((file, fIdx) => (
                            <div 
                              key={fIdx} 
                              className={`flex items-center justify-between p-1.5 rounded border text-[11px] ${
                                isMe ? 'bg-ink border-zinc-800 text-ink-muted' : 'bg-surface-muted border-line text-ink-secondary'
                              }`}
                            >
                              <span className="truncate max-w-[150px]" title={file.fileName}>{file.fileName}</span>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file.fileName, file.fileUrl || '')}
                                className={`p-0.5 border rounded transition-colors ${
                                  isMe ? 'border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 text-ink-muted' : 'border-line hover:border-zinc-900 hover:bg-surface text-ink-secondary'
                                }`}
                                title="Download attachment"
                              >
                                <Download size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Simulated/Pending uploads panel */}
      {commentAttachments.length > 0 && (
        <div className="bg-surface-muted border-t border-line p-2.5 space-y-2 shrink-0 max-h-36 overflow-y-auto">
          <span className="text-[11px] font-bold text-ink-muted uppercase block">Staged Attachments ({commentAttachments.length})</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {commentAttachments.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3 text-[11px] bg-surface border border-line p-2 rounded-lg shadow-xs">
                <span className="truncate flex-1 font-bold text-ink">{f.fileName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-muted">{(f.fileSize / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={() => setCommentAttachments(prev => prev.filter(x => x.id !== f.id))}
                    className="p-1 border border-line text-ink-muted hover:text-critical-strong hover:border-red-500 rounded transition"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Composer Area */}
      {ticket.status !== 'Closed' && (
        <form onSubmit={handleCommentSubmit} className="border-t border-line bg-surface p-3 shrink-0 space-y-2.5">
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Real & simulated attachment controls */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="chat-file-upload"
                onChange={handleRealFileChange}
                className="hidden"
              />
              <label
                htmlFor="chat-file-upload"
                className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 border border-line hover:border-zinc-800 rounded bg-surface font-bold uppercase text-[11px] tracking-wider text-ink-secondary transition"
              >
                <Paperclip size={11} /> File
              </label>

              {/* Simulation tools */}
              <div className="hidden sm:flex items-center gap-1.5 border-l border-line pl-2">
                <input
                  type="text"
                  placeholder="Simulate: doc.pdf..."
                  value={simFileName}
                  onChange={e => setSimFileName(e.target.value)}
                  className="bg-surface-muted border border-line rounded p-1 text-[11px] w-32 focus:outline-none focus:bg-surface"
                />
                <input
                  type="number"
                  placeholder="KB"
                  value={simFileSize}
                  onChange={e => setSimFileSize(e.target.value)}
                  className="bg-surface-muted border border-line rounded p-1 text-[11px] w-12 focus:outline-none focus:bg-surface"
                />
                <button
                  type="button"
                  onClick={handleAttachSimulatedFile}
                  disabled={!simFileName.trim()}
                  className="px-2.5 py-1 bg-ink text-white rounded font-bold uppercase text-[11px] tracking-wider disabled:opacity-30 transition cursor-pointer"
                >
                  Stage
                </button>
              </div>
            </div>

            {/* Internal note checkbox (Restricted to non-customers) */}
            {!isCustomer && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternalComment}
                  onChange={e => setIsInternalComment(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-line-strong text-ink focus:ring-brand/30 cursor-pointer"
                />
                <span className={`text-[11px] font-bold uppercase flex items-center gap-1 ${isInternalComment ? 'text-warning-strong' : 'text-ink-secondary'}`}>
                  {isInternalComment ? <Lock size={10} /> : <Eye size={10} />}
                  Internal Note
                </span>
              </label>
            )}

          </div>

          {/* Textarea Composer and Send */}
          <div className="flex items-end gap-2.5">
            <textarea
              ref={textareaRef}
              required
              rows={1}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={isInternalComment ? "Type internal note visible only to support staff..." : "Type message response to client..."}
              className="flex-1 bg-surface-muted border border-line rounded-lg p-2.5 text-xs text-ink focus:outline-none focus:border-brand resize-none max-h-44 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (commentText.trim() || commentAttachments.length > 0) {
                    handleCommentSubmit(e);
                  }
                }
              }}
            />
            <button
              type="submit"
              disabled={!commentText.trim() && commentAttachments.length === 0}
              className="p-2.5 bg-ink hover:bg-zinc-800 text-white rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:hover:bg-ink cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
