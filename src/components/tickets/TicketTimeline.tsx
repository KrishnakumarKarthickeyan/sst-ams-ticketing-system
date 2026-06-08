'use client';

import React, { useMemo } from 'react';
import { Ticket, Comment, EffortLog, TicketHourEstimate, TicketClosureRequest, AuditHistory } from '../../types/ticket';
import { Clock, Plus, Check, Play, UserCheck, AlertCircle, ArrowUpRight, MessageSquare, Paperclip, ChevronRight, FileText, CheckCircle2, XCircle, Activity } from 'lucide-react';

interface TicketTimelineProps {
  ticket: Ticket;
  userRole?: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
}

interface TimelineItem {
  id: string;
  type: 'history' | 'comment' | 'effort' | 'estimate' | 'closure';
  action: string;
  date: string;
  performer: string;
  role: 'Customer' | 'Consultant' | 'Manager' | 'SuperAdmin' | 'System';
  oldValue?: string;
  newValue?: string;
  remarks?: string;
  attachments?: Array<{ fileName: string; fileUrl?: string }>;
}

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ ticket, userRole }) => {

  const highlightMentions = (text: string) => {
    if (!text) return '';
    const regex = /@([A-Za-z0-9]+(?:\s[A-Za-z0-9]+)?)/g;
    const parts: React.ReactNode[] = [];
    let match;
    let lastIndex = 0;
    let keyCounter = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIdx = match.index;
      const matchText = match[0];
      
      if (matchIdx > lastIndex) {
        parts.push(text.substring(lastIndex, matchIdx));
      }
      
      parts.push(
        <span key={`mention-${keyCounter++}`} className="bg-zinc-900 text-white font-mono px-1.5 py-0.5 rounded text-[9px] font-bold inline-block mx-0.5 shadow-sm">
          {matchText}
        </span>
      );
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const getRoleByName = (name: string): TimelineItem['role'] => {
    const lower = name.toLowerCase();
    if (lower.includes('marcus') || lower.includes('manager')) return 'Manager';
    if (lower.includes('sarah') || lower.includes('jenkins') || lower.includes('customer') || lower.includes('client')) return 'Customer';
    if (lower.includes('admin')) return 'SuperAdmin';
    if (lower.includes('system') || lower.includes('auto-approved')) return 'System';
    return 'Consultant'; // Default for other consultants
  };

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const isCustomer = userRole === 'Customer';

    // 1. Comments
    (ticket.comments || []).forEach(c => {
      if (isCustomer && c.isInternal) return;

      const commentAttachments = (c.attachments || []).map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl
      }));
      items.push({
        id: c.id,
        type: 'comment',
        action: c.isInternal ? 'Internal Note Posted' : 'Comment Added',
        date: c.createdAt,
        performer: c.authorName,
        role: c.authorRole === 'SuperAdmin' ? 'SuperAdmin' : c.authorRole === 'Manager' ? 'Manager' : c.authorRole === 'Customer' ? 'Customer' : 'Consultant',
        remarks: c.content,
        attachments: commentAttachments.length > 0 ? commentAttachments : undefined
      });
    });

    // 2. Effort Logs (Hidden for Customer)
    if (!isCustomer) {
      (ticket.efforts || []).forEach(e => {
        items.push({
          id: e.id,
          type: 'effort',
          action: `Hours Logged: ${e.hoursWorked || e.hoursLogged} hrs`,
          date: e.createdAt,
          performer: e.consultantName,
          role: 'Consultant',
          remarks: `${e.activityType} - ${e.description} (${e.billable ? 'Billable' : 'Non-billable'}) - Status: ${e.status}`
        });
      });
    }

    // 3. Hour Estimates (Hidden for Customer)
    if (!isCustomer) {
      (ticket.hourEstimates || []).forEach(est => {
        let act = 'Estimated Hours Quoted';
        if (est.status === 'Revision Requested') act = 'Estimated Hours Revision Requested';
        else if (est.status === 'Revision Approved') act = 'Estimated Hours Revision Approved';
        else if (est.status === 'Revision Rejected') act = 'Estimated Hours Revision Rejected';

        items.push({
          id: est.id,
          type: 'estimate',
          action: act,
          date: est.submittedAt || est.createdAt,
          performer: est.consultantId,
          role: getRoleByName(est.consultantId),
          newValue: `${est.totalEstimatedHours} hrs (Func: ${est.functionalEstimatedHours}, Tech: ${est.technicalEstimatedHours})`,
          remarks: est.remarks || (est.status === 'Revision Rejected' ? `Reason: ${est.rejectionReason}` : undefined)
        });
      });
    }

    // 4. Closure Requests (Only show approved closures to Customer)
    (ticket.closureRequests || []).forEach(cls => {
      if (isCustomer && cls.status !== 'Approved') return;

      let act = 'Closure Request Raised';
      if (cls.status === 'Approved') act = 'Closure Request Approved';
      else if (cls.status === 'Rejected') act = 'Closure Request Rejected';
      else if (cls.status === 'Resubmitted') act = 'Closure Request Resubmitted';

      items.push({
        id: cls.id,
        type: 'closure',
        action: act,
        date: cls.createdAt,
        performer: cls.requestedBy,
        role: getRoleByName(cls.requestedBy),
        newValue: isCustomer ? `${cls.totalActualHours} hrs Approved` : `${cls.totalActualHours} hrs (Func: ${cls.functionalActualHours}, Tech: ${cls.technicalActualHours})`,
        remarks: isCustomer 
          ? `Work Completed: ${cls.workCompletedSummary}\nResolution: ${cls.resolutionSummary}`
          : `Work Summary: ${cls.workCompletedSummary}\nRoot Cause: ${cls.rootCause}\nResolution: ${cls.resolutionSummary}${cls.rejectionReason ? `\nRejection Reason: ${cls.rejectionReason}` : ''}`
      });
    });

    // 5. Audit History
    (ticket.history || []).forEach(h => {
      if (h.fieldChanged === 'Comment Added' || h.fieldChanged === 'Comment') return;
      
      if (isCustomer) {
        const field = h.fieldChanged.toLowerCase();
        if (field.includes('estimate') || field.includes('effort') || field.includes('actual') || field.includes('hour') || field.includes('variance')) {
          return;
        }
      }

      items.push({
        id: h.id,
        type: 'history',
        action: h.fieldChanged === 'Status' ? 'Status Changed' : `${h.fieldChanged} Changed`,
        date: h.createdAt,
        performer: h.changedBy,
        role: getRoleByName(h.changedBy),
        oldValue: h.oldValue,
        newValue: h.newValue
      });
    });

    // Sort chronologically (newest first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ticket, userRole]);

  const getTimelineIcon = (type: TimelineItem['type'], action: string) => {
    const act = action.toLowerCase();
    if (type === 'comment') return <MessageSquare size={12} className="text-blue-400" />;
    if (type === 'effort') return <Clock size={12} className="text-emerald-400" />;
    if (act.includes('approved')) return <CheckCircle2 size={12} className="text-emerald-500" />;
    if (act.includes('rejected')) return <XCircle size={12} className="text-red-500" />;
    if (act.includes('requested')) return <Clock size={12} className="text-amber-500" />;
    if (act.includes('status')) return <Play size={12} className="text-zinc-600" fill="currentColor" />;
    return <Activity size={12} className="text-zinc-600" />;
  };

  const getRoleBadgeStyle = (role: TimelineItem['role']) => {
    switch (role) {
      case 'Customer': return 'bg-blue-950 text-blue-400 border-blue-900/30';
      case 'Manager': return 'bg-amber-950 text-amber-400 border-amber-900/30';
      case 'SuperAdmin': return 'bg-zinc-900 text-zinc-100 border-zinc-800';
      case 'System': return 'bg-zinc-100 text-zinc-600 border-zinc-300/50';
      default: return 'bg-white text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-2 flex justify-between items-center">
        <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-900">
          Operational History & Timeline
        </h3>
        <span className="text-[9px] text-zinc-500 font-mono">({timelineItems.length} events)</span>
      </div>

      {timelineItems.length === 0 ? (
        <p className="text-xs text-zinc-500 italic font-mono py-6 text-center">No actions logged for this ticket.</p>
      ) : (
        <div className="relative pl-6 border-l border-zinc-200 space-y-6 font-sans text-xs">
          {timelineItems.map((item) => (
            <div key={item.id} className="relative">
              
              {/* Node Marker */}
              <span className="absolute -left-[32px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-50 border border-zinc-200 shadow-sm">
                {getTimelineIcon(item.type, item.action)}
              </span>

              {/* Event Card */}
              <div className={`p-4 rounded-lg border bg-white/40 border-zinc-200/80 hover:border-zinc-300/60 transition-all space-y-2`}>
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 font-mono">{item.action}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase border ${getRoleBadgeStyle(item.role)}`}>
                      {item.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(item.date).toLocaleString()}
                  </span>
                </div>

                {/* Performed By */}
                <div className="text-[10px] text-zinc-600">
                  By: <strong className="text-zinc-900">{item.performer}</strong>
                </div>

                {/* Old / New Values */}
                {(item.oldValue || item.newValue) && (
                  <div className="bg-zinc-50 p-2 rounded border border-zinc-200/60 font-mono text-[10px] flex items-center gap-2 flex-wrap">
                    {item.oldValue && (
                      <>
                        <span className="text-zinc-500 line-through">{item.oldValue}</span>
                        <ChevronRight size={10} className="text-zinc-600" />
                      </>
                    )}
                    <span className="text-zinc-900 font-semibold">{item.newValue}</span>
                  </div>
                )}

                {/* Remarks / Message content */}
                {item.remarks && (
                  <p className="text-zinc-700 text-xs whitespace-pre-wrap leading-relaxed bg-zinc-50/40 p-2.5 rounded border border-zinc-200/50">
                    {highlightMentions(item.remarks)}
                  </p>
                )}

                {/* Attachments */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.attachments.map((file, fIdx) => (
                      <span key={fIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 border border-zinc-200 rounded text-[10px] text-zinc-600 font-mono">
                        <Paperclip size={10} className="text-zinc-500" />
                        {file.fileName}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
