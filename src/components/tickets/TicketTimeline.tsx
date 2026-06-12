'use client';

import React, { useMemo, useState } from 'react';
import { Ticket, Comment, EffortLog, TicketHourEstimate, TicketClosureRequest, AuditHistory } from '../../types/ticket';
import { Clock, Plus, Check, Play, UserCheck, AlertCircle, ArrowUpRight, MessageSquare, Paperclip, ChevronRight, FileText, CheckCircle2, XCircle, Activity, Filter, ChevronDown, ChevronUp, RotateCcw, Lock, Unlock, Zap } from 'lucide-react';

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

type FilterType = 'all' | 'history' | 'effort' | 'estimate' | 'closure';

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ ticket, userRole }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        <span key={`mention-${keyCounter++}`} className="bg-ink text-white px-1.5 py-0.5 rounded text-[11px] font-bold inline-block mx-0.5 shadow-card">
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

  const getPerformerInfo = (name: string): { role: TimelineItem['role']; consultantType?: 'Functional' | 'Technical' } => {
    const lower = name.toLowerCase();
    
    if (lower.includes('system') || lower.includes('auto-approved')) {
      return { role: 'System' };
    }

    if (ticket.assignments) {
      const assignment = ticket.assignments.find(
        a => a.consultantName.toLowerCase() === lower || a.consultantId.toLowerCase() === lower
      );
      if (assignment) {
        return { role: 'Consultant', consultantType: assignment.consultantType };
      }
    }

    if (ticket.assignedConsultant && ticket.assignedConsultant.toLowerCase() === lower) {
      return { role: 'Consultant', consultantType: (ticket.functionalOrTechnical as any) || 'Functional' };
    }

    if (
      (ticket.assignedManager && ticket.assignedManager.toLowerCase() === lower) ||
      (ticket.escalationAcknowledgedByName && ticket.escalationAcknowledgedByName.toLowerCase() === lower)
    ) {
      return { role: 'Manager' };
    }

    if (ticket.comments) {
      const comment = ticket.comments.find(
        c => c.authorName.toLowerCase() === lower
      );
      if (comment) {
        if (comment.authorRole === 'Customer') return { role: 'Customer' };
        if (comment.authorRole === 'Consultant') return { role: 'Consultant' };
        if (comment.authorRole === 'Manager') return { role: 'Manager' };
        if (comment.authorRole === 'SuperAdmin') return { role: 'SuperAdmin' };
      }
    }

    if (ticket.requestedBy && ticket.requestedBy.toLowerCase() === lower) {
      return { role: 'Customer' };
    }
    if (ticket.createdByName && ticket.createdByName.toLowerCase() === lower) {
      return { role: 'Customer' };
    }

    if (lower.includes('marcus') || lower.includes('manager')) {
      return { role: 'Manager' };
    }
    if (lower.includes('sarah') || lower.includes('jenkins') || lower.includes('customer') || lower.includes('client')) {
      return { role: 'Customer' };
    }
    if (lower.includes('admin') || lower.includes('superadmin')) {
      return { role: 'SuperAdmin' };
    }

    return { role: 'Consultant', consultantType: 'Functional' };
  };

  const getRoleByName = (name: string): TimelineItem['role'] => {
    return getPerformerInfo(name).role;
  };

  const formatTimelineEvent = (item: TimelineItem): string => {
    const { role, consultantType } = getPerformerInfo(item.performer);
    const performerStr = `${item.performer} (${role})`;

    switch (item.type) {
      case 'effort': {
        const hoursMatch = item.action.match(/Hours Logged:\s*([\d.]+)/);
        const hours = hoursMatch ? hoursMatch[1] : '0';
        const typeStr = consultantType || 'Functional';
        return `${performerStr} logged ${hours}h of ${typeStr} effort.`;
      }

      case 'estimate': {
        const act = item.action.toLowerCase();
        if (act.includes('approved')) {
          return `${performerStr} approved the estimated hours.`;
        } else if (act.includes('rejected')) {
          return `${performerStr} rejected the estimated hours.`;
        } else if (act.includes('revision requested')) {
          return `${performerStr} requested a revision of the estimated hours.`;
        }
        
        const estMatch = item.newValue?.match(/^([\d.]+)/);
        const estHours = estMatch ? estMatch[1] : '';
        return `${performerStr} estimated ${estHours ? `${estHours}h` : 'hours'} of effort.`;
      }

      case 'closure': {
        const act = item.action.toLowerCase();
        if (act.includes('approved')) {
          return `${performerStr} approved the closure request and closed the ticket.`;
        } else if (act.includes('rejected')) {
          return `${performerStr} rejected the closure request.`;
        } else if (act.includes('resubmitted')) {
          return `${performerStr} resubmitted the closure request.`;
        }
        return `${performerStr} requested ticket closure.`;
      }

      case 'history': {
        const actionStr = item.action.toLowerCase();
        
        if (actionStr.includes('status')) {
          if (item.newValue === 'Closed') {
            return `${performerStr} closed the ticket.`;
          } else if (item.newValue === 'Reopened' || item.newValue === 'Reopen Requested') {
            return `${performerStr} reopened the ticket.`;
          } else if (item.oldValue && item.newValue) {
            return `${performerStr} changed status from ${item.oldValue} to ${item.newValue}.`;
          } else if (item.newValue) {
            return `${performerStr} changed status to ${item.newValue}.`;
          }
          return `${performerStr} updated the status.`;
        }

        if (actionStr.includes('assign') || actionStr.includes('consultant')) {
          if (item.newValue) {
            return `${performerStr} assigned the ticket to ${item.newValue}.`;
          }
          return `${performerStr} reassigned the ticket.`;
        }

        if (actionStr.includes('priority')) {
          if (item.oldValue && item.newValue) {
            return `${performerStr} changed priority from ${item.oldValue} to ${item.newValue}.`;
          } else if (item.newValue) {
            return `${performerStr} changed priority to ${item.newValue}.`;
          }
          return `${performerStr} changed ticket priority.`;
        }

        if (actionStr.includes('escalat')) {
          const isEscalated = item.newValue === 'true' || item.newValue === 'Yes' || item.newValue === 'Escalated';
          if (isEscalated) {
            return `${performerStr} escalated the ticket.`;
          } else {
            return `${performerStr} resolved the escalation.`;
          }
        }

        if (actionStr.includes('acknowledg')) {
          return `${performerStr} acknowledged the escalation.`;
        }

        if (actionStr.includes('description')) {
          return `${performerStr} updated description details.`;
        }
        if (actionStr.includes('title')) {
          return `${performerStr} updated ticket title.`;
        }
        if (actionStr.includes('module')) {
          if (item.newValue) {
            return `${performerStr} updated SAP module scope to ${item.newValue}.`;
          }
          return `${performerStr} updated SAP module scope.`;
        }

        if (item.oldValue && item.newValue) {
          return `${performerStr} changed ${item.action.replace(' Changed', '')} from ${item.oldValue} to ${item.newValue}.`;
        }
        return `${performerStr} updated ${item.action.replace(' Changed', '') || 'ticket details'}.`;
      }

      default:
        return `${performerStr} performed action: ${item.action}`;
    }
  };

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const isCustomer = userRole === 'Customer';

    // Effort Logs (Hidden for Customer)
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

    // Hour Estimates (Hidden for Customer)
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

    // Closure Requests
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

    // Audit History
    (ticket.history || []).forEach(h => {
      if (h.fieldChanged === 'Comment Added' || h.fieldChanged === 'Comment') return;
      if (isCustomer) {
        const field = h.fieldChanged.toLowerCase();
        if (field.includes('estimate') || field.includes('effort') || field.includes('actual') || field.includes('hour') || field.includes('variance')) return;
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

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ticket, userRole]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return timelineItems;
    return timelineItems.filter(item => item.type === filter);
  }, [timelineItems, filter]);

  const getTimelineIcon = (type: TimelineItem['type'], action: string) => {
    const act = action.toLowerCase();
    if (type === 'effort') return <Clock size={14} />;
    if (type === 'estimate') return <FileText size={14} />;
    if (type === 'closure') {
      if (act.includes('approved')) return <CheckCircle2 size={14} />;
      if (act.includes('rejected')) return <XCircle size={14} />;
      return <Lock size={14} />;
    }
    if (act.includes('approved')) return <CheckCircle2 size={14} />;
    if (act.includes('rejected')) return <XCircle size={14} />;
    if (act.includes('escalat')) return <Zap size={14} />;
    if (act.includes('reopen')) return <RotateCcw size={14} />;
    if (act.includes('status')) return <Play size={14} fill="currentColor" />;
    if (act.includes('assign')) return <UserCheck size={14} />;
    return <Activity size={14} />;
  };

  const getNodeColors = (type: TimelineItem['type'], action: string) => {
    const act = action.toLowerCase();
    if (act.includes('approved') || act.includes('closed')) return { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-success' };
    if (act.includes('rejected')) return { ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-critical' };
    if (act.includes('escalat')) return { ring: 'ring-orange-200', bg: 'bg-orange-50', text: 'text-warning' };
    if (type === 'effort') return { ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-500' };
    if (type === 'estimate') return { ring: 'ring-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-500' };
    if (type === 'closure') return { ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-warning' };
    return { ring: 'ring-zinc-200', bg: 'bg-surface-muted', text: 'text-ink-secondary' };
  };

  const getRoleBadge = (role: TimelineItem['role']) => {
    switch (role) {
      case 'Customer': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'Manager': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'SuperAdmin': return { bg: 'bg-surface-subtle', text: 'text-ink', border: 'border-line-strong' };
      case 'System': return { bg: 'bg-surface-muted', text: 'text-ink-secondary', border: 'border-line' };
      default: return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: timelineItems.length },
    { key: 'history', label: 'History', count: timelineItems.filter(i => i.type === 'history').length },
    { key: 'effort', label: 'Efforts', count: timelineItems.filter(i => i.type === 'effort').length },
    { key: 'estimate', label: 'Estimates', count: timelineItems.filter(i => i.type === 'estimate').length },
    { key: 'closure', label: 'Closures', count: timelineItems.filter(i => i.type === 'closure').length },
  ];

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group items by date for visual grouping
  const groupedByDate = useMemo(() => {
    const groups: { label: string; items: TimelineItem[] }[] = [];
    let currentLabel = '';
    
    filteredItems.forEach(item => {
      const date = new Date(item.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let label: string;
      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      if (label !== currentLabel) {
        groups.push({ label, items: [item] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    
    return groups;
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-ink tracking-tight">
            Operation History & Timeline
          </h3>
          <p className="text-[11px] text-ink-secondary">
            {timelineItems.length} events tracked
          </p>
        </div>
        
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1">
          {filterOptions.filter(f => f.count > 0 || f.key === 'all').map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                filter === f.key
                  ? 'bg-ink text-white shadow-card'
                  : 'bg-surface-subtle text-ink-secondary hover:bg-surface-subtle border border-line'
              }`}
            >
              {f.label}
              <span className={`text-[11px] px-1 py-px rounded-full font-bold ${
                filter === f.key ? 'bg-surface/20 text-white' : 'bg-zinc-200/80 text-ink-secondary'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface-subtle flex items-center justify-center">
            <Activity size={18} className="text-ink-muted" />
          </div>
          <p className="text-sm text-ink-secondary font-medium">No events found</p>
          <p className="text-xs text-ink-muted mt-0.5">Try selecting a different filter</p>
        </div>
      ) : (
        <div className="relative">
          {groupedByDate.map((group, gIdx) => (
            <div key={group.label} className={gIdx > 0 ? 'mt-6' : ''}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              {/* Events */}
              <div className="relative ml-3">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-zinc-300 via-zinc-200 to-transparent" />

                <div className="space-y-1.5">
                  {group.items.map((item, idx) => {
                    const colors = getNodeColors(item.type, item.action);
                    const roleBadge = getRoleBadge(item.role);
                    const isExpanded = expanded[item.id];
                    const hasDetails = !!(item.oldValue || item.newValue || item.remarks || (item.attachments && item.attachments.length > 0));

                    return (
                      <div key={item.id} className="relative flex gap-3 group">
                        {/* Node */}
                        <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${colors.bg} ring-2 ${colors.ring} flex items-center justify-center shadow-card transition-transform group-hover:scale-110`}>
                          <span className={colors.text}>{getTimelineIcon(item.type, item.action)}</span>
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 pb-3 ${idx < group.items.length - 1 ? '' : ''}`}>
                          {/* Compact Row */}
                          <div 
                            className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 cursor-pointer select-none ${hasDetails ? 'hover:opacity-80' : ''}`}
                            onClick={() => hasDetails && toggleExpand(item.id)}
                          >
                            <span className="text-[12px] font-semibold text-ink leading-tight flex-1">
                              {formatTimelineEvent(item)}
                            </span>
                            <span className="text-[11px] text-ink-muted ml-auto whitespace-nowrap pr-2">
                              {formatRelativeTime(item.date)}
                            </span>
                            {hasDetails && (
                              <span className="text-ink-muted">
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </span>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && hasDetails && (
                            <div className="mt-2 ml-0.5 space-y-2 animate-in slide-in-from-top-1 duration-200">
                              {/* Value Change */}
                              {(item.oldValue || item.newValue) && (
                                <div className="flex items-center gap-2 text-[11px] bg-surface-muted border border-line/70 rounded-lg px-3 py-1.5">
                                  {item.oldValue && (
                                    <>
                                      <span className="text-ink-muted line-through">{item.oldValue}</span>
                                      <ChevronRight size={12} className="text-ink-muted shrink-0" />
                                    </>
                                  )}
                                  <span className="text-ink font-semibold">{item.newValue}</span>
                                </div>
                              )}

                              {/* Remarks */}
                              {item.remarks && (
                                <div className="text-[11px] text-ink-secondary leading-relaxed bg-surface-muted/60 border border-line/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                                  {highlightMentions(item.remarks)}
                                </div>
                              )}

                              {/* Attachments */}
                              {item.attachments && item.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {item.attachments.map((file, fIdx) => (
                                    <span key={fIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-muted border border-line rounded-md text-[11px] text-ink-secondary">
                                      <Paperclip size={10} className="text-ink-muted" />
                                      {file.fileName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
