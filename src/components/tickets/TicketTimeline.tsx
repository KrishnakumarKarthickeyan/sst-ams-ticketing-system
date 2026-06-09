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
    return 'Consultant';
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
    if (act.includes('approved') || act.includes('closed')) return { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600' };
    if (act.includes('rejected')) return { ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-500' };
    if (act.includes('escalat')) return { ring: 'ring-orange-200', bg: 'bg-orange-50', text: 'text-orange-500' };
    if (type === 'effort') return { ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-500' };
    if (type === 'estimate') return { ring: 'ring-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-500' };
    if (type === 'closure') return { ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-600' };
    return { ring: 'ring-zinc-200', bg: 'bg-zinc-50', text: 'text-zinc-500' };
  };

  const getRoleBadge = (role: TimelineItem['role']) => {
    switch (role) {
      case 'Customer': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'Manager': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'SuperAdmin': return { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-300' };
      case 'System': return { bg: 'bg-zinc-50', text: 'text-zinc-500', border: 'border-zinc-200' };
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
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
            Operation History & Timeline
          </h3>
          <p className="text-[11px] text-zinc-500">
            {timelineItems.length} events tracked
          </p>
        </div>
        
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1">
          {filterOptions.filter(f => f.count > 0 || f.key === 'all').map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 ${
                filter === f.key
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
              }`}
            >
              {f.label}
              <span className={`text-[9px] px-1 py-px rounded-full font-bold ${
                filter === f.key ? 'bg-white/20 text-white' : 'bg-zinc-200/80 text-zinc-500'
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
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-zinc-100 flex items-center justify-center">
            <Activity size={18} className="text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">No events found</p>
          <p className="text-xs text-zinc-400 mt-0.5">Try selecting a different filter</p>
        </div>
      ) : (
        <div className="relative">
          {groupedByDate.map((group, gIdx) => (
            <div key={group.label} className={gIdx > 0 ? 'mt-6' : ''}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
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
                        <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${colors.bg} ring-2 ${colors.ring} flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                          <span className={colors.text}>{getTimelineIcon(item.type, item.action)}</span>
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 pb-3 ${idx < group.items.length - 1 ? '' : ''}`}>
                          {/* Compact Row */}
                          <div 
                            className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 cursor-pointer select-none ${hasDetails ? 'hover:opacity-80' : ''}`}
                            onClick={() => hasDetails && toggleExpand(item.id)}
                          >
                            <span className="text-[12px] font-semibold text-zinc-900 leading-tight">
                              {item.action}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-px rounded text-[8px] font-bold uppercase border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                              {item.role}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              by <strong className="text-zinc-700 font-medium">{item.performer}</strong>
                            </span>
                            <span className="text-[10px] text-zinc-400 ml-auto whitespace-nowrap">
                              {formatRelativeTime(item.date)}
                            </span>
                            {hasDetails && (
                              <span className="text-zinc-400">
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </span>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && hasDetails && (
                            <div className="mt-2 ml-0.5 space-y-2 animate-in slide-in-from-top-1 duration-200">
                              {/* Value Change */}
                              {(item.oldValue || item.newValue) && (
                                <div className="flex items-center gap-2 text-[11px] bg-zinc-50 border border-zinc-200/70 rounded-lg px-3 py-1.5">
                                  {item.oldValue && (
                                    <>
                                      <span className="text-zinc-400 line-through font-mono">{item.oldValue}</span>
                                      <ChevronRight size={12} className="text-zinc-400 shrink-0" />
                                    </>
                                  )}
                                  <span className="text-zinc-900 font-semibold font-mono">{item.newValue}</span>
                                </div>
                              )}

                              {/* Remarks */}
                              {item.remarks && (
                                <div className="text-[11px] text-zinc-600 leading-relaxed bg-zinc-50/60 border border-zinc-200/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                                  {highlightMentions(item.remarks)}
                                </div>
                              )}

                              {/* Attachments */}
                              {item.attachments && item.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {item.attachments.map((file, fIdx) => (
                                    <span key={fIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 border border-zinc-200 rounded-md text-[10px] text-zinc-600 font-mono">
                                      <Paperclip size={10} className="text-zinc-400" />
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
