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

  // Initials for the actor avatar (e.g. "Faisal Al-Qahtani" -> "FA").
  const getInitials = (name: string): string => {
    const clean = (name || '').replace(/\(.*?\)/g, '').trim();
    if (!clean || /system/i.test(clean)) return 'SY';
    const parts = clean.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || clean.slice(0, 2).toUpperCase();
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
        label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

  // Canonical lifecycle stages — ALL render (reached = done, latest = current,
  // not-yet-reached = muted/pending), derived from the ticket's real signals.
  const lifecycle = useMemo(() => {
    const histHas = (kw: string) => (ticket.history || []).some(h => `${h.fieldChanged} ${h.newValue || ''}`.toLowerCase().includes(kw));
    const progressStatuses = ['In Progress', 'In Progress - Functional', 'In Progress - Technical', 'Awaiting Functional Submission', 'Awaiting Technical Submission', 'On Hold', 'Customer Action', 'Raised to SAP', 'Requirement Gathering', 'Request for Closure', 'Resolved', 'Closed'];
    const approved = (ticket.closureRequests || []).some(c => c.managerApprovalStatus === 'Approved' || c.status === 'Approved') || ticket.closureStatus === 'Approved' || ticket.status === 'Resolved' || ticket.status === 'Closed';
    const stages: { key: string; label: string; done: boolean; tone?: 'escalated' }[] = [
      { key: 'Created', label: 'Created', done: true },
      { key: 'Assigned', label: 'Assigned', done: !!ticket.assignedConsultant || (ticket.assignments?.length || 0) > 0 || histHas('assign') },
      { key: 'In Progress', label: 'In Progress', done: progressStatuses.includes(ticket.status) || histHas('progress') },
      { key: 'Estimate', label: 'Estimate', done: (ticket.hourEstimates?.length || 0) > 0 || (ticket.estimates?.length || 0) > 0 },
      { key: 'Closure Requested', label: 'Closure Req.', done: (ticket.closureRequests?.length || 0) > 0 },
      { key: 'Approved', label: 'Approved', done: approved },
      { key: 'Closed', label: 'Closed', done: ticket.status === 'Closed' },
    ];
    if (ticket.isEscalated || ticket.escalationFlag || (ticket.escalations?.length || 0) > 0) {
      stages.splice(3, 0, { key: 'Escalated', label: 'Escalated', done: true, tone: 'escalated' });
    }
    if ((ticket.reopenedCount || 0) > 0 || ticket.status === 'Reopened' || ticket.status === 'Reopen Requested') {
      stages.push({ key: 'Reopened', label: 'Reopened', done: true, tone: 'escalated' });
    }
    let lastDone = -1;
    stages.forEach((s, i) => { if (s.done) lastDone = i; });
    return stages.map((s, i) => ({ ...s, current: i === lastDone }));
  }, [ticket]);

  return (
    <div className="space-y-4">
      {/* Lifecycle stage tracker — every stage shown; pending stages muted */}
      <div className="rounded-lg border border-line bg-surface p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Lifecycle</p>
        <div className="flex flex-wrap items-center gap-y-2">
          {lifecycle.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? (s.tone === 'escalated' ? 'bg-warning text-white' : 'bg-success text-white') : 'border border-line bg-surface-muted text-ink-muted'} ${s.current ? 'ring-2 ring-ink/30 ring-offset-1' : ''}`}>
                  {s.done ? <Check size={11} /> : i + 1}
                </span>
                <span className={`whitespace-nowrap text-[11px] ${s.done ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{s.label}</span>
              </div>
              {i < lifecycle.length - 1 && <span className={`mx-2 h-px w-4 ${lifecycle[i + 1].done ? 'bg-success' : 'bg-line'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

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

      {/* Activity timeline — redesigned visuals; event data, wording and role
          resolution are unchanged (see timelineItems / formatTimelineEvent / getPerformerInfo). */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface-muted/40 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle">
            <Activity size={18} className="text-ink-muted" />
          </div>
          <p className="text-sm font-medium text-ink-secondary">No activity yet</p>
          <p className="mt-0.5 text-xs text-ink-muted">Events will appear here as the ticket progresses.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByDate.map((group) => (
            <div key={group.label}>
              {/* Day separator */}
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-secondary whitespace-nowrap">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>

              {/* Rail + nodes */}
              <div className="relative">
                <div className="pointer-events-none absolute left-[15px] top-3 bottom-3 w-px bg-line" aria-hidden />
                <div className="space-y-0">
                  {group.items.map((item) => {
                    const roleBadge = getRoleBadge(item.role);
                    const isExpanded = expanded[item.id];
                    const isLatest = item.id === filteredItems[0]?.id;
                    const hasDetails = !!(item.oldValue || item.newValue || item.remarks || (item.attachments && item.attachments.length > 0));

                    return (
                      <div key={item.id} className="relative flex gap-3 pb-4 last:pb-1">
                        {/* Node — single muted color for past, primary (brand) for the latest/active */}
                        <div className={`relative z-10 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${isLatest ? 'border-brand bg-brand text-white shadow-card' : 'border-line bg-surface text-ink-secondary'}`}>
                          {getTimelineIcon(item.type, item.action)}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          {/* Actor row: avatar initials + name + role badge + relative time (absolute on hover) */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-subtle text-[9px] font-bold uppercase text-ink-secondary">
                              {getInitials(item.performer)}
                            </span>
                            <span className="text-[12px] font-bold text-ink">{item.performer}</span>
                            <span className={`rounded border px-1.5 py-px text-[10px] font-bold uppercase ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                              {item.role}
                            </span>
                            <span className="ml-auto whitespace-nowrap text-[11px] text-ink-muted" title={new Date(item.date).toLocaleString()}>
                              {formatRelativeTime(item.date)}
                            </span>
                          </div>

                          {/* Event sentence — wording unchanged */}
                          <button
                            type="button"
                            onClick={() => hasDetails && toggleExpand(item.id)}
                            className={`mt-1 flex w-full items-start gap-1 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className="text-[12px] leading-snug text-ink-secondary">{formatTimelineEvent(item)}</span>
                            {hasDetails && (
                              <span className="mt-0.5 flex-shrink-0 text-ink-muted">{isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
                            )}
                          </button>

                          {/* Expanded details — unchanged */}
                          {isExpanded && hasDetails && (
                            <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
                              {(item.oldValue || item.newValue) && (
                                <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-surface-muted px-3 py-1.5 text-[11px]">
                                  {item.oldValue && (
                                    <>
                                      <span className="text-ink-muted line-through">{item.oldValue}</span>
                                      <ChevronRight size={12} className="shrink-0 text-ink-muted" />
                                    </>
                                  )}
                                  <span className="font-semibold text-ink">{item.newValue}</span>
                                </div>
                              )}
                              {item.remarks && (
                                <div className="whitespace-pre-wrap rounded-lg border border-line/50 bg-surface-muted/60 px-3 py-2 text-[11px] leading-relaxed text-ink-secondary">
                                  {highlightMentions(item.remarks)}
                                </div>
                              )}
                              {item.attachments && item.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {item.attachments.map((file, fIdx) => (
                                    <span key={fIdx} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-muted px-2 py-0.5 text-[11px] text-ink-secondary">
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
