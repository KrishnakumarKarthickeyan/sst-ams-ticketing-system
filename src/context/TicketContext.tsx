'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  SAPModule,
  IssueCategory,
  Comment,
  EffortLog,
  AuditHistory,
  SatisfactionRating,
  KnowledgebaseArticle,
  KnowledgebaseCategory,
  Notification,
  CustomerContract,
  SupportContractType,
  EffortActivityType,
  Attachment,
  CustomerContact,
  TicketType,
  FunctionalOrTechnical,
  TicketEscalation,
  TicketHourEstimate,
  TicketClosureRequest,
  TicketConsultantEffort,
  TicketMention,
  TicketCommentAttachment,
  TicketUnlockRequest
} from '../types/ticket';
import {
  MOCK_TICKETS,
  MOCK_CONTRACTS,
  MOCK_CATEGORIES,
  MOCK_ARTICLES,
  MOCK_NOTIFICATIONS,
  FAQ_MOCK,
  getPastDate,
  getFutureDate,
  MOCK_CONTACTS
} from '../utils/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import { useAuth } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  contracts: CustomerContract[];
  contacts: CustomerContact[];
  kbArticles: KnowledgebaseArticle[];
  kbCategories: KnowledgebaseCategory[];
  notifications: Notification[];
  loading: boolean;
  
  // Ticket Operations
  createTicket: (data: {
    title: string;
    description: string;
    sapModule: SAPModule;
    category: string;
    priority: TicketPriority;
    organization: string;
    requestedBy: string;
    requestedByEmail: string;
    assignedManager?: string;
    assignedConsultant?: string;
    source?: 'Created by Client' | 'Created by Super Admin';
    attachments?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[];
    ticketType?: string;
    functionalOrTechnical?: string;
    classification?: string;
    businessImpact?: string;
    businessImpactLevel?: string;
    businessJustification?: string;
    expectedResolutionDate?: string;
    sapModules?: SAPModule[];
  }) => Promise<{ success: boolean; error?: string; ticketId?: string }>;
  updateTicket: (ticketId: string, data: Partial<Ticket>) => void;
  requestDelete: (ticketId: string, reason: string, requester: string) => void;
  requestEscalation: (ticketId: string, reason: string, severity: 'Low' | 'Medium' | 'High', actorName: string) => void;
  assignTicket: (ticketId: string, managerName?: string, consultantName?: string, actorName?: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus, actorName: string) => void;
  addComment: (
    ticketId: string,
    content: string,
    authorName: string,
    authorEmail: string,
    authorRole: Comment['authorRole'],
    isInternal: boolean,
    attachments?: { fileName: string; fileSize: number; fileType: string; fileUrl?: string }[],
    mentions?: string[]
  ) => void;
  logEffort: (data: {
    ticketId: string;
    hours: number;
    description: string;
    consultantName: string;
    activityType: EffortActivityType;
    billable: boolean;
    startTime?: string;
    endTime?: string;
    workDate?: string;
  }) => void;
  approveEffortLog: (ticketId: string, logId: string, action: 'Approved' | 'Rejected', actorName: string, rejectionReason?: string) => void;
  resubmitEffortLog: (
    ticketId: string,
    logId: string,
    data: {
      hoursWorked: number;
      workDate: string;
      description: string;
      activityType: EffortActivityType;
      billable: boolean;
    }
  ) => void;
  resolveTicket: (ticketId: string, rootCause: string, resolutionSummary: string, actorName: string) => void;
  approveClosure: (ticketId: string, actorName: string) => void;
  closeTicket: (ticketId: string, score: number, feedback: string, actorName: string) => void;
  reopenTicket: (ticketId: string, reason: string, actorName: string) => void;
  escalateTicket: (ticketId: string, actorName: string) => void;
  updateTransportRequest: (ticketId: string, transportRequest: string, actorName: string) => void;

  // Estimates, closure requests, and consultant efforts workflows
  quoteEstimatedHours: (
    ticketId: string,
    data: {
      functionalEstimatedHours: number;
      technicalEstimatedHours: number;
      remarks: string;
      submittedBy: string;
    }
  ) => void;
  requestEstimateRevision: (
    ticketId: string,
    data: {
      functionalEstimatedHours: number;
      technicalEstimatedHours: number;
      remarks: string;
      submittedBy: string;
    }
  ) => void;
  approveRevisionRequest: (ticketId: string, estimateId: string, managerName: string) => void;
  rejectRevisionRequest: (ticketId: string, estimateId: string, managerName: string, rejectionReason: string) => void;
  raiseClosureRequest: (
    ticketId: string,
    data: {
      functionalActualHours: number;
      technicalActualHours: number;
      workCompletedSummary: string;
      rootCause: string;
      resolutionSummary: string;
      pendingItems?: string;
      requestedBy: string;
    }
  ) => void;
  resubmitClosureRequest: (
    ticketId: string,
    requestId: string,
    data: {
      functionalActualHours: number;
      technicalActualHours: number;
      workCompletedSummary: string;
      rootCause: string;
      resolutionSummary: string;
      pendingItems?: string;
      requestedBy: string;
    }
  ) => void;
  approveClosureRequest: (ticketId: string, requestId: string, managerName: string) => void;
  rejectClosureRequest: (ticketId: string, requestId: string, managerName: string, rejectionReason: string) => void;
  updateConsultantEfforts: (ticketId: string, efforts: TicketConsultantEffort[]) => void;
  requestUnlock: (
    ticketId: string,
    data: {
      reason: string;
      requestedChange: string;
      remarks?: string;
      attachmentUrl?: string;
      requestedBy: string;
    }
  ) => void;
  approveUnlockRequest: (ticketId: string, requestId: string, managerName: string) => void;
  rejectUnlockRequest: (ticketId: string, requestId: string, managerName: string, rejectionReason: string) => void;

  // KB Operations
  createKbArticle: (data: {
    title: string;
    content: string;
    sapModule: SAPModule;
    categoryId: string;
    isInternal: boolean;
    authorName: string;
  }) => void;
  rateKbArticle: (articleId: string, score: number) => void;

  // Notifications
  markNotificationRead: (notificationId: string) => void;
  createSystemNotification: (userId: string, title: string, message: string, ticketId?: string) => void;

  // AI Chatbot Interface
  getChatResponse: (sapModule: SAPModule, userMessage: string) => Promise<{
    message: string;
    suggestedPriority?: TicketPriority;
    suggestedRootCause?: string;
    suggestedResolution?: string;
    suggestedArticle?: KnowledgebaseArticle;
  }>;
  resetMockData: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contracts, setContracts] = useState<CustomerContract[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [kbArticles, setKbArticles] = useState<KnowledgebaseArticle[]>([]);
  const [kbCategories, setKbCategories] = useState<KnowledgebaseCategory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) {
      setTickets([]);
      setContracts([]);
      setContacts([]);
      setKbArticles([]);
      setKbCategories([]);
      setNotifications([]);
      setLoading(false);
      return;
    }
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbProfiles } = await supabase.from('profiles').select('*');
        const { data: dbTickets } = await supabase.from('tickets').select('*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_consultant_efforts(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*)');
        const { data: dbContracts } = await supabase.from('customer_contracts').select('*, organizations(name)');
        const { data: dbContacts } = await supabase.from('customer_contacts').select('*');
        const { data: dbArticles } = await supabase.from('knowledgebase_articles').select('*');
        const { data: dbCategories } = await supabase.from('knowledgebase_categories').select('*');
        const { data: dbNotifications } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });

        const profilesList = dbProfiles || [];

        setTickets(dbTickets ? dbTickets.map(t => mapDbTicket(t, profilesList, dbContacts || [])) : []);

        setContracts(dbContracts ? dbContracts.map(c => ({
          id: c.id,
          organizationName: (c.organizations as any)?.name || c.organization_id,
          contractType: c.contract_type as SupportContractType,
          startDate: c.start_date,
          endDate: c.end_date,
          totalHours: Number(c.total_hours),
          usedHours: Number(c.used_hours),
          monthlyBudgetHours: Number(c.monthly_budget_hours),
          isActive: c.is_active
        })) : []);

        setContacts(dbContacts ? dbContacts.map(c => ({
          id: c.id,
          organizationName: c.organization_name || c.organization_id || '',
          name: c.name,
          designation: c.designation,
          email: c.email,
          phone: c.phone || undefined,
          isPrimary: c.is_primary,
          isSecondary: c.is_secondary
        })) : []);

        setKbArticles(dbArticles ? dbArticles.map(a => ({
          id: a.id,
          categoryId: a.category_id,
          categoryName: 'General Guides',
          title: a.title,
          slug: a.slug,
          content: a.content,
          sapModule: a.sap_module as SAPModule,
          isInternal: a.is_internal,
          authorName: a.author_id,
          ratingsCount: a.ratings_count || 0,
          ratingsSum: a.ratings_sum || 0,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        })) : []);

        setKbCategories(dbCategories || []);

        setNotifications(dbNotifications ? dbNotifications.map(n => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          ticketId: n.ticket_id,
          isRead: n.is_read,
          createdAt: n.created_at
        })) : []);

      } catch (err) {
        console.error('Supabase fetch failed, setting states to empty.', err);
        setTickets([]);
        setContracts([]);
        setContacts([]);
        setKbArticles([]);
        setKbCategories([]);
        setNotifications([]);
      }
    } else {
      setTickets([]);
      setContracts([]);
      setContacts([]);
      setKbArticles([]);
      setKbCategories([]);
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
          },
          (payload) => {
            console.log('Realtime change detected, re-fetching...', payload);
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }
  }, []);

  const loadMockTickets = () => {
    setTickets(MOCK_TICKETS);
    localStorage.setItem('sst_tickets', JSON.stringify(MOCK_TICKETS));
  };

  const loadLocalFallback = () => {
    const t = localStorage.getItem('sst_tickets');
    const c = localStorage.getItem('sst_contracts');
    const co = localStorage.getItem('sst_contacts');
    const a = localStorage.getItem('sst_articles');
    const cat = localStorage.getItem('sst_categories');
    const n = localStorage.getItem('sst_notifications');

    let parsedTickets = MOCK_TICKETS;
    if (t) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed) && parsed.length >= 50 && parsed.some((x: any) => x.assignedConsultant === 'Priya Raman')) {
          parsedTickets = parsed;
        } else {
          localStorage.setItem('sst_tickets', JSON.stringify(MOCK_TICKETS));
        }
      } catch (e) {
        localStorage.setItem('sst_tickets', JSON.stringify(MOCK_TICKETS));
      }
    } else {
      localStorage.setItem('sst_tickets', JSON.stringify(MOCK_TICKETS));
    }

    setTickets(parsedTickets);
    setContracts(c ? JSON.parse(c) : MOCK_CONTRACTS);
    setContacts(co ? JSON.parse(co) : MOCK_CONTACTS);
    setKbArticles(a ? JSON.parse(a) : MOCK_ARTICLES);
    setKbCategories(cat ? JSON.parse(cat) : MOCK_CATEGORIES);
    setNotifications(n ? JSON.parse(n) : MOCK_NOTIFICATIONS);
  };

  const resetMockData = () => {
    setTickets(MOCK_TICKETS);
    setContracts(MOCK_CONTRACTS);
    setContacts(MOCK_CONTACTS);
    setKbArticles(MOCK_ARTICLES);
    setKbCategories(MOCK_CATEGORIES);
    setNotifications(MOCK_NOTIFICATIONS);
    
    localStorage.setItem('sst_tickets', JSON.stringify(MOCK_TICKETS));
    localStorage.setItem('sst_contracts', JSON.stringify(MOCK_CONTRACTS));
    localStorage.setItem('sst_contacts', JSON.stringify(MOCK_CONTACTS));
    localStorage.setItem('sst_articles', JSON.stringify(MOCK_ARTICLES));
    localStorage.setItem('sst_categories', JSON.stringify(MOCK_CATEGORIES));
    localStorage.setItem('sst_notifications', JSON.stringify(MOCK_NOTIFICATIONS));
  };

  // Helper mapper for Supabase format
  const mapDbTicket = (t: any, dbProfiles: any[], dbContacts: any[] = []): Ticket => {
    const getProfile = (id: string) => dbProfiles.find(p => p.id === id || p.full_name === id || p.email === id);
    const customer = getProfile(t.requested_by);
    const consultant = getProfile(t.assigned_consultant_id);
    const manager = getProfile(t.assigned_manager_id);

    let requestedByPhone = customer?.phone_number || undefined;
    if (!requestedByPhone && dbContacts) {
      const contact = dbContacts.find((c: any) => 
        (c.name && customer?.full_name && c.name.toLowerCase() === customer.full_name.toLowerCase()) || 
        (c.email && customer?.email && c.email.toLowerCase() === customer.email.toLowerCase()) ||
        (c.name && t.created_by_name && c.name.toLowerCase() === t.created_by_name.toLowerCase())
      );
      if (contact) {
        requestedByPhone = contact.phone || undefined;
      }
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      organization: (t.organizations as any)?.name || t.organization_id, // Organization Name
      requestedBy: customer?.full_name || t.created_by_name || t.requested_by,
      requestedByEmail: customer?.email || '',
      requestedByPhone: requestedByPhone,
      sapModule: t.sap_module as SAPModule,
      category: t.category as IssueCategory,
      priority: t.priority as TicketPriority,
      status: t.status as TicketStatus,
      assignedManager: manager?.full_name || undefined,
      assignedConsultant: consultant?.full_name || undefined,
      slaDueAt: (t.sla_due_at === '9999-12-31T23:59:59.999Z' || t.sla_due_at?.startsWith('9999-12-31')) ? 'SLA Not Applicable' : (t.sla_due_at || 'SLA Not Applicable'),
      resolvedAt: t.resolved_at,
      closedAt: t.closed_at,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      rootCause: t.root_cause,
      resolutionSummary: t.resolution_summary,
      billable: t.billable,
      escalationFlag: t.escalation_flag,
      approvalRequiredFlag: t.approval_required,
      transportRequest: t.transport_request,
      source: t.source || 'Created by Client',
      
      comments: (t.ticket_comments || t.comments) ? (t.ticket_comments || t.comments).map((c: any) => {
        const commentAuthor = getProfile(c.author_id);
        return {
          id: c.id,
          ticketId: c.ticket_id,
          authorName: commentAuthor?.full_name || 'System',
          authorEmail: commentAuthor?.email || '',
          authorRole: commentAuthor?.role || 'Customer',
          content: c.content,
          isInternal: c.is_internal,
          createdAt: c.created_at,
          attachments: t.ticket_comment_attachments 
            ? t.ticket_comment_attachments
                .filter((a: any) => a.comment_id === c.id)
                .map((a: any) => ({
                  id: a.id,
                  ticketId: a.ticket_id,
                  commentId: a.comment_id,
                  fileName: a.file_name,
                  filePath: a.file_url,
                  fileUrl: a.file_url,
                  fileType: a.file_type || '',
                  fileSize: a.file_size || 0,
                  uploadedBy: a.uploaded_by,
                  visibility: c.is_internal ? 'internal' : 'public',
                  createdAt: a.created_at
                }))
            : []
        };
      }) : [],

      attachments: t.ticket_attachments ? t.ticket_attachments.map((a: any) => ({
        id: a.id,
        ticketId: a.ticket_id,
        fileName: a.file_name,
        filePath: a.file_path,
        fileUrl: a.file_path,
        fileType: a.mime_type || '',
        fileSize: a.file_size || 0,
        uploadedBy: a.uploaded_by,
        visibility: 'public',
        createdAt: a.created_at
      })) : [],

      efforts: (t.ticket_efforts || t.efforts) ? (t.ticket_efforts || t.efforts).map((e: any) => {
        const effortConsultant = getProfile(e.consultant_id);
        return {
          id: e.id,
          ticketId: e.ticket_id,
          consultantId: e.consultant_id,
          consultantName: effortConsultant?.full_name || 'Consultant',
          hoursWorked: Number(e.hours_logged),
          workDate: e.activity_date,
          description: e.description,
          activityType: e.activity_type || 'Analysis',
          billable: e.billable,
          status: e.status || 'Approved',
          rejectionReason: e.rejection_reason,
          createdAt: e.created_at,
          hoursLogged: Number(e.hours_logged),
          activityDate: e.activity_date
        };
      }) : [],

      history: t.ticket_history ? t.ticket_history.map((h: any) => {
        const historyActor = getProfile(h.changed_by);
        return {
          id: h.id,
          ticketId: h.ticket_id,
          changedBy: historyActor?.full_name || h.changed_by,
          fieldChanged: h.field_changed,
          oldValue: h.old_value || '',
          newValue: h.new_value || '',
          createdAt: h.created_at
        };
      }).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [],

      rating: t.satisfaction_ratings && t.satisfaction_ratings.length > 0 ? {
        id: t.satisfaction_ratings[0].id,
        ticketId: t.satisfaction_ratings[0].ticket_id,
        score: t.satisfaction_ratings[0].score,
        feedback: t.satisfaction_ratings[0].feedback,
        createdAt: t.satisfaction_ratings[0].created_at
      } : undefined,

      ticketType: t.ticket_type as TicketType,
      functionalOrTechnical: t.functional_or_technical as FunctionalOrTechnical,
      classification: t.classification || t.functional_or_technical,
      businessImpact: t.business_impact,
      businessImpactLevel: t.business_impact_level || t.business_impact,
      businessJustification: t.business_justification,
      expectedResolutionDate: t.expected_resolution_date,
      quotedHours: t.quoted_hours ? Number(t.quoted_hours) : undefined,
      raisedToSap: t.raised_to_sap,
      reopenedCount: t.reopened_count || 0,
      customerActionRequired: t.customer_action_required,
      currentOwner: t.current_owner,
      nextActionOwner: t.next_action_owner,
      escalations: t.ticket_escalations ? t.ticket_escalations.map((esc: any) => {
        const escActor = getProfile(esc.escalated_by);
        return {
          id: esc.id,
          ticketId: esc.ticket_id,
          escalatedBy: escActor?.full_name || esc.escalated_by,
          reason: esc.reason,
          severity: esc.severity,
          status: esc.status,
          createdAt: esc.created_at
        };
      }) : [],

      createdByName: t.created_by_name || customer?.full_name || t.requested_by,
      createdByUser: t.created_by_user,
      softDeleteStatus: (t.soft_delete_status as 'Active' | 'Pending Delete' | 'Archived') || 'Active',
      sapModules: t.ticket_modules && t.ticket_modules.length > 0
        ? t.ticket_modules.map((m: any) => m.module_id as SAPModule)
        : (t.sap_module ? [t.sap_module as SAPModule] : []),
        
      deleteRequests: t.ticket_delete_requests ? t.ticket_delete_requests.map((r: any) => {
        const reqActor = getProfile(r.requested_by);
        return {
          id: r.id,
          ticketId: r.ticket_id,
          requestedBy: reqActor?.full_name || r.requested_by,
          requestedAt: r.requested_at,
          reason: r.reason,
          managerApproval: r.manager_approval as 'Pending' | 'Approved' | 'Rejected',
          managerApprovedBy: r.manager_approved_by,
          managerApprovedAt: r.manager_approved_at,
          adminApproval: r.admin_approval as 'Pending' | 'Approved' | 'Rejected',
          adminApprovedBy: r.admin_approved_by,
          adminApprovedAt: r.admin_approved_at,
          finalStatus: r.final_status as 'Pending' | 'Approved' | 'Rejected',
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      }) : [],

      hourEstimates: t.ticket_hour_estimates ? t.ticket_hour_estimates.map((e: any) => {
        const estActor = getProfile(e.consultant_id);
        return {
          id: e.id,
          ticketId: e.ticket_id,
          consultantId: estActor?.full_name || e.consultant_id,
          functionalEstimatedHours: Number(e.functional_estimated_hours),
          technicalEstimatedHours: Number(e.technical_estimated_hours),
          totalEstimatedHours: Number(e.total_estimated_hours),
          remarks: e.remarks,
          status: e.status,
          submittedAt: e.submitted_at,
          approvedBy: e.approved_by,
          approvedAt: e.approved_at,
          rejectedBy: e.rejected_by,
          rejectedAt: e.rejected_at,
          rejectionReason: e.rejection_reason,
          createdAt: e.created_at,
          updatedAt: e.updated_at
        };
      }) : [],

      closureRequests: t.ticket_closure_requests ? t.ticket_closure_requests.map((r: any) => {
        const reqActor = getProfile(r.requested_by);
        return {
          id: r.id,
          ticketId: r.ticket_id,
          requestedBy: reqActor?.full_name || r.requested_by,
          functionalActualHours: Number(r.functional_actual_hours),
          technicalActualHours: Number(r.technical_actual_hours),
          totalActualHours: Number(r.total_actual_hours),
          workCompletedSummary: r.work_completed_summary,
          rootCause: r.root_cause,
          resolutionSummary: r.resolution_summary,
          pendingItems: r.pending_items,
          status: r.status,
          managerApprovalStatus: r.manager_approval_status,
          managerApprovedBy: r.manager_approved_by,
          managerApprovedAt: r.manager_approved_at,
          managerRejectedBy: r.manager_rejected_by,
          managerRejectedAt: r.manager_rejected_at,
          rejectionReason: r.rejection_reason,
          resubmittedFromId: r.resubmitted_from_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      }) : [],

      consultantEfforts: (() => {
        const efforts = t.ticket_consultant_efforts ? t.ticket_consultant_efforts
          .filter((e: any) => !e.is_deleted)
          .map((e: any) => {
            const effortConsultant = getProfile(e.consultant_id);
            return {
              id: e.id,
              ticketId: e.ticket_id,
              consultantId: e.consultant_id,
              consultantName: effortConsultant?.full_name || e.consultant_name || e.consultant_id,
              consultantType: e.consultant_type as 'Functional' | 'Technical',
              estimatedHours: Number(e.estimated_hours),
              actualHours: Number(e.actual_hours),
              remarks: e.remarks,
              createdAt: e.created_at,
              updatedAt: e.updated_at,
              isDeleted: e.is_deleted,
              deletedAt: e.deleted_at,
              deletedBy: e.deleted_by,
              closureStatus: e.closure_status || 'Pending',
              workSummary: e.work_summary || '',
              resolutionNotes: e.resolution_notes || ''
            };
          }) : [];

        if (t.assigned_consultant_id) {
          const isAssignedPresent = efforts.some((e: any) => e.consultantId === t.assigned_consultant_id);
          if (!isAssignedPresent) {
            const primaryProfile = getProfile(t.assigned_consultant_id);
            if (primaryProfile) {
              efforts.push({
                id: `synthesized-${t.assigned_consultant_id}-${t.id}`,
                ticketId: t.id,
                consultantId: t.assigned_consultant_id,
                consultantName: primaryProfile.full_name || 'Consultant',
                consultantType: (primaryProfile.consultant_type === 'Technical' || t.functional_or_technical === 'Technical') ? 'Technical' : 'Functional',
                estimatedHours: 0,
                actualHours: 0,
                remarks: 'Primary assignment',
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                isDeleted: false,
                closureStatus: 'Pending',
                workSummary: '',
                resolutionNotes: ''
              });
            }
          }
        }
        return efforts;
      })(),

      unlockRequests: t.ticket_unlock_requests ? t.ticket_unlock_requests.map((u: any) => {
        const unlockActor = getProfile(u.requested_by);
        return {
          id: u.id,
          ticketId: u.ticket_id,
          closureRequestId: u.closure_request_id,
          requestedBy: unlockActor?.full_name || u.requested_by,
          reason: u.reason,
          requestedChange: u.requested_change,
          remarks: u.remarks,
          attachmentUrl: u.attachment_url,
          status: u.status,
          managerApprovedBy: u.manager_approved_by,
          managerApprovedAt: u.manager_approved_at,
          managerRejectedBy: u.manager_rejected_by,
          managerRejectedAt: u.manager_rejected_at,
          rejectionReason: u.rejection_reason,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        };
      }) : [],

      commentAttachments: t.ticket_comment_attachments ? t.ticket_comment_attachments.map((a: any) => ({
        id: a.id,
        commentId: a.comment_id,
        ticketId: a.ticket_id,
        fileName: a.file_name,
        fileUrl: a.file_url,
        fileType: a.file_type || '',
        fileSize: a.file_size || 0,
        uploadedBy: a.uploaded_by,
        createdAt: a.created_at
      })) : []
    };
  };

  const syncTickets = (updated: Ticket[]) => {
    setTickets(updated);
    localStorage.setItem('sst_tickets', JSON.stringify(updated));
  };

  const syncNotifications = (updated: Notification[]) => {
    setNotifications(updated);
    localStorage.setItem('sst_notifications', JSON.stringify(updated));
  };

  const syncKbArticles = (updated: KnowledgebaseArticle[]) => {
    setKbArticles(updated);
    localStorage.setItem('sst_articles', JSON.stringify(updated));
  };

  const uploadAttachmentToSupabase = async (
    ticketId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    fileObj?: File,
    fileUrlOrData?: string
  ): Promise<string> => {
    if (isSupabaseConfigured && supabase) {
      try {
        try {
          await supabase.storage.createBucket('sap-tickets', {
            public: true,
            fileSizeLimit: 10485760
          });
        } catch (e) {
          // ignore
        }

        const uniqueName = `${Date.now()}_${fileName}`;
        const storagePath = `${ticketId}/${uniqueName}`;

        let finalFileObj = fileObj;
        if (!finalFileObj) {
          const fileContent = `Simulated support file upload for ${fileName}. Size: ${fileSize} bytes. Path: ${storagePath}`;
          const blob = new Blob([fileContent], { type: fileType || 'text/plain' });
          finalFileObj = new File([blob], fileName, { type: fileType || 'text/plain' });
        }

        const { error: uploadErr } = await supabase.storage
          .from('sap-tickets')
          .upload(storagePath, finalFileObj, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) {
          console.error('Supabase storage upload error:', uploadErr);
          return fileUrlOrData || `/files/${fileName}`;
        }

        const { data } = supabase.storage.from('sap-tickets').getPublicUrl(storagePath);
        return data?.publicUrl || fileUrlOrData || `/files/${fileName}`;
      } catch (err) {
        console.error('Error in uploadAttachmentToSupabase:', err);
      }
    }
    return fileUrlOrData || `/files/${fileName}`;
  };

  // --- TICKET ACTIONS ---

  const createTicket = async (data: {
    title: string;
    description: string;
    sapModule: SAPModule;
    category: string;
    priority: TicketPriority;
    organization: string; // Organization Name
    requestedBy: string;
    requestedByEmail: string;
    assignedManager?: string;
    assignedConsultant?: string;
    source?: 'Created by Client' | 'Created by Super Admin';
    attachments?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[];
    ticketType?: string;
    functionalOrTechnical?: string;
    classification?: string;
    businessImpact?: string;
    businessImpactLevel?: string;
    businessJustification?: string;
    expectedResolutionDate?: string;
    sapModules?: SAPModule[];
  }): Promise<{ success: boolean; error?: string; ticketId?: string }> => {
    const tType = data.ticketType || 'Incident';
    const isIncident = tType === 'Incident';
    
    let slaHours = 48;
    if (data.priority === 'Critical') slaHours = 4;
    else if (data.priority === 'High') slaHours = 8;
    else if (data.priority === 'Low') slaHours = 120;

    const nextIdNum = tickets.reduce((max, t) => {
      const num = parseInt(t.id.split('-').pop() || '1000');
      return num > max ? num : max;
    }, 1000) + 1;

    const ticketId = `SST-${data.sapModule}-${nextIdNum}`;

    // Map Attachments
    const newAttachments: Attachment[] = [];
    for (let idx = 0; idx < (data.attachments || []).length; idx++) {
      const att = data.attachments![idx];
      const fileUrl = await uploadAttachmentToSupabase(ticketId, att.fileName, att.fileSize, att.fileType, att.fileObj);
      newAttachments.push({
        id: `a-${Date.now()}-${idx}`,
        ticketId,
        fileName: att.fileName,
        filePath: fileUrl,
        fileUrl: fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        uploadedBy: data.requestedBy,
        visibility: 'public',
        createdAt: new Date().toISOString()
      });
    }

    const ticketSource = data.source || 'Created by Client';
    const initialStatus: TicketStatus = data.assignedConsultant ? 'Assigned' : 'New';

    // SUPABASE DB CREATION
    if (isSupabaseConfigured && supabase) {
      try {
        let orgId = data.organization;
        const { data: orgData, error: orgFindErr } = await supabase.from('organizations').select('id').eq('name', data.organization).maybeSingle();
        if (orgFindErr) throw orgFindErr;

        if (orgData) {
          orgId = orgData.id;
        } else {
          const { data: newOrg, error: orgInsErr } = await supabase.from('organizations').insert({ name: data.organization }).select('id').single();
          if (orgInsErr) throw orgInsErr;
          if (newOrg) orgId = newOrg.id;
        }

        let requestorId = user?.id || '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3'; // Dynamic fallback
        const { data: profData, error: profErr } = await supabase.from('profiles').select('id').eq('email', data.requestedByEmail || 'customer@supportstudio.com').maybeSingle();
        if (profErr) throw profErr;
        if (profData) {
          requestorId = profData.id;
        }

        let consultantId = null;
        if (data.assignedConsultant) {
          const { data: consData, error: consErr } = await supabase.from('profiles').select('id').eq('full_name', data.assignedConsultant).maybeSingle();
          if (consErr) throw consErr;
          if (consData) consultantId = consData.id;
        }

        let managerId = null;
        if (data.assignedManager) {
          const { data: mgrData, error: mgrErr } = await supabase.from('profiles').select('id').eq('full_name', data.assignedManager).maybeSingle();
          if (mgrErr) throw mgrErr;
          if (mgrData) managerId = mgrData.id;
        }

        const { error: ticketInsErr } = await supabase.from('tickets').insert({
          id: ticketId,
          organization_id: orgId,
          requested_by: requestorId,
          sap_module: data.sapModule,
          category: data.category,
          priority: data.priority,
          status: initialStatus,
          assigned_manager_id: managerId,
          assigned_consultant_id: consultantId,
          sla_due_at: isIncident ? getFutureDate(slaHours) : '9999-12-31T23:59:59.999Z',
          description: data.description,
          title: data.title,
          billable: true,
          escalation_flag: false,
          approval_required: data.priority === 'Critical',
          ticket_type: tType,
          functional_or_technical: data.classification || data.functionalOrTechnical || 'Functional',
          classification: data.classification || data.functionalOrTechnical || 'Functional',
          business_impact: data.businessImpactLevel || data.businessImpact || null,
          business_impact_level: data.businessImpactLevel || data.businessImpact || null,
          business_justification: data.businessJustification || null,
          expected_resolution_date: data.expectedResolutionDate || null,
          current_owner: data.assignedConsultant || null,
          next_action_owner: data.assignedConsultant || 'Support Desk',
          created_by_name: data.requestedBy,
          created_by_user: requestorId,
          soft_delete_status: 'Active'
        });
        if (ticketInsErr) throw ticketInsErr;

        if (data.sapModules && data.sapModules.length > 0) {
          for (const m of data.sapModules) {
            const { error: modErr } = await supabase.from('ticket_modules').insert({
              ticket_id: ticketId,
              module_id: m
            });
            if (modErr) throw modErr;
          }
        } else {
          const { error: modErr } = await supabase.from('ticket_modules').insert({
            ticket_id: ticketId,
            module_id: data.sapModule
          });
          if (modErr) throw modErr;
        }

        for (const att of newAttachments) {
          const { error: attErr } = await supabase.from('ticket_attachments').insert({
            ticket_id: ticketId,
            uploaded_by: requestorId,
            file_name: att.fileName,
            file_path: att.filePath,
            file_size: att.fileSize,
            mime_type: att.fileType
          });
          if (attErr) throw attErr;
        }

        const { error: histErr } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: requestorId,
          field_changed: 'Ticket',
          old_value: 'Created',
          new_value: initialStatus
        });
        if (histErr) throw histErr;

        if (data.assignedConsultant) {
          const { error: histConsErr } = await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: requestorId,
            field_changed: 'Assigned Consultant',
            old_value: 'Unassigned',
            new_value: data.assignedConsultant
          });
          if (histConsErr) throw histConsErr;

          if (consultantId) {
            const { error: effortErr } = await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: consultantId,
              consultant_type: (data.classification === 'Technical' || data.functionalOrTechnical === 'Technical') ? 'Technical' : 'Functional',
              estimated_hours: 0,
              actual_hours: 0
            });
            if (effortErr) throw effortErr;
          }
        }

        const { data: mgrProfile } = await supabase.from('profiles').select('id').eq('email', 'manager@supportstudio.com').maybeSingle();
        if (mgrProfile) {
          const { error: notifErr } = await supabase.from('notifications').insert({
            user_id: mgrProfile.id,
            title: `New Ticket: ${ticketId}`,
            message: `Ticket "${data.title}" was submitted. Source: ${ticketSource}`,
            ticket_id: ticketId
          });
          if (notifErr) console.warn('Non-blocking notification error:', notifErr.message);
        }

        if (consultantId) {
          const { error: notifConsErr } = await supabase.from('notifications').insert({
            user_id: consultantId,
            title: 'New Ticket Assigned',
            message: `You have been assigned to ${ticketId} during creation.`,
            ticket_id: ticketId
          });
          if (notifConsErr) console.warn('Non-blocking notification error:', notifConsErr.message);
        }

      } catch (err: any) {
        console.error('Error creating ticket in Supabase:', err);
        return { success: false, error: err.message || 'Database write failed' };
      }
    }

    const newTicket: Ticket = {
      id: ticketId,
      title: data.title,
      description: data.description,
      organization: data.organization,
      requestedBy: data.requestedBy,
      requestedByEmail: data.requestedByEmail,
      sapModule: data.sapModule,
      category: data.category,
      priority: data.priority,
      status: initialStatus,
      assignedManager: data.assignedManager || undefined,
      assignedConsultant: data.assignedConsultant || undefined,
      slaDueAt: isIncident ? getFutureDate(slaHours) : 'SLA Not Applicable',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      billable: true,
      escalationFlag: false,
      approvalRequiredFlag: data.priority === 'Critical',
      source: ticketSource,
      comments: [],
      attachments: newAttachments,
      efforts: [],
      history: [
        {
          id: `h-init-${Date.now()}`,
          ticketId,
          changedBy: data.requestedBy,
          fieldChanged: 'Ticket',
          oldValue: 'Created',
          newValue: initialStatus,
          createdAt: new Date().toISOString()
        }
      ],
      ticketType: tType,
      functionalOrTechnical: data.functionalOrTechnical || 'Functional',
      businessImpact: data.businessImpact || '',
      expectedResolutionDate: data.expectedResolutionDate || undefined,
      quotedHours: undefined,
      raisedToSap: false,
      reopenedCount: 0,
      customerActionRequired: false,
      currentOwner: data.assignedConsultant || undefined,
      nextActionOwner: data.assignedConsultant ? data.assignedConsultant : 'Support Desk',
      escalations: [],
      sapModules: data.sapModules || [data.sapModule],
      createdByName: data.requestedBy,
      softDeleteStatus: 'Active',
      deleteRequests: []
    };

    if (data.assignedConsultant) {
      newTicket.history.push({
        id: `h-init-consultant-${Date.now()}`,
        ticketId,
        changedBy: data.requestedBy,
        fieldChanged: 'Assigned Consultant',
        oldValue: 'Unassigned',
        newValue: data.assignedConsultant,
        createdAt: new Date().toISOString()
      });
      newTicket.consultantEfforts = [{
        id: `eff-${Date.now()}`,
        ticketId,
        consultantId: data.assignedConsultant.toLowerCase().replace(/\s+/g, '-'),
        consultantName: data.assignedConsultant,
        consultantType: (data.classification === 'Technical' || data.functionalOrTechnical === 'Technical') ? 'Technical' : 'Functional',
        estimatedHours: 0,
        actualHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
    }

    const updated = [newTicket, ...tickets];
    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      `New Ticket: ${ticketId}`,
      `Ticket "${data.title}" was submitted. Source: ${ticketSource}`,
      ticketId
    );

    if (data.assignedConsultant) {
      createSystemNotification(
        'consultant@supportstudio.com',
        'New Ticket Assigned',
        `You have been assigned to ${ticketId} during creation.`,
        ticketId
      );
    }

    return { success: true, ticketId };
  };

  const requestEscalation = async (
    ticketId: string,
    reason: string,
    severity: 'Low' | 'Medium' | 'High',
    actorName: string
  ) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');
        await supabase.from('ticket_escalations').insert({
          ticket_id: ticketId,
          escalated_by: actorId,
          reason,
          severity,
          status: 'Pending'
        });
        await supabase.from('tickets').update({ escalation_flag: true, updated_at: new Date().toISOString() }).eq('id', ticketId);
        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Ticket Escalated',
          old_value: 'None',
          new_value: `${severity} Severity Escalation`
        });
      } catch (err) {
        console.error('Error in requestEscalation Supabase update:', err);
      }
    }
    const newEscalation: TicketEscalation = {
      id: `esc-${Date.now()}`,
      ticketId,
      escalatedBy: actorName,
      reason,
      severity,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const currentEscalations = t.escalations || [];
        const hist = [
          ...t.history,
          {
            id: `h-esc-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Ticket Escalated',
            oldValue: 'None',
            newValue: `${severity} Severity Escalation`,
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          escalationFlag: true,
          escalations: [...currentEscalations, newEscalation],
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      `Ticket Escalated: ${ticketId}`,
      `A ${severity} severity escalation was requested by ${actorName}. Reason: ${reason}`,
      ticketId
    );
  };

  const assignTicket = async (ticketId: string, managerName?: string, consultantName?: string, actorName?: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const changeActor = actorName || 'System';
        const { data: profActor } = await supabase.from('profiles').select('id').eq('full_name', changeActor).maybeSingle();
        const actorId = profActor ? profActor.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        const ticketObj = tickets.find(t => t.id === ticketId);
        const dbData: any = {};
        
        if (managerName !== undefined) {
          const { data: mgr } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
          dbData.assigned_manager_id = mgr ? mgr.id : null;
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Assigned Manager',
            old_value: ticketObj?.assignedManager || 'None',
            new_value: managerName || 'None'
          });
        }

        if (consultantName !== undefined) {
          const { data: cons } = await supabase.from('profiles').select('id, consultant_type').eq('full_name', consultantName).maybeSingle();
          const consultantId = cons ? cons.id : null;
          dbData.assigned_consultant_id = consultantId;
          
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Assigned Consultant',
            old_value: ticketObj?.assignedConsultant || 'Unassigned',
            new_value: consultantName || 'Unassigned'
          });

          if (consultantName) {
            if (ticketObj?.status === 'New') {
              dbData.status = 'Assigned';
              await supabase.from('ticket_history').insert({
                ticket_id: ticketId,
                changed_by: actorId,
                field_changed: 'Status',
                old_value: 'New',
                new_value: 'Assigned'
              });
            }

            if (consultantId) {
              const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
                .select('id')
                .eq('ticket_id', ticketId)
                .eq('consultant_id', consultantId)
                .maybeSingle();

              if (!existingEff) {
                await supabase.from('ticket_consultant_efforts').insert({
                  ticket_id: ticketId,
                  consultant_id: consultantId,
                  consultant_type: cons?.consultant_type || 'Functional',
                  estimated_hours: 0,
                  actual_hours: 0
                });
              }
            }
          }
        }

        await supabase.from('tickets').update(dbData).eq('id', ticketId);
      } catch (err) {
        console.error('Error in assignTicket Supabase update:', err);
      }
    }
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist: AuditHistory[] = [...t.history];
        const updates: Partial<Ticket> = { updatedAt: new Date().toISOString() };
        const changeActor = actorName || 'System';

        if (managerName !== undefined) {
          hist.push({
            id: `h-mgr-${Date.now()}`,
            ticketId,
            changedBy: changeActor,
            fieldChanged: 'Assigned Manager',
            oldValue: t.assignedManager || 'None',
            newValue: managerName || 'None',
            createdAt: new Date().toISOString()
          });
          updates.assignedManager = managerName || undefined;
        }

        if (consultantName !== undefined) {
          hist.push({
            id: `h-cons-${Date.now()}`,
            ticketId,
            changedBy: changeActor,
            fieldChanged: 'Assigned Consultant',
            oldValue: t.assignedConsultant || 'Unassigned',
            newValue: consultantName || 'Unassigned',
            createdAt: new Date().toISOString()
          });
          updates.assignedConsultant = consultantName || undefined;
          
          // Auto transition status from New -> Assigned
          if (consultantName && t.status === 'New') {
            hist.push({
              id: `h-status-auto-${Date.now()}`,
              ticketId,
              changedBy: changeActor,
              fieldChanged: 'Status',
              oldValue: t.status,
              newValue: 'Assigned',
              createdAt: new Date().toISOString()
            });
            updates.status = 'Assigned';
          }

          // Notify Consultant if a consultant is assigned
          if (consultantName) {
            createSystemNotification(
              'consultant@supportstudio.com',
              'Ticket Assigned',
              `You have been assigned to ${t.id} by ${changeActor}.`,
              ticketId
            );
          }
        }

        return { ...t, ...updates, history: hist };
      }
      return t;
    });

    syncTickets(updated);
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus, actorName: string) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    let targetStatus = status;
    let incrementReopened = false;

    if (currentTicket?.status === 'Reopen Requested' && (status === 'In Progress' || status === 'Assigned' || status === 'Reopened')) {
      targetStatus = 'Reopened';
      incrementReopened = true;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        const dbUpdate: any = { status: targetStatus, updated_at: new Date().toISOString() };
        if (incrementReopened) {
          dbUpdate.reopened_count = (currentTicket?.reopenedCount || 0) + 1;
        }
        await supabase.from('tickets').update(dbUpdate).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Status',
          old_value: currentTicket?.status || 'New',
          new_value: targetStatus
        });
      } catch (err) {
        console.error('Error in updateTicketStatus Supabase update:', err);
      }
    }
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist: AuditHistory[] = [
          ...t.history,
          {
            id: `h-status-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: targetStatus,
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          status: targetStatus,
          reopenedCount: incrementReopened ? (t.reopenedCount || 0) + 1 : t.reopenedCount,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });
    syncTickets(updated);

    if (incrementReopened) {
      createSystemNotification(
        'customer@supportstudio.com',
        'Ticket Reopen Approved',
        `Your reopen request for ticket ${ticketId} has been approved by ${actorName}.`,
        ticketId
      );
      createSystemNotification(
        'consultant@supportstudio.com',
        'Ticket Reopened',
        `Ticket ${ticketId} has been reopened and assigned back to you for resolution.`,
        ticketId
      );
    }
  };

  const addComment = async (
    ticketId: string,
    content: string,
    authorName: string,
    authorEmail: string,
    authorRole: Comment['authorRole'],
    isInternal: boolean,
    attachments?: { fileName: string; fileSize: number; fileType: string; fileUrl?: string }[],
    mentions?: string[]
  ) => {
    const commentId = `c-${Date.now()}`;
    
    // Build attachments
    const newAttachments: Attachment[] = [];
    for (let idx = 0; idx < (attachments || []).length; idx++) {
      const att = attachments![idx];
      const fileUrl = await uploadAttachmentToSupabase(ticketId, att.fileName, att.fileSize, att.fileType, undefined, att.fileUrl);
      newAttachments.push({
        id: `a-comment-${Date.now()}-${idx}`,
        ticketId,
        commentId,
        fileName: att.fileName,
        filePath: fileUrl,
        fileUrl: fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        uploadedBy: authorName,
        visibility: isInternal ? 'internal' : 'public',
        createdAt: new Date().toISOString()
      });
    }

    const commentAttachments: TicketCommentAttachment[] = newAttachments.map(att => ({
      id: att.id,
      commentId,
      ticketId,
      fileName: att.fileName,
      fileUrl: att.fileUrl,
      fileType: att.fileType,
      fileSize: att.fileSize,
      uploadedBy: authorName,
      createdAt: att.createdAt
    }));

    const newMentions: TicketMention[] = (mentions || []).map((userId, idx) => ({
      id: `m-${Date.now()}-${idx}`,
      ticketId,
      commentId,
      mentionedUserId: userId,
      mentionedBy: authorEmail,
      createdAt: new Date().toISOString()
    }));

    const newComment: Comment = {
      id: commentId,
      ticketId,
      authorName,
      authorEmail,
      authorRole,
      content,
      isInternal,
      createdAt: new Date().toISOString(),
      attachments: newAttachments
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', authorEmail).maybeSingle();
        const authorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        const { data: commData } = await supabase.from('ticket_comments').insert({
          ticket_id: ticketId,
          author_id: authorId,
          content: content,
          is_internal: isInternal
        }).select('id').single();

        const dbCommentId = commData ? commData.id : commentId;

        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            await supabase.from('ticket_comment_attachments').insert({
              comment_id: dbCommentId,
              ticket_id: ticketId,
              file_name: att.fileName,
              file_url: att.fileUrl || `/files/${att.fileName}`,
              file_type: att.fileType,
              file_size: att.fileSize,
              uploaded_by: authorId
            });
          }
        }

        if (mentions && mentions.length > 0) {
          for (const mEmail of mentions) {
            const { data: mProf } = await supabase.from('profiles').select('id').eq('email', mEmail).maybeSingle();
            if (mProf) {
              await supabase.from('ticket_mentions').insert({
                ticket_id: ticketId,
                comment_id: dbCommentId,
                mentioned_user_id: mProf.id,
                mentioned_by: authorId
              });
            }
          }
        }

        const t = tickets.find(x => x.id === ticketId);
        if (t) {
          let nextStatus = t.status;
          if (authorRole === 'Customer' && t.status === 'Waiting for Customer') {
            nextStatus = 'In Progress';
          } else if ((authorRole === 'Consultant' || authorRole === 'Manager') && !isInternal && t.status === 'In Progress') {
            nextStatus = 'Waiting for Customer';
          }

          if (nextStatus !== t.status) {
            await supabase.from('tickets').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', ticketId);
            await supabase.from('ticket_history').insert({
              ticket_id: ticketId,
              changed_by: authorId,
              field_changed: 'Status',
              old_value: t.status,
              new_value: nextStatus
            });
          }

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: authorId,
            field_changed: 'Comment Added',
            old_value: '',
            new_value: `${isInternal ? 'Internal note' : 'Public comment'} added by ${authorName}`
          });
        }
      } catch (err) {
        console.error('Error in addComment Supabase update:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        // Auto status shift
        let nextStatus = t.status;
        if (authorRole === 'Customer' && t.status === 'Waiting for Customer') {
          nextStatus = 'In Progress';
        } else if ((authorRole === 'Consultant' || authorRole === 'Manager') && !isInternal && t.status === 'In Progress') {
          nextStatus = 'Waiting for Customer';
        }

        const hist = [...t.history];
        if (nextStatus !== t.status) {
          hist.push({
            id: `h-comm-status-${Date.now()}`,
            ticketId,
            changedBy: authorName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: nextStatus,
            createdAt: new Date().toISOString()
          });
        }

        // Add history log for comment add
        hist.push({
          id: `h-comm-add-${Date.now()}`,
          ticketId,
          changedBy: authorName,
          fieldChanged: 'Comment Added',
          oldValue: '',
          newValue: `${isInternal ? 'Internal note' : 'Public comment'} added by ${authorName}${newAttachments.length > 0 ? ' (' + newAttachments.length + ' attachment(s))' : ''}`,
          createdAt: new Date().toISOString()
        });

        return {
          ...t,
          comments: [...t.comments, newComment],
          attachments: [...t.attachments, ...newAttachments],
          mentions: [...(t.mentions || []), ...newMentions],
          commentAttachments: [...(t.commentAttachments || []), ...commentAttachments],
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    // Notifications
    if (authorRole === 'Customer') {
      createSystemNotification(
        'consultant@supportstudio.com',
        'Customer Comment Added',
        `${authorName} commented on ${ticketId}.`,
        ticketId
      );
    } else if (!isInternal) {
      createSystemNotification(
        'customer@supportstudio.com',
        'Consultant Response',
        `${authorName} posted a reply on ${ticketId}.`,
        ticketId
      );
    }

    // Mention notifications
    (mentions || []).forEach(userId => {
      createSystemNotification(
        userId,
        'You were @mentioned in a ticket',
        `${authorName} mentioned you in ticket ${ticketId}.`,
        ticketId
      );
    });
  };

  const logEffort = async (data: {
    ticketId: string;
    hours: number;
    description: string;
    consultantName: string;
    activityType: EffortActivityType;
    billable: boolean;
    startTime?: string;
    endTime?: string;
    workDate?: string;
  }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newEffort: EffortLog = {
      id: `e-${Date.now()}`,
      ticketId: data.ticketId,
      consultantName: data.consultantName,
      hoursWorked: data.hours,
      workDate: data.workDate || todayStr,
      description: data.description,
      activityType: data.activityType,
      billable: data.billable,
      status: 'Pending Approval',
      createdAt: new Date().toISOString(),

      // Compatibility fields for other screens:
      hoursLogged: data.hours,
      activityDate: data.workDate || todayStr,
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '17:00'
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', data.consultantName).maybeSingle();
        const consultantId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        await supabase.from('ticket_efforts').insert({
          id: newEffort.id.startsWith('e-') && newEffort.id.length < 25 ? undefined : newEffort.id,
          ticket_id: data.ticketId,
          consultant_id: consultantId,
          hours_logged: data.hours,
          activity_date: data.workDate || todayStr,
          description: data.description,
          billable: data.billable,
          status: 'Pending Approval'
        });
      } catch (err) {
        console.error('Error in logEffort Supabase update:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === data.ticketId) {
        return {
          ...t,
          efforts: [...(t.efforts || []), newEffort],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Effort Approval Required',
      `${data.consultantName} logged ${data.hours}h on ${data.ticketId}.`,
      data.ticketId
    );
  };

  const approveEffortLog = async (
    ticketId: string,
    logId: string,
    action: 'Approved' | 'Rejected',
    actorName: string,
    rejectionReason?: string
  ) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');
        const dbStatus = action === 'Approved' ? 'Approved' : 'Rejected';

        const updateData: any = {
          status: dbStatus,
          rejection_reason: action === 'Rejected' ? rejectionReason : null
        };
        if (action === 'Approved') {
          updateData.approved_by = actorName;
          updateData.approved_at = new Date().toISOString();
        } else {
          updateData.rejected_by = actorName;
          updateData.rejected_at = new Date().toISOString();
        }

        await supabase.from('ticket_efforts').update(updateData).eq('id', logId);

        if (action === 'Approved') {
          const { data: effortObj } = await supabase.from('ticket_efforts').select('hours_logged').eq('id', logId).maybeSingle();
          const loggedHours = effortObj ? Number(effortObj.hours_logged) : 0;

          if (loggedHours > 0) {
            const ticketObj = tickets.find(t => t.id === ticketId);
            if (ticketObj) {
              const { data: contr } = await supabase.from('customer_contracts').select('id, used_hours').eq('organization_id', ticketObj.organization).maybeSingle();
              if (contr) {
                await supabase.from('customer_contracts').update({
                  used_hours: Number(contr.used_hours) + loggedHours
                }).eq('id', contr.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error in approveEffortLog Supabase update:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        let loggedHours = 0;
        const efforts = (t.efforts || []).map(e => {
          if (e.id === logId) {
            loggedHours = e.hoursWorked || e.hoursLogged || 0;
            const newStatus = action === 'Approved' ? 'Approved' : 'Rejected';
            return {
              ...e,
              status: newStatus as 'Approved' | 'Rejected',
              rejectionReason: action === 'Rejected' ? rejectionReason : e.rejectionReason,
              approvedBy: action === 'Approved' ? actorName : e.approvedBy,
              approvedAt: action === 'Approved' ? new Date().toISOString() : e.approvedAt,
              rejectedBy: action === 'Rejected' ? actorName : e.rejectedBy,
              rejectedAt: action === 'Rejected' ? new Date().toISOString() : e.rejectedAt,
              updatedAt: new Date().toISOString()
            };
          }
          return e;
        });

        // If approved, update contract hour metrics
        if (action === 'Approved' && loggedHours > 0) {
          const updatedContracts = contracts.map(c => {
            if (c.organizationName === t.organization) {
              return {
                ...c,
                usedHours: Number(c.usedHours) + Number(loggedHours)
              };
            }
            return c;
          });
          setContracts(updatedContracts);
          localStorage.setItem('sst_contracts', JSON.stringify(updatedContracts));
        }

        return {
          ...t,
          efforts,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      `Effort log ${action}`,
      `Your timesheet entry for ${ticketId} has been ${action.toLowerCase()} by ${actorName}.${action === 'Rejected' && rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
      ticketId
    );
  };

  const resubmitEffortLog = async (
    ticketId: string,
    logId: string,
    data: {
      hoursWorked: number;
      workDate: string;
      description: string;
      activityType: EffortActivityType;
      billable: boolean;
    }
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newLogId = `e-${Date.now()}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: orig } = await supabase.from('ticket_efforts').select('*').eq('id', logId).maybeSingle();
        if (orig) {
          await supabase.from('ticket_efforts').update({ status: 'Resubmitted' }).eq('id', logId);
          await supabase.from('ticket_efforts').insert({
            id: newLogId,
            ticket_id: ticketId,
            consultant_id: orig.consultant_id,
            hours_logged: data.hoursWorked,
            activity_date: data.workDate,
            description: data.description,
            billable: data.billable,
            status: 'Pending Approval'
          });
        }
      } catch (err) {
        console.error('Error in resubmitEffortLog Supabase update:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const originalLog = t.efforts.find(e => e.id === logId);
        if (!originalLog) return t;

        const efforts = (t.efforts || []).map(e => {
          if (e.id === logId) {
            return {
              ...e,
              status: 'Resubmitted' as const,
              updatedAt: new Date().toISOString()
            };
          }
          return e;
        });

        const newVersionLog: EffortLog = {
          id: newLogId,
          ticketId,
          consultantName: originalLog.consultantName,
          consultantId: originalLog.consultantId,
          hoursWorked: data.hoursWorked,
          workDate: data.workDate,
          description: data.description,
          activityType: data.activityType,
          billable: data.billable,
          status: 'Pending Approval',
          resubmittedFromId: logId,
          createdAt: new Date().toISOString(),
          
          hoursLogged: data.hoursWorked,
          activityDate: data.workDate,
          startTime: '09:00',
          endTime: '17:00'
        };

        return {
          ...t,
          efforts: [...efforts, newVersionLog],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Effort Log Resubmitted',
      `Consultant has resubmitted effort log ${logId} for ticket ${ticketId}.`,
      ticketId
    );
  };

  const resolveTicket = async (
    ticketId: string,
    rootCause: string,
    resolutionSummary: string,
    actorName: string
  ) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');
        const currentTicket = tickets.find(t => t.id === ticketId);

        await supabase.from('tickets').update({
          status: 'Resolved',
          root_cause: rootCause,
          resolution_summary: resolutionSummary,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Status',
          old_value: currentTicket?.status || 'New',
          new_value: 'Resolved'
        });
      } catch (err) {
        console.error('Error resolving ticket in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-resolve-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: 'Resolved',
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          status: 'Resolved' as TicketStatus,
          rootCause,
          resolutionSummary,
          resolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'customer@supportstudio.com',
      'Ticket Resolved',
      `Incidents ${ticketId} has been resolved. Validation required.`,
      ticketId
    );
  };

  const approveClosure = (ticketId: string, actorName: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-closure-approval-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Closure Approved',
            oldValue: 'Approval Pending',
            newValue: 'Approved',
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          approvalRequiredFlag: false,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });
    syncTickets(updated);
  };

  const closeTicket = async (ticketId: string, score: number, feedback: string, actorName: string) => {
    const tObj = tickets.find(t => t.id === ticketId);
    if (!tObj) return;

    if (!score || !feedback) {
      toast.error('Satisfaction rating and feedback are required to close the ticket.');
      return;
    }

    // Check if resources are allocated (consultantEfforts is non-empty)
    const hasAllocatedResources = tObj.consultantEfforts && tObj.consultantEfforts.length > 0;
    if (hasAllocatedResources) {
      // The status must be 'Awaiting Closure', or there must be an approved closure request
      const hasApprovedClosureReq = tObj.closureRequests && tObj.closureRequests.some(r => r.status === 'Approved');
      if (tObj.status !== 'Awaiting Closure' && !hasApprovedClosureReq) {
        toast.error('Cannot close ticket: Actual hours have not been approved yet.');
        return;
      }
    }

    const newRating: SatisfactionRating = {
      id: `r-${Date.now()}`,
      ticketId,
      score,
      feedback,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        await supabase.from('tickets').update({
          status: 'Closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('satisfaction_ratings').insert({
          id: newRating.id.startsWith('r-') && newRating.id.length < 25 ? undefined : newRating.id,
          ticket_id: ticketId,
          score,
          feedback,
          created_at: newRating.createdAt
        });

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Status',
          old_value: tObj.status,
          new_value: 'Closed'
        });
      } catch (err) {
        console.error('Error closing ticket in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-close-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: 'Closed',
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          status: 'Closed' as TicketStatus,
          closedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: newRating,
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Ticket Closed by Client',
      `${actorName} closed ${ticketId} with score ${score}/5.`,
      ticketId
    );
  };

  const reopenTicket = async (ticketId: string, reason: string, actorName: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');
        const currentTicket = tickets.find(t => t.id === ticketId);

        await supabase.from('tickets').update({
          status: 'Reopen Requested',
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Status',
          old_value: currentTicket?.status || 'Closed',
          new_value: 'Reopen Requested'
        });

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Reopen Reason',
          old_value: '',
          new_value: reason
        });
      } catch (err) {
        console.error('Error reopening ticket in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-reopen-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: 'Reopen Requested',
            createdAt: new Date().toISOString()
          },
          {
            id: `h-reopen-reason-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Reopen Reason',
            oldValue: '',
            newValue: reason,
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          status: 'Reopen Requested' as TicketStatus,
          resolvedAt: undefined,
          closedAt: undefined,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Ticket Reopen Requested',
      `Ticket ${ticketId} reopen has been requested by ${actorName}. Reason: ${reason}`,
      ticketId
    );
  };

  const escalateTicket = (ticketId: string, actorName: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-escalate-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Escalation Flag',
            oldValue: 'false',
            newValue: 'true',
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          escalationFlag: true,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Ticket Escalation Alarm',
      `${actorName} escalated ticket ${ticketId}.`,
      ticketId
    );
  };

  const updateTransportRequest = (ticketId: string, transportRequest: string, actorName: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-tr-${Date.now()}`,
            ticketId,
            changedBy: actorName,
            fieldChanged: 'Transport Request',
            oldValue: t.transportRequest || 'None',
            newValue: transportRequest,
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          transportRequest,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });
    syncTickets(updated);
  };

  // --- KNOWLEDGEBASE ACTIONS ---

  const createKbArticle = (data: {
    title: string;
    content: string;
    sapModule: SAPModule;
    categoryId: string;
    isInternal: boolean;
    authorName: string;
  }) => {
    const matchedCategory = kbCategories.find(c => c.id === data.categoryId);
    const categoryName = matchedCategory ? matchedCategory.name : 'General Guides';
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newArticle: KnowledgebaseArticle = {
      id: `kb-${Date.now()}`,
      categoryId: data.categoryId,
      categoryName,
      title: data.title,
      slug,
      content: data.content,
      sapModule: data.sapModule,
      isInternal: data.isInternal,
      authorName: data.authorName,
      ratingsCount: 0,
      ratingsSum: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newArticle, ...kbArticles];
    syncKbArticles(updated);
  };

  const rateKbArticle = (articleId: string, score: number) => {
    const updated = kbArticles.map(a => {
      if (a.id === articleId) {
        return {
          ...a,
          ratingsCount: a.ratingsCount + 1,
          ratingsSum: a.ratingsSum + score,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    });
    syncKbArticles(updated);
  };

  // --- SYSTEM NOTIFICATIONS ---

  const markNotificationRead = (notificationId: string) => {
    const updated = notifications.map(n => {
      if (n.id === notificationId) {
        return { ...n, isRead: true };
      }
      return n;
    });
    syncNotifications(updated);
  };

  const createSystemNotification = (userId: string, title: string, message: string, ticketId?: string) => {
    const newNotif: Notification = {
      id: `n-${Date.now()}`,
      userId,
      title,
      message,
      ticketId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    const updated = [newNotif, ...notifications];
    syncNotifications(updated);
    
    // Trigger toast notification
    toast(title, {
      description: message,
      action: ticketId ? {
        label: 'View Ticket',
        onClick: () => {
          window.location.href = `/manager/tickets/${ticketId}`;
        }
      } : undefined
    });
  };

  // --- AI CHATBOT / ADVISOR PLACEHOLDER LOGIC ---

  const getChatResponse = async (
    sapModule: SAPModule,
    userMessage: string
  ): Promise<{
    message: string;
    suggestedPriority?: TicketPriority;
    suggestedRootCause?: string;
    suggestedResolution?: string;
    suggestedArticle?: KnowledgebaseArticle;
  }> => {
    await new Promise(resolve => setTimeout(resolve, 400));

    const msg = userMessage.toLowerCase();
    let prioritySuggestion: TicketPriority = 'Medium';
    let rootCauseSuggestion = 'Standard configuration misalignment or missing transaction conditions.';
    let resolutionSuggestion = 'Verify SAP configuration records in transaction SPRO. Check active conditions.';
    let matchArticle = kbArticles.find(a => a.sapModule === sapModule);

    if (msg.includes('production') || msg.includes('prd') || msg.includes('down') || msg.includes('failure') || msg.includes('block')) {
      prioritySuggestion = 'Critical';
      rootCauseSuggestion = 'Severe process blocking event or failed transaction workflow mapping.';
      resolutionSuggestion = 'Rerun workflow diagnosis (SWI1). Clear locks in SM12 and check system process health in SM50.';
    } else if (msg.includes('enhancement') || msg.includes('add field') || msg.includes('custom')) {
      prioritySuggestion = 'Medium';
      rootCauseSuggestion = 'Functional extension request requiring custom ABAP code or dictionary extensions.';
      resolutionSuggestion = 'Append custom ZZ_ attributes in SE11. Implement standard exit program in RV60AFZZ.';
    }

    const faqs = FAQ_MOCK[sapModule] || [];
    const moduleFaqStr = faqs.map(f => `* ${f}`).join('\n');

    let chatReply = `Based on your query regarding SAP Module **${sapModule}**, here is my analysis:

I have found some matches in our Support Desk database. 

**Recommended Action Steps:**
1. Check standard transactions for your request (e.g. SPRO customization or STMS transport queues).
2. Validate user roles or missing authorization variables via PFCG.

**Here are some SAP Module FAQ items you might find useful:**
${moduleFaqStr || '* No FAQ listed for this module. Refer to BASIS admin.'}
`;

    if (matchArticle) {
      chatReply += `\n\nI also suggest reading the knowledgebase article: **"${matchArticle.title}"** (SAP Module: ${sapModule}).`;
    }

    return {
      message: chatReply,
      suggestedPriority: prioritySuggestion,
      suggestedRootCause: rootCauseSuggestion,
      suggestedResolution: resolutionSuggestion,
      suggestedArticle: matchArticle
    };
  };

  const updateTicket = async (ticketId: string, data: Partial<Ticket>) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const currentTicket = tickets.find(t => t.id === ticketId);
        const changedBy = data.requestedBy || 'System';
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', changedBy).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        const dbUpdate: any = {};
        if (data.title !== undefined) dbUpdate.title = data.title;
        if (data.description !== undefined) dbUpdate.description = data.description;
        if (data.priority !== undefined) dbUpdate.priority = data.priority;
        if (data.status !== undefined) dbUpdate.status = data.status;
        if (data.sapModule !== undefined) dbUpdate.sap_module = data.sapModule;
        if (data.category !== undefined) dbUpdate.category = data.category;
        if (data.ticketType !== undefined) dbUpdate.ticket_type = data.ticketType;
        if (data.functionalOrTechnical !== undefined) dbUpdate.functional_or_technical = data.functionalOrTechnical;
        if (data.businessImpact !== undefined) dbUpdate.business_impact = data.businessImpact;
        if (data.expectedResolutionDate !== undefined) dbUpdate.expected_resolution_date = data.expectedResolutionDate;
        
        dbUpdate.updated_at = new Date().toISOString();

        await supabase.from('tickets').update(dbUpdate).eq('id', ticketId);

        if (data.title && data.title !== currentTicket?.title) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Title',
            old_value: currentTicket?.title || '',
            new_value: data.title
          });
        }
        if (data.description && data.description !== currentTicket?.description) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Description',
            old_value: currentTicket?.description || '',
            new_value: data.description
          });
        }
        if (data.status && data.status !== currentTicket?.status) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Status',
            old_value: currentTicket?.status || '',
            new_value: data.status
          });
        }
      } catch (err) {
        console.error('Error updating ticket in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [...t.history];
        const changedBy = data.requestedBy || 'Customer';
        if (data.title && data.title !== t.title) {
          hist.push({
            id: `h-edit-title-${Date.now()}`,
            ticketId,
            changedBy,
            fieldChanged: 'Title',
            oldValue: t.title,
            newValue: data.title,
            createdAt: new Date().toISOString()
          });
        }
        if (data.description && data.description !== t.description) {
          hist.push({
            id: `h-edit-desc-${Date.now()}`,
            ticketId,
            changedBy,
            fieldChanged: 'Description',
            oldValue: t.description,
            newValue: data.description,
            createdAt: new Date().toISOString()
          });
        }
        if (data.status && data.status !== t.status) {
          hist.push({
            id: `h-edit-status-${Date.now()}`,
            ticketId,
            changedBy,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: data.status,
            createdAt: new Date().toISOString()
          });
        }
        return {
          ...t,
          ...data,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });
    syncTickets(updated);
  };

  const requestDelete = async (ticketId: string, reason: string, requester: string) => {
    const newDeleteRequest = {
      id: `dr-${Date.now()}`,
      ticketId,
      requestedBy: requester,
      requestedAt: new Date().toISOString(),
      reason,
      managerApproval: 'Pending' as const,
      adminApproval: 'Pending' as const,
      finalStatus: 'Pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', requester).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        await supabase.from('ticket_delete_requests').insert({
          id: newDeleteRequest.id.startsWith('dr-') && newDeleteRequest.id.length < 25 ? undefined : newDeleteRequest.id,
          ticket_id: ticketId,
          requested_by: actorId,
          reason,
          manager_approval: 'Pending',
          admin_approval: 'Pending',
          final_status: 'Pending'
        });

        await supabase.from('tickets').update({
          soft_delete_status: 'Pending Delete',
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Soft Delete Status',
          old_value: 'Active',
          new_value: 'Pending Delete'
        });
      } catch (err) {
        console.error('Error requesting delete in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const currentRequests = t.deleteRequests || [];
        const hist = [
          ...t.history,
          {
            id: `h-del-req-${Date.now()}`,
            ticketId,
            changedBy: requester,
            fieldChanged: 'Soft Delete Status',
            oldValue: t.softDeleteStatus || 'Active',
            newValue: 'Pending Delete',
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          softDeleteStatus: 'Pending Delete' as const,
          deleteRequests: [...currentRequests, newDeleteRequest],
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      `Soft Delete Request: ${ticketId}`,
      `A soft delete request was submitted by ${requester}. Reason: ${reason}`,
      ticketId
    );
  };

  const quoteEstimatedHours = async (
    ticketId: string,
    data: {
      functionalEstimatedHours: number;
      technicalEstimatedHours: number;
      remarks: string;
      submittedBy: string;
    }
  ) => {
    const total = data.functionalEstimatedHours + data.technicalEstimatedHours;
    let consultantUUID = user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5';
    let consultantType: 'Functional' | 'Technical' = 'Functional';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id, consultant_type').eq('full_name', data.submittedBy).maybeSingle();
        if (prof) {
          consultantUUID = prof.id;
          consultantType = (prof.consultant_type as any) || 'Functional';
        }
      } catch (err) {
        console.error('Error resolving profile for estimate:', err);
      }
    }

    const newEstimate: TicketHourEstimate = {
      id: `est-${Date.now()}`,
      ticketId,
      consultantId: data.submittedBy,
      functionalEstimatedHours: data.functionalEstimatedHours,
      technicalEstimatedHours: data.technicalEstimatedHours,
      totalEstimatedHours: total,
      remarks: data.remarks,
      status: 'Revision Approved',
      submittedAt: new Date().toISOString(),
      approvedBy: 'Auto-Approved',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newEfforts: TicketConsultantEffort[] = [];
    if (data.functionalEstimatedHours > 0) {
      newEfforts.push({
        id: `eff-${Date.now()}-f`,
        ticketId,
        consultantId: consultantUUID,
        consultantName: data.submittedBy,
        consultantType: 'Functional',
        estimatedHours: data.functionalEstimatedHours,
        actualHours: 0,
        remarks: 'Initial quote',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    if (data.technicalEstimatedHours > 0) {
      newEfforts.push({
        id: `eff-${Date.now()}-t`,
        ticketId,
        consultantId: consultantUUID,
        consultantName: data.submittedBy,
        consultantType: 'Technical',
        estimatedHours: data.technicalEstimatedHours,
        actualHours: 0,
        remarks: 'Initial quote',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ticket_hour_estimates').insert({
          id: newEstimate.id.startsWith('est-') && newEstimate.id.length < 25 ? undefined : newEstimate.id,
          ticket_id: ticketId,
          consultant_id: consultantUUID,
          functional_estimated_hours: data.functionalEstimatedHours,
          technical_estimated_hours: data.technicalEstimatedHours,
          total_estimated_hours: total,
          remarks: data.remarks,
          status: 'Revision Approved',
          submitted_at: newEstimate.submittedAt,
          approved_by: 'Auto-Approved',
          approved_at: newEstimate.approvedAt
        });

        await supabase.from('tickets').update({
          quoted_hours: total,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantUUID,
          field_changed: 'Estimated Hours Quoted',
          old_value: '0',
          new_value: `${total} (Func: ${data.functionalEstimatedHours}, Tech: ${data.technicalEstimatedHours})`
        });

        for (const eff of newEfforts) {
          const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', consultantUUID)
            .eq('consultant_type', eff.consultantType)
            .eq('is_deleted', false)
            .maybeSingle();

          if (existingEff) {
            await supabase.from('ticket_consultant_efforts').update({
              estimated_hours: eff.estimatedHours,
              remarks: 'Initial quote',
              updated_at: new Date().toISOString()
            }).eq('id', existingEff.id);
          } else {
            await supabase.from('ticket_consultant_efforts').insert({
              id: eff.id.startsWith('eff-') && eff.id.length < 25 ? undefined : eff.id,
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: eff.consultantType,
              estimated_hours: eff.estimatedHours,
              actual_hours: 0,
              remarks: 'Initial quote'
            });
          }
        }
      } catch (err) {
        console.error('Error quoting hours in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-est-quote-${Date.now()}`,
            ticketId,
            changedBy: data.submittedBy,
            fieldChanged: 'Estimated Hours Quoted',
            oldValue: '0',
            newValue: `${total} (Func: ${data.functionalEstimatedHours}, Tech: ${data.technicalEstimatedHours})`,
            createdAt: new Date().toISOString()
          }
        ];

        let mergedEfforts = [...(t.consultantEfforts || [])];
        newEfforts.forEach(ne => {
          const idx = mergedEfforts.findIndex(e => e.consultantId === ne.consultantId && e.consultantType === ne.consultantType && !e.isDeleted);
          if (idx >= 0) {
            mergedEfforts[idx] = {
              ...mergedEfforts[idx],
              estimatedHours: ne.estimatedHours,
              updatedAt: new Date().toISOString()
            };
          } else {
            mergedEfforts.push(ne);
          }
        });

        return {
          ...t,
          status: t.status,
          quotedHours: total,
          hourEstimates: [...(t.hourEstimates || []), newEstimate],
          consultantEfforts: mergedEfforts,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Initial Estimate Submitted',
      `Consultant ${data.submittedBy} submitted initial estimate of ${total} hrs for ticket ${ticketId}.`,
      ticketId
    );
  };

  const requestEstimateRevision = async (
    ticketId: string,
    data: {
      functionalEstimatedHours: number;
      technicalEstimatedHours: number;
      remarks: string;
      submittedBy: string;
    }
  ) => {
    const total = data.functionalEstimatedHours + data.technicalEstimatedHours;
    let consultantUUID = user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5';
    let consultantType: 'Functional' | 'Technical' = 'Functional';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id, consultant_type').eq('full_name', data.submittedBy).maybeSingle();
        if (prof) {
          consultantUUID = prof.id;
          consultantType = (prof.consultant_type as any) || 'Functional';
        }
      } catch (err) {
        console.error('Error resolving profile for estimate revision:', err);
      }
    }

    const newEstimate: TicketHourEstimate = {
      id: `est-${Date.now()}`,
      ticketId,
      consultantId: data.submittedBy,
      functionalEstimatedHours: data.functionalEstimatedHours,
      technicalEstimatedHours: data.technicalEstimatedHours,
      totalEstimatedHours: total,
      remarks: data.remarks,
      status: 'Revision Approved',
      submittedAt: new Date().toISOString(),
      approvedBy: 'Auto-Approved',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newEfforts: TicketConsultantEffort[] = [];
    if (data.functionalEstimatedHours > 0) {
      newEfforts.push({
        id: `eff-${Date.now()}-f`,
        ticketId,
        consultantId: consultantUUID,
        consultantName: data.submittedBy,
        consultantType: 'Functional',
        estimatedHours: data.functionalEstimatedHours,
        actualHours: 0,
        remarks: 'Revised quote',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    if (data.technicalEstimatedHours > 0) {
      newEfforts.push({
        id: `eff-${Date.now()}-t`,
        ticketId,
        consultantId: consultantUUID,
        consultantName: data.submittedBy,
        consultantType: 'Technical',
        estimatedHours: data.technicalEstimatedHours,
        actualHours: 0,
        remarks: 'Revised quote',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ticket_hour_estimates').insert({
          id: newEstimate.id.startsWith('est-') && newEstimate.id.length < 25 ? undefined : newEstimate.id,
          ticket_id: ticketId,
          consultant_id: consultantUUID,
          functional_estimated_hours: data.functionalEstimatedHours,
          technical_estimated_hours: data.technicalEstimatedHours,
          total_estimated_hours: total,
          remarks: data.remarks,
          status: 'Revision Approved',
          submitted_at: newEstimate.submittedAt,
          approved_by: 'Auto-Approved',
          approved_at: newEstimate.approvedAt
        });

        await supabase.from('tickets').update({
          quoted_hours: total,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantUUID,
          field_changed: 'Estimated Hours Quoted',
          old_value: `${tickets.find(t => t.id === ticketId)?.quotedHours || 0}`,
          new_value: `${total} (Func: ${data.functionalEstimatedHours}, Tech: ${data.technicalEstimatedHours})`
        });

        for (const eff of newEfforts) {
          const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', consultantUUID)
            .eq('consultant_type', eff.consultantType)
            .eq('is_deleted', false)
            .maybeSingle();

          if (existingEff) {
            await supabase.from('ticket_consultant_efforts').update({
              estimated_hours: eff.estimatedHours,
              remarks: 'Revised quote',
              updated_at: new Date().toISOString()
            }).eq('id', existingEff.id);
          } else {
            await supabase.from('ticket_consultant_efforts').insert({
              id: eff.id.startsWith('eff-') && eff.id.length < 25 ? undefined : eff.id,
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: eff.consultantType,
              estimated_hours: eff.estimatedHours,
              actual_hours: 0,
              remarks: 'Revised quote'
            });
          }
        }
      } catch (err) {
        console.error('Error requesting estimate revision in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-est-rev-req-${Date.now()}`,
            ticketId,
            changedBy: data.submittedBy,
            fieldChanged: 'Estimated Hours Quoted',
            oldValue: `${t.quotedHours || 0}`,
            newValue: `${total} (Func: ${data.functionalEstimatedHours}, Tech: ${data.technicalEstimatedHours})`,
            createdAt: new Date().toISOString()
          }
        ];

        let mergedEfforts = [...(t.consultantEfforts || [])];
        newEfforts.forEach(ne => {
          const idx = mergedEfforts.findIndex(e => e.consultantId === ne.consultantId && e.consultantType === ne.consultantType && !e.isDeleted);
          if (idx >= 0) {
            mergedEfforts[idx] = {
              ...mergedEfforts[idx],
              estimatedHours: ne.estimatedHours,
              updatedAt: new Date().toISOString()
            };
          } else {
            mergedEfforts.push(ne);
          }
        });

        return {
          ...t,
          status: t.status,
          quotedHours: total,
          hourEstimates: [...(t.hourEstimates || []), newEstimate],
          consultantEfforts: mergedEfforts,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Estimate Revision Submitted',
      `Consultant ${data.submittedBy} updated estimate revision for ticket ${ticketId} to ${total} hrs.`,
      ticketId
    );
  };

  const approveRevisionRequest = async (ticketId: string, estimateId: string, managerName: string) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    const targetStatus: TicketStatus = currentTicket?.functionalOrTechnical === 'Technical' ? 'In Progress - Technical' : 'In Progress - Functional';

    let revisedTotal = currentTicket?.quotedHours || 0;
    let revisedFunc = 0;
    let revisedTech = 0;
    let consultantName = 'Consultant';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
        const managerId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        const estObj = currentTicket?.hourEstimates?.find(e => e.id === estimateId);
        if (estObj) {
          revisedTotal = estObj.totalEstimatedHours;
          revisedFunc = estObj.functionalEstimatedHours;
          revisedTech = estObj.technicalEstimatedHours;
          consultantName = estObj.consultantId;

          await supabase.from('ticket_hour_estimates').update({
            status: 'Revision Approved',
            approved_by: managerName,
            approved_at: new Date().toISOString()
          }).eq('id', estimateId);

          await supabase.from('tickets').update({
            status: targetStatus,
            quoted_hours: revisedTotal,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: managerId,
            field_changed: 'Status',
            old_value: currentTicket?.status || 'Waiting for Hours Approval',
            new_value: targetStatus
          });

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: managerId,
            field_changed: 'Estimate Revision Approved',
            old_value: `${currentTicket?.quotedHours || 0}`,
            new_value: `${revisedTotal}`
          });

          const { data: consProf } = await supabase.from('profiles').select('id').eq('full_name', consultantName).maybeSingle();
          const consultantUUID = consProf ? consProf.id : consultantName;

          if (revisedFunc > 0) {
            const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
              .select('id')
              .eq('ticket_id', ticketId)
              .eq('consultant_id', consultantUUID)
              .eq('consultant_type', 'Functional')
              .maybeSingle();

            if (existingEff) {
              await supabase.from('ticket_consultant_efforts').update({
                estimated_hours: revisedFunc,
                updated_at: new Date().toISOString()
              }).eq('id', existingEff.id);
            } else {
              await supabase.from('ticket_consultant_efforts').insert({
                ticket_id: ticketId,
                consultant_id: consultantUUID,
                consultant_type: 'Functional',
                estimated_hours: revisedFunc,
                actual_hours: 0
              });
            }
          }

          if (revisedTech > 0) {
            const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
              .select('id')
              .eq('ticket_id', ticketId)
              .eq('consultant_id', consultantUUID)
              .eq('consultant_type', 'Technical')
              .maybeSingle();

            if (existingEff) {
              await supabase.from('ticket_consultant_efforts').update({
                estimated_hours: revisedTech,
                updated_at: new Date().toISOString()
              }).eq('id', existingEff.id);
            } else {
              await supabase.from('ticket_consultant_efforts').insert({
                ticket_id: ticketId,
                consultant_id: consultantUUID,
                consultant_type: 'Technical',
                estimated_hours: revisedTech,
                actual_hours: 0
              });
            }
          }
        }
      } catch (err) {
        console.error('Error approving estimate revision in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hourEstimates = (t.hourEstimates || []).map(est => {
          if (est.id === estimateId) {
            revisedTotal = est.totalEstimatedHours;
            revisedFunc = est.functionalEstimatedHours;
            revisedTech = est.technicalEstimatedHours;
            return {
              ...est,
              status: 'Revision Approved' as const,
              approvedBy: managerName,
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return est;
        });

        const currentEfforts = t.consultantEfforts || [];
        const updatedEfforts = [...currentEfforts];
        const consultantId = hourEstimates.find(e => e.id === estimateId)?.consultantId || 'Consultant';
        
        if (revisedFunc > 0) {
          const fEffortIdx = updatedEfforts.findIndex(e => e.consultantId === consultantId && e.consultantType === 'Functional');
          if (fEffortIdx > -1) {
            updatedEfforts[fEffortIdx] = {
              ...updatedEfforts[fEffortIdx],
              estimatedHours: revisedFunc,
              updatedAt: new Date().toISOString()
            };
          } else {
            updatedEfforts.push({
              id: `eff-${Date.now()}-f`,
              ticketId,
              consultantId,
              consultantName: consultantId,
              consultantType: 'Functional',
              estimatedHours: revisedFunc,
              actualHours: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        if (revisedTech > 0) {
          const tEffortIdx = updatedEfforts.findIndex(e => e.consultantId === consultantId && e.consultantType === 'Technical');
          if (tEffortIdx > -1) {
            updatedEfforts[tEffortIdx] = {
              ...updatedEfforts[tEffortIdx],
              estimatedHours: revisedTech,
              updatedAt: new Date().toISOString()
            };
          } else {
            updatedEfforts.push({
              id: `eff-${Date.now()}-t`,
              ticketId,
              consultantId,
              consultantName: consultantId,
              consultantType: 'Technical',
              estimatedHours: revisedTech,
              actualHours: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        const hist = [
          ...t.history,
          {
            id: `h-est-rev-app-status-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: targetStatus,
            createdAt: new Date().toISOString()
          },
          {
            id: `h-est-rev-app-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Estimate Revision Approved',
            oldValue: `${t.quotedHours || 0}`,
            newValue: `${revisedTotal}`,
            createdAt: new Date().toISOString()
          }
        ];

        return {
          ...t,
          status: targetStatus,
          quotedHours: revisedTotal,
          hourEstimates,
          consultantEfforts: updatedEfforts,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Estimate Revision Approved',
      `Your estimate revision request has been approved by ${managerName}.`,
      ticketId
    );
  };

  const rejectRevisionRequest = async (ticketId: string, estimateId: string, managerName: string, rejectionReason: string) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    const targetStatus: TicketStatus = currentTicket?.functionalOrTechnical === 'Technical' ? 'In Progress - Technical' : 'In Progress - Functional';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
        const managerId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        await supabase.from('ticket_hour_estimates').update({
          status: 'Revision Rejected',
          rejected_by: managerName,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        }).eq('id', estimateId);

        await supabase.from('tickets').update({
          status: targetStatus,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Status',
          old_value: currentTicket?.status || 'Waiting for Hours Approval',
          new_value: targetStatus
        });

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Estimate Revision Rejected',
          old_value: '',
          new_value: rejectionReason
        });
      } catch (err) {
        console.error('Error rejecting estimate revision in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hourEstimates = (t.hourEstimates || []).map(est => {
          if (est.id === estimateId) {
            return {
              ...est,
              status: 'Revision Rejected' as const,
              rejectedBy: managerName,
              rejectedAt: new Date().toISOString(),
              rejectionReason,
              updatedAt: new Date().toISOString()
            };
          }
          return est;
        });

        const hist = [
          ...t.history,
          {
            id: `h-est-rev-rej-status-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: targetStatus,
            createdAt: new Date().toISOString()
          },
          {
            id: `h-est-rev-rej-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Estimate Revision Rejected',
            oldValue: '',
            newValue: rejectionReason,
            createdAt: new Date().toISOString()
          }
        ];

        return {
          ...t,
          status: targetStatus,
          hourEstimates,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Estimate Revision Rejected',
      `Your estimate revision request was rejected by ${managerName}. Reason: ${rejectionReason}`,
      ticketId
    );
  };

  const raiseClosureRequest = async (
    ticketId: string,
    data: {
      functionalActualHours: number;
      technicalActualHours: number;
      workCompletedSummary: string;
      rootCause: string;
      resolutionSummary: string;
      pendingItems?: string;
      requestedBy: string;
    }
  ) => {
    let consultantId = user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5';
    let consultantType: 'Functional' | 'Technical' = 'Functional';
    let consultantName = data.requestedBy;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id, consultant_type, full_name').eq('full_name', data.requestedBy).maybeSingle();
        if (prof) {
          consultantId = prof.id;
          consultantType = (prof.consultant_type as any) || 'Functional';
          consultantName = prof.full_name;
        }
      } catch (err) {
        console.error('Error resolving profile:', err);
      }
    }

    const actualHoursToLog = consultantType === 'Functional' ? data.functionalActualHours : data.technicalActualHours;
    const workSummaryToLog = data.workCompletedSummary;
    const resolutionNotesToLog = data.resolutionSummary;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: allocations } = await supabase
          .from('ticket_consultant_efforts')
          .select('id')
          .eq('ticket_id', ticketId)
          .eq('consultant_id', consultantId)
          .eq('is_deleted', false)
          .maybeSingle();

        if (allocations) {
          await supabase
            .from('ticket_consultant_efforts')
            .update({
              actual_hours: actualHoursToLog,
              closure_status: 'Submitted',
              work_summary: workSummaryToLog,
              resolution_notes: resolutionNotesToLog,
              updated_at: new Date().toISOString()
            })
            .eq('id', allocations.id);
        } else {
          await supabase
            .from('ticket_consultant_efforts')
            .insert({
              ticket_id: ticketId,
              consultant_id: consultantId,
              consultant_type: consultantType,
              estimated_hours: 0,
              actual_hours: actualHoursToLog,
              closure_status: 'Submitted',
              work_summary: workSummaryToLog,
              resolution_notes: resolutionNotesToLog
            });
        }
      } catch (err) {
        console.error('Error updating consultant effort details:', err);
      }
    }

    let dbAllocations: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: allAlloc } = await supabase
          .from('ticket_consultant_efforts')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('is_deleted', false);
        if (allAlloc) {
          dbAllocations = allAlloc;
        }
      } catch (err) {
        console.error('Error fetching allocations:', err);
      }
    }

    if (dbAllocations.length === 0) {
      const currentTicket = tickets.find(t => t.id === ticketId);
      dbAllocations = (currentTicket?.consultantEfforts || []).map(e => ({
        id: e.id,
        consultant_id: e.consultantId,
        consultant_name: e.consultantName,
        consultant_type: e.consultantType,
        estimated_hours: e.estimatedHours,
        actual_hours: e.consultantId === consultantId ? actualHoursToLog : e.actualHours,
        closure_status: e.consultantId === consultantId ? 'Submitted' : (e.closureStatus || 'Pending'),
        work_summary: e.consultantId === consultantId ? workSummaryToLog : (e.workSummary || ''),
        resolution_notes: e.consultantId === consultantId ? resolutionNotesToLog : (e.resolutionNotes || '')
      }));
    }

    const activeAllocations = dbAllocations.filter((e: any) => !(e.is_deleted || e.isDeleted));

    const hasFunctional = activeAllocations.some((e: any) => (e.consultant_type || e.consultantType) === 'Functional');
    const hasTechnical = activeAllocations.some((e: any) => (e.consultant_type || e.consultantType) === 'Technical');

    const functionalAllocations = activeAllocations.filter((e: any) => (e.consultant_type || e.consultantType) === 'Functional');
    const technicalAllocations = activeAllocations.filter((e: any) => (e.consultant_type || e.consultantType) === 'Technical');

    const allFunctionalSubmitted = functionalAllocations.length > 0 && functionalAllocations.every((e: any) => (e.closure_status || e.closureStatus) === 'Submitted');
    const allTechnicalSubmitted = technicalAllocations.length > 0 && technicalAllocations.every((e: any) => (e.closure_status || e.closureStatus) === 'Submitted');

    let nextStatus: TicketStatus = 'Awaiting Closure';
    if (hasFunctional && hasTechnical) {
      if (allFunctionalSubmitted && allTechnicalSubmitted) {
        nextStatus = 'Request for Closure';
      } else if (allTechnicalSubmitted && !allFunctionalSubmitted) {
        nextStatus = 'Awaiting Functional Submission';
      } else if (allFunctionalSubmitted && !allTechnicalSubmitted) {
        nextStatus = 'Awaiting Technical Submission';
      } else {
        nextStatus = 'Awaiting Closure';
      }
    } else if (hasFunctional || hasTechnical) {
      const allSubmitted = activeAllocations.every((e: any) => (e.closure_status || e.closureStatus) === 'Submitted');
      if (allSubmitted) {
        nextStatus = 'Request for Closure';
      } else {
        nextStatus = 'Awaiting Closure';
      }
    } else {
      nextStatus = 'Request for Closure';
    }

    let newRequest: TicketClosureRequest | null = null;
    let totalFuncActual = 0;
    let totalTechActual = 0;

    if (nextStatus === 'Request for Closure') {
      dbAllocations.forEach((e: any) => {
        const type = e.consultant_type || e.consultantType;
        const hrs = Number(e.actual_hours || e.actualHours || 0);
        if (type === 'Functional') {
          totalFuncActual += hrs;
        } else {
          totalTechActual += hrs;
        }
      });

      const grandTotal = totalFuncActual + totalTechActual;
      const summaries = dbAllocations
        .map((e: any) => `${e.consultant_name || e.consultantName} (${e.consultant_type || e.consultantType}): ${e.work_summary || e.workSummary || 'No summary'}`)
        .join('\n\n');

      const notes = dbAllocations
        .map((e: any) => `${e.consultant_name || e.consultantName} (${e.consultant_type || e.consultantType}): ${e.resolution_notes || e.resolutionNotes || 'No notes'}`)
        .join('\n\n');

      newRequest = {
        id: `cls-${Date.now()}`,
        ticketId,
        requestedBy: consultantName,
        functionalActualHours: totalFuncActual,
        technicalActualHours: totalTechActual,
        totalActualHours: grandTotal,
        workCompletedSummary: summaries,
        rootCause: data.rootCause || 'SAP Configuration/Process Alignment',
        resolutionSummary: notes,
        pendingItems: data.pendingItems,
        status: 'Pending Manager Approval',
        managerApprovalStatus: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('ticket_closure_requests').insert({
            id: newRequest.id,
            ticket_id: ticketId,
            requested_by: consultantId,
            functional_actual_hours: totalFuncActual,
            technical_actual_hours: totalTechActual,
            total_actual_hours: grandTotal,
            work_completed_summary: summaries,
            root_cause: data.rootCause || 'SAP Configuration/Process Alignment',
            resolution_summary: notes,
            pending_items: data.pendingItems || null,
            status: 'Pending Manager Approval',
            manager_approval_status: 'Pending'
          });

          await supabase.from('tickets').update({
            status: 'Request for Closure',
            root_cause: data.rootCause || null,
            resolution_summary: notes,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Status',
            old_value: tickets.find(t => t.id === ticketId)?.status || 'In Progress',
            new_value: 'Request for Closure'
          });

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Actual Hours Submitted',
            old_value: '0',
            new_value: `${grandTotal} (Func: ${totalFuncActual}, Tech: ${totalTechActual})`
          });
        } catch (err) {
          console.error('Error creating unified closure request:', err);
        }
      }
    } else {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('tickets').update({
            status: nextStatus,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Status',
            old_value: tickets.find(t => t.id === ticketId)?.status || 'In Progress',
            new_value: nextStatus
          });

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Consultant Closure Submitted',
            old_value: 'Pending',
            new_value: `Submitted by ${consultantName} (${consultantType})`
          });
        } catch (err) {
          console.error('Error updating status to nextStatus:', err);
        }
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const updatedEfforts = (t.consultantEfforts || []).map(eff => {
          if (eff.consultantId === consultantId) {
            return {
              ...eff,
              actualHours: actualHoursToLog,
              closureStatus: 'Submitted' as const,
              workSummary: workSummaryToLog,
              resolutionNotes: resolutionNotesToLog,
              updatedAt: new Date().toISOString()
            };
          }
          return eff;
        });

        const hasEffort = updatedEfforts.some(e => e.consultantId === consultantId);
        if (!hasEffort) {
          updatedEfforts.push({
            id: `eff-${Date.now()}`,
            ticketId,
            consultantId,
            consultantName,
            consultantType,
            estimatedHours: 0,
            actualHours: actualHoursToLog,
            closureStatus: 'Submitted',
            workSummary: workSummaryToLog,
            resolutionNotes: resolutionNotesToLog,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        const hist = [...t.history];
        hist.push({
          id: `h-cls-log-${Date.now()}`,
          ticketId,
          changedBy: consultantName,
          fieldChanged: nextStatus === 'Request for Closure' ? 'Status' : 'Consultant Closure Submitted',
          oldValue: t.status,
          newValue: nextStatus,
          createdAt: new Date().toISOString()
        });

        return {
          ...t,
          status: nextStatus,
          consultantEfforts: updatedEfforts,
          closureRequests: newRequest ? [...(t.closureRequests || []), newRequest] : (t.closureRequests || []),
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    if (nextStatus === 'Request for Closure') {
      createSystemNotification(
        'manager@supportstudio.com',
        'Closure Request Raised',
        `All allocated consultants on ticket ${ticketId} have submitted actual hours. Awaiting Manager Approval.`,
        ticketId
      );
    } else {
      createSystemNotification(
        'manager@supportstudio.com',
        'Consultant Closure Submitted',
        `${consultantName} has submitted actual hours. Ticket is awaiting remaining allocations to complete closure.`,
        ticketId
      );
    }
  };

  const resubmitClosureRequest = async (
    ticketId: string,
    requestId: string,
    data: {
      functionalActualHours: number;
      technicalActualHours: number;
      workCompletedSummary: string;
      rootCause: string;
      resolutionSummary: string;
      pendingItems?: string;
      requestedBy: string;
    }
  ) => {
    let consultantId = user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5';
    let consultantType: 'Functional' | 'Technical' = 'Functional';
    let consultantName = data.requestedBy;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id, consultant_type, full_name').eq('full_name', data.requestedBy).maybeSingle();
        if (prof) {
          consultantId = prof.id;
          consultantType = (prof.consultant_type as any) || 'Functional';
          consultantName = prof.full_name;
        }
      } catch (err) {
        console.error('Error resolving profile:', err);
      }
    }

    const actualHoursToLog = consultantType === 'Functional' ? data.functionalActualHours : data.technicalActualHours;
    const workSummaryToLog = data.workCompletedSummary;
    const resolutionNotesToLog = data.resolutionSummary;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: allocations } = await supabase
          .from('ticket_consultant_efforts')
          .select('id')
          .eq('ticket_id', ticketId)
          .eq('consultant_id', consultantId)
          .eq('is_deleted', false)
          .maybeSingle();

        if (allocations) {
          await supabase
            .from('ticket_consultant_efforts')
            .update({
              actual_hours: actualHoursToLog,
              closure_status: 'Submitted',
              work_summary: workSummaryToLog,
              resolution_notes: resolutionNotesToLog,
              updated_at: new Date().toISOString()
            })
            .eq('id', allocations.id);
        }
      } catch (err) {
        console.error('Error updating consultant effort details:', err);
      }
    }

    let dbAllocations: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: allAlloc } = await supabase
          .from('ticket_consultant_efforts')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('is_deleted', false);
        if (allAlloc) {
          dbAllocations = allAlloc;
        }
      } catch (err) {
        console.error('Error fetching allocations:', err);
      }
    }

    if (dbAllocations.length === 0) {
      const currentTicket = tickets.find(t => t.id === ticketId);
      dbAllocations = (currentTicket?.consultantEfforts || []).map(e => ({
        id: e.id,
        consultant_id: e.consultantId,
        consultant_name: e.consultantName,
        consultant_type: e.consultantType,
        estimated_hours: e.estimatedHours,
        actual_hours: e.consultantId === consultantId ? actualHoursToLog : e.actualHours,
        closure_status: e.consultantId === consultantId ? 'Submitted' : (e.closureStatus || 'Pending'),
        work_summary: e.consultantId === consultantId ? workSummaryToLog : (e.workSummary || ''),
        resolution_notes: e.consultantId === consultantId ? resolutionNotesToLog : (e.resolutionNotes || '')
      }));
    }

    const activeAllocations = dbAllocations.filter((e: any) => !(e.is_deleted || e.isDeleted));

    const hasFunctional = activeAllocations.some((e: any) => (e.consultant_type || e.consultantType) === 'Functional');
    const hasTechnical = activeAllocations.some((e: any) => (e.consultant_type || e.consultantType) === 'Technical');

    const functionalAllocations = activeAllocations.filter((e: any) => (e.consultant_type || e.consultantType) === 'Functional');
    const technicalAllocations = activeAllocations.filter((e: any) => (e.consultant_type || e.consultantType) === 'Technical');

    const allFunctionalSubmitted = functionalAllocations.length > 0 && functionalAllocations.every((e: any) => (e.closure_status || e.closureStatus) === 'Submitted');
    const allTechnicalSubmitted = technicalAllocations.length > 0 && technicalAllocations.every((e: any) => (e.closure_status || e.closureStatus) === 'Submitted');

    let nextStatus: TicketStatus = 'Awaiting Closure';
    if (hasFunctional && hasTechnical) {
      if (allFunctionalSubmitted && allTechnicalSubmitted) {
        nextStatus = 'Request for Closure';
      } else if (allTechnicalSubmitted && !allFunctionalSubmitted) {
        nextStatus = 'Awaiting Functional Submission';
      } else if (allFunctionalSubmitted && !allTechnicalSubmitted) {
        nextStatus = 'Awaiting Technical Submission';
      } else {
        nextStatus = 'Awaiting Closure';
      }
    } else if (hasFunctional || hasTechnical) {
      const allSubmitted = activeAllocations.every((e: any) => (e.closure_status || e.closureStatus) === 'Submitted');
      if (allSubmitted) {
        nextStatus = 'Request for Closure';
      } else {
        nextStatus = 'Awaiting Closure';
      }
    } else {
      nextStatus = 'Request for Closure';
    }

    let newRequest: TicketClosureRequest | null = null;
    let totalFuncActual = 0;
    let totalTechActual = 0;

    if (nextStatus === 'Request for Closure') {
      dbAllocations.forEach((e: any) => {
        const type = e.consultant_type || e.consultantType;
        const hrs = Number(e.actual_hours || e.actualHours || 0);
        if (type === 'Functional') {
          totalFuncActual += hrs;
        } else {
          totalTechActual += hrs;
        }
      });

      const grandTotal = totalFuncActual + totalTechActual;
      const summaries = dbAllocations
        .map((e: any) => `${e.consultant_name || e.consultantName} (${e.consultant_type || e.consultantType}): ${e.work_summary || e.workSummary || 'No summary'}`)
        .join('\n\n');

      const notes = dbAllocations
        .map((e: any) => `${e.consultant_name || e.consultantName} (${e.consultant_type || e.consultantType}): ${e.resolution_notes || e.resolutionNotes || 'No notes'}`)
        .join('\n\n');

      newRequest = {
        id: `cls-${Date.now()}`,
        ticketId,
        requestedBy: consultantName,
        functionalActualHours: totalFuncActual,
        technicalActualHours: totalTechActual,
        totalActualHours: grandTotal,
        workCompletedSummary: summaries,
        rootCause: data.rootCause || 'SAP Configuration/Process Alignment',
        resolutionSummary: notes,
        pendingItems: data.pendingItems,
        status: 'Pending Manager Approval',
        managerApprovalStatus: 'Pending',
        resubmittedFromId: requestId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('ticket_closure_requests').update({
            status: 'Resubmitted'
          }).eq('id', requestId);

          await supabase.from('ticket_closure_requests').insert({
            id: newRequest.id,
            ticket_id: ticketId,
            requested_by: consultantId,
            functional_actual_hours: totalFuncActual,
            technical_actual_hours: totalTechActual,
            total_actual_hours: grandTotal,
            work_completed_summary: summaries,
            root_cause: data.rootCause || 'SAP Configuration/Process Alignment',
            resolution_summary: notes,
            pending_items: data.pendingItems || null,
            status: 'Pending Manager Approval',
            manager_approval_status: 'Pending',
            resubmitted_from_id: requestId
          });

          await supabase.from('tickets').update({
            status: 'Request for Closure',
            root_cause: data.rootCause || null,
            resolution_summary: notes,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Status',
            old_value: tickets.find(t => t.id === ticketId)?.status || 'In Progress',
            new_value: 'Request for Closure'
          });

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Actual Hours Resubmitted',
            old_value: '0',
            new_value: `${grandTotal} (Func: ${totalFuncActual}, Tech: ${totalTechActual})`
          });
        } catch (err) {
          console.error('Error resubmitting unified closure request:', err);
        }
      }
    } else {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('tickets').update({
            status: nextStatus,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Status',
            old_value: tickets.find(t => t.id === ticketId)?.status || 'In Progress',
            new_value: nextStatus
          });

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: consultantId,
            field_changed: 'Closure Request Resubmitted',
            oldValue: '',
            newValue: `${actualHoursToLog} hrs`,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.error('Error updating status to nextStatus:', err);
        }
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const closureRequests = (t.closureRequests || []).map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Resubmitted' as const,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });

        const updatedEfforts = (t.consultantEfforts || []).map(eff => {
          if (eff.consultantId === consultantId) {
            return {
              ...eff,
              actualHours: actualHoursToLog,
              closureStatus: 'Submitted' as const,
              workSummary: workSummaryToLog,
              resolutionNotes: resolutionNotesToLog,
              updatedAt: new Date().toISOString()
            };
          }
          return eff;
        });

        const hist = [...t.history];
        hist.push({
          id: `h-cls-resub-${Date.now()}`,
          ticketId,
          changedBy: consultantName,
          fieldChanged: 'Closure Request Resubmitted',
          oldValue: '',
          newValue: `${totalFuncActual + totalTechActual} hrs`,
          createdAt: new Date().toISOString()
        });

        return {
          ...t,
          status: nextStatus,
          consultantEfforts: updatedEfforts,
          closureRequests: newRequest ? [...closureRequests, newRequest] : closureRequests,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Closure Request Resubmitted',
      `Consultant ${consultantName} resubmitted their closure details for ${ticketId}.`,
      ticketId
    );
  };

  const approveClosureRequest = async (ticketId: string, requestId: string, managerName: string) => {
    let actualFunc = 0;
    let actualTech = 0;
    let actualTotal = 0;
    let requester = 'Consultant';

    const currentTicket = tickets.find(t => t.id === ticketId);
    const reqObj = currentTicket?.closureRequests?.find(r => r.id === requestId);
    if (reqObj) {
      actualFunc = reqObj.functionalActualHours;
      actualTech = reqObj.technicalActualHours;
      actualTotal = reqObj.totalActualHours;
      requester = reqObj.requestedBy;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
        const managerId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        await supabase.from('ticket_closure_requests').update({
          status: 'Approved',
          manager_approval_status: 'Approved',
          manager_approved_by: managerName,
          manager_approved_at: new Date().toISOString()
        }).eq('id', requestId);

        await supabase.from('tickets').update({
          status: 'Awaiting Closure',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Status',
          old_value: 'Request for Closure',
          new_value: 'Awaiting Closure'
        });

        const { data: consProf } = await supabase.from('profiles').select('id').eq('full_name', requester).maybeSingle();
        const consultantUUID = consProf ? consProf.id : requester;

        if (actualFunc > 0) {
          const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', consultantUUID)
            .eq('consultant_type', 'Functional')
            .maybeSingle();

          if (existingEff) {
            await supabase.from('ticket_consultant_efforts').update({
              actual_hours: actualFunc,
              updated_at: new Date().toISOString()
            }).eq('id', existingEff.id);
          } else {
            await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: 'Functional',
              estimated_hours: 0,
              actual_hours: actualFunc
            });
          }
        }

        if (actualTech > 0) {
          const { data: existingEff } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', consultantUUID)
            .eq('consultant_type', 'Technical')
            .maybeSingle();

          if (existingEff) {
            await supabase.from('ticket_consultant_efforts').update({
              actual_hours: actualTech,
              updated_at: new Date().toISOString()
            }).eq('id', existingEff.id);
          } else {
            await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: 'Technical',
              estimated_hours: 0,
              actual_hours: actualTech
            });
          }
        }
      } catch (err) {
        console.error('Error approving closure request in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const closureRequests = (t.closureRequests || []).map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Approved' as const,
              managerApprovalStatus: 'Approved' as const,
              managerApprovedBy: managerName,
              managerApprovedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });

        const currentEfforts = t.consultantEfforts || [];
        const updatedEfforts = [...currentEfforts];

        if (actualFunc > 0) {
          const fEffortIdx = updatedEfforts.findIndex(e => e.consultantId === requester && e.consultantType === 'Functional');
          if (fEffortIdx > -1) {
            updatedEfforts[fEffortIdx] = {
              ...updatedEfforts[fEffortIdx],
              actualHours: actualFunc,
              updatedAt: new Date().toISOString()
            };
          } else {
            updatedEfforts.push({
              id: `eff-${Date.now()}-f`,
              ticketId,
              consultantId: requester,
              consultantName: requester,
              consultantType: 'Functional',
              estimatedHours: 0,
              actualHours: actualFunc,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        if (actualTech > 0) {
          const tEffortIdx = updatedEfforts.findIndex(e => e.consultantId === requester && e.consultantType === 'Technical');
          if (tEffortIdx > -1) {
            updatedEfforts[tEffortIdx] = {
              ...updatedEfforts[tEffortIdx],
              actualHours: actualTech,
              updatedAt: new Date().toISOString()
            };
          } else {
            updatedEfforts.push({
              id: `eff-${Date.now()}-t`,
              ticketId,
              consultantId: requester,
              consultantName: requester,
              consultantType: 'Technical',
              estimatedHours: 0,
              actualHours: actualTech,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        const hist = [
          ...t.history,
          {
            id: `h-cls-app-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: 'Awaiting Closure',
            createdAt: new Date().toISOString()
          }
        ];

        return {
          ...t,
          status: 'Awaiting Closure' as TicketStatus,
          resolvedAt: new Date().toISOString(),
          closureRequests,
          consultantEfforts: updatedEfforts,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Closure Request Approved',
      `Your closure request for ${ticketId} has been approved. Ticket is now Awaiting Closure.`,
      ticketId
    );
  };

  const rejectClosureRequest = async (ticketId: string, requestId: string, managerName: string, rejectionReason: string) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    const revertedStatus: TicketStatus = currentTicket?.functionalOrTechnical === 'Technical' ? 'In Progress - Technical' : 'In Progress - Functional';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
        const managerId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        await supabase.from('ticket_closure_requests').update({
          status: 'Rejected',
          manager_approval_status: 'Rejected',
          manager_rejected_by: managerName,
          manager_rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        }).eq('id', requestId);

        await supabase.from('ticket_consultant_efforts').update({
          closure_status: 'Pending',
          updated_at: new Date().toISOString()
        }).eq('ticket_id', ticketId);

        await supabase.from('tickets').update({
          status: revertedStatus,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Status',
          old_value: 'Request for Closure',
          new_value: revertedStatus
        });

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Closure Request Rejected',
          old_value: '',
          new_value: rejectionReason
        });
      } catch (err) {
        console.error('Error rejecting closure request in Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const closureRequests = (t.closureRequests || []).map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Rejected' as const,
              managerApprovalStatus: 'Rejected' as const,
              managerRejectedBy: managerName,
              managerRejectedAt: new Date().toISOString(),
              rejectionReason,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });

        const updatedEfforts = (t.consultantEfforts || []).map(eff => ({
          ...eff,
          closureStatus: 'Pending' as const,
          updatedAt: new Date().toISOString()
        }));

        const hist = [
          ...t.history,
          {
            id: `h-cls-rej-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: revertedStatus,
            createdAt: new Date().toISOString()
          },
          {
            id: `h-cls-rej-reason-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Closure Request Rejected',
            oldValue: '',
            newValue: rejectionReason,
            createdAt: new Date().toISOString()
          }
        ];

        return {
          ...t,
          status: revertedStatus,
          closureRequests,
          consultantEfforts: updatedEfforts,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Closure Request Rejected',
      `Your closure request for ${ticketId} was rejected by ${managerName}. Reason: ${rejectionReason}`,
      ticketId
    );
  };

  const updateConsultantEfforts = async (ticketId: string, efforts: TicketConsultantEffort[]) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    if (!currentTicket) return;
    const existingEfforts = currentTicket.consultantEfforts || [];
    const existingActive = existingEfforts.filter(e => !e.isDeleted);

    const addedConsultants = efforts.filter(e => !existingActive.some(x => x.consultantId === e.consultantId));
    const removedConsultants = existingActive.filter(e => !efforts.some(x => x.consultantId === e.consultantId));

    const updatedEfforts: TicketConsultantEffort[] = [];

    existingEfforts.forEach(e => {
      if (e.isDeleted) {
        updatedEfforts.push(e);
      }
    });

    efforts.forEach(e => {
      if (!updatedEfforts.some(x => x.id === e.id)) {
        updatedEfforts.push(e);
      }
    });

    existingEfforts.forEach(e => {
      if (!e.isDeleted && !efforts.some(x => x.consultantId === e.consultantId)) {
        updatedEfforts.push({
          ...e,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: 'System'
        });
      }
    });

    const actorName = user?.name || 'System';
    const actorEmail = user?.email || 'manager@supportstudio.com';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profActor } = await supabase.from('profiles').select('id').eq('email', actorEmail).maybeSingle();
        const actorId = profActor ? profActor.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        for (const e of updatedEfforts) {
          let consultantUUID = e.consultantId;
          const { data: consProf } = await supabase.from('profiles').select('id').eq('full_name', e.consultantName).maybeSingle();
          if (consProf) {
            consultantUUID = consProf.id;
          }

          const { error } = await supabase.from('ticket_consultant_efforts').upsert({
            id: (e.id.startsWith('eff-') || e.id.startsWith('mock-')) && e.id.length < 25 ? undefined : e.id,
            ticket_id: ticketId,
            consultant_id: consultantUUID,
            consultant_type: e.consultantType,
            estimated_hours: e.estimatedHours,
            actual_hours: e.actualHours,
            remarks: e.remarks || null,
            is_deleted: e.isDeleted || false,
            deleted_at: e.deletedAt || null,
            deleted_by: e.deletedBy || null
          });
          if (error) console.error('Error syncing consultant effort:', error);
        }

        for (const added of addedConsultants) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Resource Assigned',
            old_value: 'None',
            new_value: `${added.consultantName} (${added.consultantType})`
          });

          let targetUUID = added.consultantId;
          const { data: consProf } = await supabase.from('profiles').select('id').eq('full_name', added.consultantName).maybeSingle();
          if (consProf) targetUUID = consProf.id;

          await supabase.from('notifications').insert({
            user_id: targetUUID,
            title: 'Resource Assigned',
            message: `You have been assigned to ticket ${ticketId} as a ${added.consultantType} resource by ${actorName}.`,
            ticket_id: ticketId
          });
        }

        for (const removed of removedConsultants) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Resource Removed',
            old_value: `${removed.consultantName} (${removed.consultantType})`,
            new_value: 'None'
          });

          let targetUUID = removed.consultantId;
          const { data: consProf } = await supabase.from('profiles').select('id').eq('full_name', removed.consultantName).maybeSingle();
          if (consProf) targetUUID = consProf.id;

          await supabase.from('notifications').insert({
            user_id: targetUUID,
            title: 'Resource Removed',
            message: `You have been removed from ticket ${ticketId} by ${actorName}.`,
            ticket_id: ticketId
          });
        }
      } catch (err) {
        console.error('Supabase updateConsultantEfforts failed:', err);
      }
    }

    const localHistories: AuditHistory[] = [];
    addedConsultants.forEach((added, idx) => {
      localHistories.push({
        id: `h-add-res-${Date.now()}-${idx}`,
        ticketId,
        changedBy: actorName,
        fieldChanged: 'Resource Assigned',
        oldValue: 'None',
        newValue: `${added.consultantName} (${added.consultantType})`,
        createdAt: new Date().toISOString()
      });
      createSystemNotification(
        added.consultantId,
        'Resource Assigned',
        `You have been assigned to ticket ${ticketId} as a ${added.consultantType} resource by ${actorName}.`,
        ticketId
      );
    });

    removedConsultants.forEach((removed, idx) => {
      localHistories.push({
        id: `h-rem-res-${Date.now()}-${idx}`,
        ticketId,
        changedBy: actorName,
        fieldChanged: 'Resource Removed',
        oldValue: `${removed.consultantName} (${removed.consultantType})`,
        newValue: 'None',
        createdAt: new Date().toISOString()
      });
      createSystemNotification(
        removed.consultantId,
        'Resource Removed',
        `You have been removed from ticket ${ticketId} by ${actorName}.`,
        ticketId
      );
    });

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          consultantEfforts: updatedEfforts.filter(e => !e.isDeleted),
          updatedAt: new Date().toISOString(),
          history: [...t.history, ...localHistories]
        };
      }
      return t;
    });
    syncTickets(updated);
  };

  const requestUnlock = async (
    ticketId: string,
    data: {
      reason: string;
      requestedChange: string;
      remarks?: string;
      attachmentUrl?: string;
      requestedBy: string;
    }
  ) => {
    const newRequest: TicketUnlockRequest = {
      id: `unl-${Date.now()}`,
      ticketId,
      requestedBy: data.requestedBy,
      reason: data.reason,
      requestedChange: data.requestedChange,
      remarks: data.remarks,
      attachmentUrl: data.attachmentUrl,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ticket_unlock_requests').insert({
          ticket_id: ticketId,
          reason: data.reason,
          requested_change: data.requestedChange,
          remarks: data.remarks || null,
          attachment_url: data.attachmentUrl || null,
          status: 'Pending'
        });
      } catch (err) {
        console.error('Supabase requestUnlock failed:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const hist = [
          ...t.history,
          {
            id: `h-unl-req-${Date.now()}`,
            ticketId,
            changedBy: data.requestedBy,
            fieldChanged: 'Unlock Request Raised',
            oldValue: '',
            newValue: `Reason: ${data.reason}`,
            createdAt: new Date().toISOString()
          }
        ];
        return {
          ...t,
          unlockRequests: [...(t.unlockRequests || []), newRequest],
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Ticket Unlock Requested',
      `Consultant ${data.requestedBy} requested unlock/change for locked ticket ${ticketId}.`,
      ticketId
    );
  };

  const approveUnlockRequest = async (ticketId: string, requestId: string, managerName: string) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    const previousStatus: TicketStatus = currentTicket?.functionalOrTechnical === 'Technical' ? 'In Progress - Technical' : 'In Progress - Functional';

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ticket_unlock_requests').update({
          status: 'Approved',
          manager_approved_by: null,
          manager_approved_at: new Date().toISOString()
        }).eq('id', requestId);

        await supabase.from('tickets').update({
          status: previousStatus
        }).eq('id', ticketId);
      } catch (err) {
        console.error('Supabase approveUnlockRequest failed:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const unlockRequests = (t.unlockRequests || []).map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Approved' as const,
              managerApprovedBy: managerName,
              managerApprovedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });

        const hist = [
          ...t.history,
          {
            id: `h-unl-app-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: previousStatus,
            createdAt: new Date().toISOString()
          },
          {
            id: `h-unl-app-msg-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Ticket Unlocked',
            oldValue: 'Locked',
            newValue: 'Unlocked for editing',
            createdAt: new Date().toISOString()
          }
        ];

        return {
          ...t,
          status: previousStatus,
          unlockRequests,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Ticket Unlock Approved',
      `Your unlock request for ${ticketId} has been approved. The ticket is now unlocked for updates.`,
      ticketId
    );
  };

  const rejectUnlockRequest = async (ticketId: string, requestId: string, managerName: string, rejectionReason: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ticket_unlock_requests').update({
          status: 'Rejected',
          manager_rejected_by: null,
          manager_rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        }).eq('id', requestId);
      } catch (err) {
        console.error('Supabase rejectUnlockRequest failed:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const unlockRequests = (t.unlockRequests || []).map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Rejected' as const,
              managerRejectedBy: managerName,
              managerRejectedAt: new Date().toISOString(),
              rejectionReason,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });

        const hist = [
          ...t.history,
          {
            id: `h-unl-rej-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Unlock Request Rejected',
            oldValue: '',
            newValue: rejectionReason,
            createdAt: new Date().toISOString()
          }
        ];

        return {
          ...t,
          unlockRequests,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Ticket Unlock Rejected',
      `Your unlock request for ${ticketId} was rejected. Reason: ${rejectionReason}`,
      ticketId
    );
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        contracts,
        contacts,
        kbArticles,
        kbCategories,
        notifications,
        loading,
        createTicket,
        updateTicket,
        requestDelete,
        requestEscalation,
        assignTicket,
        updateTicketStatus,
        addComment,
        logEffort,
        approveEffortLog,
        resubmitEffortLog,
        resolveTicket,
        approveClosure,
        closeTicket,
        reopenTicket,
        escalateTicket,
        updateTransportRequest,
        quoteEstimatedHours,
        requestEstimateRevision,
        approveRevisionRequest,
        rejectRevisionRequest,
        raiseClosureRequest,
        resubmitClosureRequest,
        approveClosureRequest,
        rejectClosureRequest,
        updateConsultantEfforts,
        requestUnlock,
        approveUnlockRequest,
        rejectUnlockRequest,
        createKbArticle,
        rateKbArticle,
        markNotificationRead,
        createSystemNotification,
        getChatResponse,
        resetMockData
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};
