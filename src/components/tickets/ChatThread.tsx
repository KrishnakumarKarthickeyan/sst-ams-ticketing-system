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
      case 'Customer': return 'bg-zinc-100 text-zinc-650 border-zinc-250';
      case 'Manager': return 'bg-zinc-900 text-white border-zinc-800';
      case 'SuperAdmin': return 'bg-zinc-950 text-white border-zinc-900';
      default: return 'bg-zinc-100 text-zinc-800 border-zinc-300'; // Consultant
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl flex flex-col h-[650px] overflow-hidden shadow-sm">
      
      {/* Chat Header Info */}
      <div className="bg-zinc-50 border-b border-zinc-200 py-3 px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-zinc-850 uppercase text-[10px] tracking-wide">Ticket Conversation Feed</span>
        </div>
        <span className="text-[9.5px] text-zinc-400 font-bold uppercase">
          {visibleComments.length} Message{visibleComments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/20">
        
        {sortedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2 py-8">
            <MessageSquare size={36} className="text-zinc-300 stroke-[1.5]" />
            <p className="text-xs font-mono italic">No messages posted. Start the conversation below.</p>
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
                    <span className="px-3 text-[9px] uppercase tracking-wider font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full py-0.5">
                      {formatDateHeader(comment.createdAt)}
                    </span>
                    <div className="h-[1px] bg-zinc-200 flex-1"></div>
                  </div>
                )}

                {/* Chat Bubble Layout */}
                <div className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  
                  {/* User Avatar */}
                  <div className="h-8 w-8 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold text-[10px] text-zinc-800 uppercase shrink-0">
                    {comment.authorName ? comment.authorName.split(' ').map(n => n[0]).join('').slice(0, 2) : <User size={12} />}
                  </div>

                  {/* Bubble Content Area */}
                  <div className="space-y-1">
                    {/* Metadata Header */}
                    <div className={`flex items-center gap-1.5 text-[9px] font-mono ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-bold text-zinc-800">{comment.authorName}</span>
                      <span className={`px-1 py-0.1 border rounded text-[7.5px] font-bold uppercase ${getRoleBadgeStyle(comment.authorRole)}`}>
                        {comment.authorRole}
                      </span>
                      <span className="text-zinc-450">{formatRelativeTime(comment.createdAt)}</span>
                    </div>

                    {/* Bubble */}
                    <div className={`p-3 rounded-xl border leading-relaxed text-xs break-words shadow-xs ${
                      comment.isInternal
                        ? 'bg-amber-50/80 border-amber-250 text-zinc-900 rounded-tl-none'
                        : isMe
                          ? 'bg-zinc-950 text-white border-zinc-900 rounded-tr-none'
                          : 'bg-white text-zinc-900 border-zinc-200 rounded-tl-none'
                    }`}>
                      {comment.isInternal && (
                        <span className="text-[8px] bg-amber-200 text-amber-800 font-bold px-1 rounded block w-max mb-1 uppercase tracking-wider flex items-center gap-1 font-mono">
                          <Lock size={9} />
                          Internal Support Note
                        </span>
                      )}
                      
                      <p className="whitespace-pre-wrap">{comment.content}</p>

                      {/* Attachments inside bubble */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-200/50 space-y-1.5">
                          {comment.attachments.map((file, fIdx) => (
                            <div 
                              key={fIdx} 
                              className={`flex items-center justify-between p-1.5 rounded border text-[9.5px] font-mono ${
                                isMe ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-650'
                              }`}
                            >
                              <span className="truncate max-w-[150px]" title={file.fileName}>{file.fileName}</span>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file.fileName, file.fileUrl || '')}
                                className={`p-0.5 border rounded transition-colors ${
                                  isMe ? 'border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:border-zinc-900 hover:bg-white text-zinc-500'
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
        <div className="bg-zinc-50 border-t border-zinc-200 p-2.5 space-y-2 shrink-0 max-h-36 overflow-y-auto">
          <span className="text-[8.5px] font-bold text-zinc-450 uppercase block font-mono">Staged Attachments ({commentAttachments.length})</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {commentAttachments.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3 text-[9.5px] bg-white border border-zinc-200 p-2 rounded-lg shadow-xs font-mono">
                <span className="truncate flex-1 font-bold text-zinc-800">{f.fileName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-450">{(f.fileSize / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={() => setCommentAttachments(prev => prev.filter(x => x.id !== f.id))}
                    className="p-1 border border-zinc-200 text-zinc-400 hover:text-red-700 hover:border-red-500 rounded transition"
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
        <form onSubmit={handleCommentSubmit} className="border-t border-zinc-200 bg-white p-3 shrink-0 space-y-2.5">
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Real & simulated attachment controls */}
            <div className="flex items-center gap-2 font-mono">
              <input
                type="file"
                id="chat-file-upload"
                onChange={handleRealFileChange}
                className="hidden"
              />
              <label
                htmlFor="chat-file-upload"
                className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 border border-zinc-200 hover:border-zinc-800 rounded bg-white font-bold uppercase text-[9px] tracking-wider text-zinc-700 transition"
              >
                <Paperclip size={11} /> File
              </label>

              {/* Simulation tools */}
              <div className="hidden sm:flex items-center gap-1.5 border-l border-zinc-200 pl-2">
                <input
                  type="text"
                  placeholder="Simulate: doc.pdf..."
                  value={simFileName}
                  onChange={e => setSimFileName(e.target.value)}
                  className="bg-zinc-50 border border-zinc-250 rounded p-1 text-[9px] w-32 focus:outline-none focus:bg-white font-mono"
                />
                <input
                  type="number"
                  placeholder="KB"
                  value={simFileSize}
                  onChange={e => setSimFileSize(e.target.value)}
                  className="bg-zinc-50 border border-zinc-250 rounded p-1 text-[9px] w-12 focus:outline-none focus:bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleAttachSimulatedFile}
                  disabled={!simFileName.trim()}
                  className="px-2.5 py-1 bg-zinc-950 text-white rounded font-bold uppercase text-[9px] tracking-wider disabled:opacity-30 transition cursor-pointer font-mono"
                >
                  Stage
                </button>
              </div>
            </div>

            {/* Internal note checkbox (Restricted to non-customers) */}
            {!isCustomer && (
              <label className="flex items-center gap-1.5 cursor-pointer font-mono">
                <input
                  type="checkbox"
                  checked={isInternalComment}
                  onChange={e => setIsInternalComment(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                />
                <span className={`text-[9.5px] font-bold uppercase flex items-center gap-1 ${isInternalComment ? 'text-amber-700' : 'text-zinc-500'}`}>
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
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono resize-none max-h-44 transition-all"
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
              className="p-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:hover:bg-zinc-950 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
