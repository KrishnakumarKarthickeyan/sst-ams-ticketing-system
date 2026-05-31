'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { getOrganizationMap } from '../app/actions/auth';

// Query retry and timeout helpers
const fetchWithRetryAndTimeout = async <T,>(
  queryFn: () => Promise<T>,
  retries = 1,
  timeoutMs = 8000
): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      const promise = queryFn();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timed out')), timeoutMs)
      );
      return await Promise.race([promise, timeoutPromise]);
    } catch (error: any) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      console.warn(`Database query failed (attempt ${attempt}/${retries + 1}). Retrying in 1s...`, error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

const wrapQuery = async <T,>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<T | null> => {
  return fetchWithRetryAndTimeout(async () => {
    const res = await queryFn();
    if (res.error) {
      throw new Error(res.error.message || JSON.stringify(res.error));
    }
    return res.data;
  }, 1, 8000);
};


interface TicketContextType {
  tickets: Ticket[];
  contracts: CustomerContract[];
  contacts: CustomerContact[];
  kbArticles: KnowledgebaseArticle[];
  kbCategories: KnowledgebaseCategory[];
  notifications: Notification[];
  profiles: any[];
  orgMap: Record<string, string>;
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
  requestEscalation: (
    ticketId: string,
    reason: string,
    severity: 'Low' | 'Medium' | 'High',
    actorName: string,
    files?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[]
  ) => Promise<{ success: boolean; error?: string }>;
  assignTicket: (ticketId: string, managerName?: string, consultantName?: string, actorName?: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus, actorName: string) => void;
  addComment: (
    ticketId: string,
    content: string,
    authorName: string,
    authorEmail: string,
    authorRole: Comment['authorRole'],
    isInternal: boolean,
    attachments?: { fileName: string; fileSize: number; fileType: string; fileUrl?: string; fileObj?: File }[],
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
      actualHours?: { consultantId: string; hours: number }[];
      files?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[];
    }
  ) => Promise<{ success: boolean; error?: string }>;
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
      actualHours?: { consultantId: string; hours: number }[];
      files?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[];
    }
  ) => Promise<{ success: boolean; error?: string }>;
  approveClosureRequest: (
    ticketId: string,
    requestId: string,
    managerName: string,
    score?: number,
    feedback?: string
  ) => Promise<{ success: boolean; error?: string }>;
  rejectClosureRequest: (
    ticketId: string,
    requestId: string,
    managerName: string,
    rejectionReason: string
  ) => Promise<{ success: boolean; error?: string }>;
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
  fetchTicketById: (ticketId: string) => Promise<Ticket | null>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contracts, setContracts] = useState<CustomerContract[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [kbArticles, setKbArticles] = useState<KnowledgebaseArticle[]>([]);
  const [kbCategories, setKbCategories] = useState<KnowledgebaseCategory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgMap, setOrgMap] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setTickets([]);
      setContracts([]);
      setContacts([]);
      setKbArticles([]);
      setKbCategories([]);
      setNotifications([]);
      setProfiles([]);
      setLoading(false);
      return;
    }
    if (isSupabaseConfigured && supabase) {
      try {
        const [
          organizationMap,
          dbProfiles,
          dbTickets,
          dbContracts,
          dbContacts,
          dbArticles,
          dbCategories,
          dbNotifications
        ] = await Promise.all([
          getOrganizationMap(),
          wrapQuery(() => supabase.from('profiles').select('*')),
          wrapQuery(() => supabase.from('tickets').select('*, organizations(name), ticket_comments(id, created_at, author_id, is_internal), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(id, comment_id, file_name, file_size, created_at), ticket_attachments(id, ticket_id, file_name, file_size, created_at), ticket_history(id, ticket_id, changed_by, field_changed, old_value, new_value, created_at), requested_by_profile:requested_by(id, full_name, email, phone_number), created_by_profile:created_by_user(id, full_name, email, phone_number)')),
          wrapQuery(() => supabase.from('customer_contracts').select('*')),
          wrapQuery(() => supabase.from('customer_contacts').select('*')),
          wrapQuery(() => supabase.from('knowledgebase_articles').select('*')),
          wrapQuery(() => supabase.from('knowledgebase_categories').select('*')),
          wrapQuery(() => supabase.from('notifications').select('*').order('created_at', { ascending: false }))
        ]);

        setOrgMap(organizationMap);

        const profilesList = dbProfiles || [];
        setProfiles(profilesList);

        setTickets(dbTickets ? dbTickets.map(t => mapDbTicket(t, profilesList, dbContacts || [], organizationMap)) : []);

        setContracts(dbContracts ? dbContracts.map(c => ({
          id: c.id,
          organizationName: organizationMap[c.customer_id || c.organization_id] || (c.organizations as any)?.name || c.customer_id || c.organization_id,
          contractType: c.contract_type as SupportContractType,
          startDate: c.contract_start_date || c.start_date,
          endDate: c.contract_end_date || c.end_date,
          totalHours: Number(c.total_contract_hours !== undefined && c.total_contract_hours !== null ? c.total_contract_hours : c.total_hours),
          usedHours: Number(c.used_hours),
          monthlyBudgetHours: Number(c.monthly_allocated_hours !== undefined && c.monthly_allocated_hours !== null ? c.monthly_allocated_hours : c.monthly_budget_hours),
          isActive: c.status !== undefined && c.status !== null ? c.status === 'Active' : c.is_active,
          customerId: c.customer_id || c.organization_id,
          status: c.status || (c.is_active ? 'Active' : 'Inactive')
        })) : []);

        setContacts(dbContacts ? dbContacts.map(c => ({
          id: c.id,
          organizationName: c.organization_name || organizationMap[c.organization_id] || c.organization_id || '',
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

        setLoading(false);
      } catch (err: any) {
        console.error('Fatal fetchData error:', err);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedRefetch = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchDataRef.current();
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [user, authLoading]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    // Subscribing to public schema changes resolves sync delays across all tables
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime DB change detected:', payload);
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Helper mapper for Supabase format
  const mapDbTicket = (t: any, dbProfiles: any[], dbContacts: any[] = [], currentOrgMap?: Record<string, string>): Ticket => {
    const activeOrgMap = currentOrgMap || orgMap;
    const getProfile = (id: string) => dbProfiles.find(p => p.id === id || p.full_name === id || p.email === id);
    const reqProfile = t.requested_by_profile || getProfile(t.requested_by);
    const createdProfile = t.created_by_profile || getProfile(t.created_by_user);
    const consultant = getProfile(t.assigned_consultant_id);
    const manager = getProfile(t.assigned_manager_id);

    let requestedByPhone = reqProfile?.phone_number || undefined;
    if (!requestedByPhone && dbContacts) {
      const contact = dbContacts.find((c: any) => 
        (c.name && reqProfile?.full_name && c.name.toLowerCase() === reqProfile.full_name.toLowerCase()) || 
        (c.email && reqProfile?.email && c.email.toLowerCase() === reqProfile.email.toLowerCase()) ||
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
      organization: (t.organization_id ? activeOrgMap[t.organization_id] : null) || (t.organizations as any)?.name || t.organization_id, // Organization Name
      organizationId: t.organization_id,
      requestedBy: reqProfile?.full_name || t.created_by_name || t.requested_by,
      requestedByEmail: reqProfile?.email || '',
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
      primaryConsultantId: t.primary_consultant_id,
      closureStatus: t.closure_status || 'Pending',
      closedBy: t.closed_by,
      
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

      attachments: [
        ...(t.ticket_attachments ? t.ticket_attachments.map((a: any) => ({
          id: a.id,
          ticketId: a.ticket_id,
          commentId: a.comment_id || undefined,
          closureRequestId: a.closure_request_id || undefined,
          escalationId: a.escalation_id || undefined,
          fileName: a.file_name,
          filePath: a.file_path,
          fileUrl: a.file_path,
          fileType: a.mime_type || '',
          fileSize: a.file_size || 0,
          uploadedBy: getProfile(a.uploaded_by)?.full_name || a.uploaded_by,
          visibility: 'public',
          createdAt: a.created_at
        })) : []),
        ...(t.ticket_comment_attachments ? t.ticket_comment_attachments.map((a: any) => {
          const comment = (t.ticket_comments || t.comments || []).find((c: any) => c.id === a.comment_id);
          return {
            id: a.id,
            ticketId: a.ticket_id,
            commentId: a.comment_id,
            fileName: a.file_name,
            filePath: a.file_url,
            fileUrl: a.file_url,
            fileType: a.file_type || '',
            fileSize: a.file_size || 0,
            uploadedBy: getProfile(a.uploaded_by)?.full_name || a.uploaded_by,
            visibility: comment?.is_internal ? 'internal' : 'public',
            createdAt: a.created_at
          };
        }) : [])
      ],

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

      createdByName: t.created_by_name || createdProfile?.full_name || reqProfile?.full_name || t.requested_by,
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

      assignments: t.ticket_assignments ? t.ticket_assignments.map((a: any) => {
        const profile = getProfile(a.consultant_id);
        return {
          ticketId: a.ticket_id,
          consultantId: a.consultant_id,
          consultantName: profile?.full_name || 'Consultant',
          consultantType: a.consultant_type,
          isPrimary: a.is_primary,
          active: a.active,
          assignedBy: a.assigned_by,
          assignedAt: a.assigned_at
        };
      }) : [],

      estimates: t.ticket_estimates ? t.ticket_estimates.map((e: any) => ({
        id: e.id,
        ticketId: e.ticket_id,
        consultantId: e.consultant_id,
        consultantType: e.consultant_type,
        estimatedHours: Number(e.estimated_hours),
        remarks: e.remarks || '',
        submittedAt: e.submitted_at
      })) : [],

      actualHoursLogs: t.ticket_actual_hours ? t.ticket_actual_hours.map((ah: any) => ({
        id: ah.id,
        closureRequestId: ah.closure_request_id,
        ticketId: ah.ticket_id,
        consultantId: ah.consultant_id,
        consultantType: ah.consultant_type,
        actualHours: Number(ah.actual_hours),
        billable: ah.billable !== false,
        approvalStatus: ah.approval_status || 'pending',
        approvedBy: ah.approved_by,
        approvedAt: ah.approved_at
      })) : [],

      consultantEfforts: (() => {
        const assignments = t.ticket_assignments || [];
        const estimates = t.ticket_estimates || [];
        const actualHoursLogs = t.ticket_actual_hours || [];
        const closureRequests = t.ticket_closure_requests || [];

        // Find the latest active closure request to read actual hours from
        const latestRequest = closureRequests.length > 0 
          ? [...closureRequests].sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())[0]
          : null;

        return assignments.map((a: any) => {
          const profile = getProfile(a.consultant_id);
          const est = estimates.find((e: any) => e.consultant_id === a.consultant_id);
          
          // Actual hours are retrieved from ticket_actual_hours table for this consultant under the latest request
          const actLog = latestRequest 
            ? actualHoursLogs.find((ah: any) => ah.closure_request_id === latestRequest.id && ah.consultant_id === a.consultant_id)
            : null;

          return {
            id: `synthesized-${a.consultant_id}-${t.id}`,
            ticketId: t.id,
            consultantId: a.consultant_id,
            consultantName: profile?.full_name || 'Consultant',
            consultantType: a.consultant_type as 'Functional' | 'Technical',
            estimatedHours: est ? Number(est.estimated_hours) : 0,
            actualHours: actLog ? Number(actLog.actual_hours) : 0,
            remarks: est?.remarks || '',
            createdAt: a.assigned_at,
            updatedAt: a.assigned_at,
            isDeleted: !a.active,
            closureStatus: latestRequest 
              ? (latestRequest.status === 'Approved' ? 'Approved' : 'Submitted') 
              : 'Pending',
            workSummary: latestRequest?.work_completed_summary || '',
            resolutionNotes: latestRequest?.resolution_summary || ''
          };
        }).filter((eff: any) => !eff.isDeleted);
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

  const fetchTicketById = async (ticketId: string): Promise<Ticket | null> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const organizationMap = await getOrganizationMap();
        const dbProfiles = await wrapQuery(() => supabase.from('profiles').select('*'));
        const profilesList = dbProfiles || [];
        const dbContacts = await wrapQuery(() => supabase.from('customer_contacts').select('*'));

        const ticketRow = await wrapQuery(() =>
          supabase
            .from('tickets')
            .select('*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*), requested_by_profile:requested_by(id, full_name, email, phone_number), created_by_profile:created_by_user(id, full_name, email, phone_number)')
            .eq('id', ticketId)
            .maybeSingle()
        );

        if (!ticketRow) return null;

        const mapped = mapDbTicket(ticketRow, profilesList, dbContacts || [], organizationMap);
        
        // Cache/update it in local state
        setTickets(prev => {
          const index = prev.findIndex(t => t.id === mapped.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = mapped;
            return next;
          } else {
            return [...prev, mapped];
          }
        });

        return mapped;
      } catch (err: any) {
        console.error('Fatal fetchTicketById error:', err);
        throw err;
      }
    } else {
      const t = tickets.find(x => x.id === ticketId);
      return t || null;
    }
  };

  const resetMockData = () => {
    console.log('resetMockData is a no-op when Supabase is configured.');
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
    if (fileUrlOrData && fileUrlOrData.includes('supabase.co/storage/v1/object/public/sap-tickets/')) {
      return fileUrlOrData;
    }
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
    const classification = data.classification || data.functionalOrTechnical || 'Functional';

    // 1. Mandatory Fields Validation
    const missingFields: string[] = [];
    if (!data.title?.trim()) missingFields.push('title');
    if (!data.description?.trim()) missingFields.push('description');
    if (!data.sapModule) missingFields.push('sapModule');
    if (!data.category) missingFields.push('category');
    if (!data.priority) missingFields.push('priority');
    if (!data.organization?.trim()) missingFields.push('organization');
    if (!data.requestedBy?.trim()) missingFields.push('requestedBy');
    if (!data.requestedByEmail?.trim()) missingFields.push('requestedByEmail');
    if (!tType) missingFields.push('ticketType');
    if (!classification) missingFields.push('classification');

    if (missingFields.length > 0) {
      const errorMsg = `Validation Error: Missing required registry fields: ${missingFields.join(', ')}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

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

    // Map Attachments local objects (will link to public bucket files on upload)
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
        let orgId = '';
        const { data: orgData, error: orgFindErr } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', data.organization.trim())
          .maybeSingle();

        if (orgFindErr) {
          console.error('[DATABASE SELECT ERROR] organization query:', {
            message: orgFindErr.message,
            code: orgFindErr.code,
            context: { organization: data.organization },
            userId: user?.id
          });
          return { success: false, error: `Organization lookup failed: [${orgFindErr.code}] ${orgFindErr.message}` };
        }

        if (orgData) {
          orgId = orgData.id;
        } else {
          // Managers can provision a new company if missing
          if (user?.role !== 'Manager' && user?.role !== 'SuperAdmin') {
            return { success: false, error: `Validation Error: Organization "${data.organization}" not registered in the system.` };
          }
          const { data: newOrg, error: orgInsErr } = await supabase
            .from('organizations')
            .insert({ name: data.organization.trim() })
            .select('id')
            .single();

          if (orgInsErr) {
            console.error('[DATABASE INSERT ERROR] organization creation:', {
              message: orgInsErr.message,
              code: orgInsErr.code,
              context: { organization: data.organization },
              userId: user?.id
            });
            return { success: false, error: `Organization registration failed: [${orgInsErr.code}] ${orgInsErr.message}` };
          }
          if (newOrg) orgId = newOrg.id;
        }

        if (!orgId) {
          return { success: false, error: 'Validation Error: Target organization could not be resolved.' };
        }

        let requestorId = user?.id || '';
        // If created by manager on behalf of customer, resolve requestor's profile id
        if (data.requestedByEmail && (user?.role === 'Manager' || user?.role === 'SuperAdmin')) {
          const { data: profData, error: profErr } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', data.requestedByEmail.trim())
            .maybeSingle();

          if (profErr) {
            console.error('[DATABASE SELECT ERROR] profiles query:', {
              message: profErr.message,
              code: profErr.code,
              context: { email: data.requestedByEmail },
              userId: user?.id
            });
            return { success: false, error: `Customer profile check failed: [${profErr.code}] ${profErr.message}` };
          }
          if (profData) {
            requestorId = profData.id;
          } else {
            return { success: false, error: `Validation Error: Profile with email ${data.requestedByEmail} does not exist.` };
          }
        }

        if (!requestorId) {
          return { success: false, error: 'Validation Error: Unable to resolve ticket requested_by client.' };
        }

        let consultantId = null;
        if (data.assignedConsultant) {
          const { data: consData, error: consErr } = await supabase
            .from('profiles')
            .select('id')
            .ilike('full_name', data.assignedConsultant.trim())
            .maybeSingle();

          if (consErr) {
            console.error('[DATABASE SELECT ERROR] profiles query (consultant):', {
              message: consErr.message,
              code: consErr.code,
              context: { name: data.assignedConsultant }
            });
            return { success: false, error: `Consultant lookup failed: ${consErr.message}` };
          }
          if (consData) consultantId = consData.id;
        }

        let managerId = null;
        if (data.assignedManager) {
          const { data: mgrData, error: mgrErr } = await supabase
            .from('profiles')
            .select('id')
            .ilike('full_name', data.assignedManager.trim())
            .maybeSingle();

          if (mgrErr) {
            console.error('[DATABASE SELECT ERROR] profiles query (manager):', {
              message: mgrErr.message,
              code: mgrErr.code,
              context: { name: data.assignedManager }
            });
            return { success: false, error: `Manager lookup failed: ${mgrErr.message}` };
          }
          if (mgrData) managerId = mgrData.id;
        }

        // Insert ticket registry entry using select().single() for transactional validation
        const ticketPayload = {
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
          functional_or_technical: classification,
          classification: classification,
          business_impact: data.businessImpactLevel || data.businessImpact || null,
          business_impact_level: data.businessImpactLevel || data.businessImpact || null,
          business_justification: data.businessJustification || null,
          expected_resolution_date: data.expectedResolutionDate || null,
          current_owner: data.assignedConsultant || null,
          next_action_owner: data.assignedConsultant || 'Support Desk',
          created_by_name: data.requestedBy,
          created_by_user: requestorId,
          soft_delete_status: 'Active'
        };

        const { data: insertedTicket, error: ticketInsErr } = await supabase
          .from('tickets')
          .insert(ticketPayload)
          .select()
          .single();

        if (ticketInsErr) {
          console.error('[DATABASE INSERT ERROR] tickets insertion:', {
            message: ticketInsErr.message,
            code: ticketInsErr.code,
            context: ticketPayload,
            userId: user?.id,
            ticketId
          });
          return { success: false, error: `Supabase ticket registry insert failed: [${ticketInsErr.code}] ${ticketInsErr.message}` };
        }

        if (!insertedTicket) {
          return { success: false, error: 'Database transaction returned empty response.' };
        }

        // Create ticket module links
        if (data.sapModules && data.sapModules.length > 0) {
          for (const m of data.sapModules) {
            const { error: modErr } = await supabase.from('ticket_modules').insert({
              ticket_id: ticketId,
              module_id: m
            });
            if (modErr) {
              console.error('[DATABASE INSERT ERROR] ticket_modules scope:', { message: modErr.message, code: modErr.code, ticketId });
              return { success: false, error: `Module scoping error: ${modErr.message}` };
            }
          }
        } else {
          const { error: modErr } = await supabase.from('ticket_modules').insert({
            ticket_id: ticketId,
            module_id: data.sapModule
          });
          if (modErr) {
            console.error('[DATABASE INSERT ERROR] primary ticket_module:', { message: modErr.message, code: modErr.code, ticketId });
            return { success: false, error: `Primary module link error: ${modErr.message}` };
          }
        }

        // Upload attachment records
        for (const att of newAttachments) {
          const { error: attErr } = await supabase.from('ticket_attachments').insert({
            ticket_id: ticketId,
            uploaded_by: requestorId,
            file_name: att.fileName,
            file_path: att.filePath,
            file_size: att.fileSize,
            mime_type: att.fileType
          });
          if (attErr) {
            console.error('[DATABASE INSERT ERROR] ticket_attachments registration:', { message: attErr.message, code: attErr.code, ticketId });
            return { success: false, error: `Attachment linking error: ${attErr.message}` };
          }
        }

        // Write initial history log
        const { error: histErr } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: requestorId,
          field_changed: 'Ticket',
          old_value: 'Created',
          new_value: initialStatus
        });
        if (histErr) {
          console.error('[DATABASE INSERT ERROR] ticket_history entry:', { message: histErr.message, code: histErr.code, ticketId });
          return { success: false, error: `History audit failed: ${histErr.message}` };
        }

        // Write consultant assignment history & roster if assigned
        if (data.assignedConsultant) {
          const { error: histConsErr } = await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: requestorId,
            field_changed: 'Assigned Consultant',
            old_value: 'Unassigned',
            new_value: data.assignedConsultant
          });
          if (histConsErr) console.error('[DATABASE INSERT ERROR] consultant history entry:', histConsErr.message);

          if (consultantId) {
            const { error: effortErr } = await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: consultantId,
              consultant_type: (classification === 'Technical') ? 'Technical' : 'Functional',
              estimated_hours: 0,
              actual_hours: 0
            });
            if (effortErr) console.error('[DATABASE INSERT ERROR] consultant efforts registry:', effortErr.message);
          }
        }

        // Hydrate newly created ticket from the database with joins
        const { data: dbProfiles } = await supabase.from('profiles').select('*');
        const { data: dbContacts } = await supabase.from('customer_contacts').select('*');
        const { data: dbTicket, error: selectErr } = await supabase
          .from('tickets')
          .select('*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*), requested_by_profile:requested_by(id, full_name, email, phone_number), created_by_profile:created_by_user(id, full_name, email, phone_number)')
          .eq('id', ticketId)
          .single();

        if (selectErr) {
          console.error('[DATABASE SELECT ERROR] ticket hydration query:', {
            message: selectErr.message,
            code: selectErr.code,
            ticketId
          });
          return { success: false, error: `Hydration select query failed: [${selectErr.code}] ${selectErr.message}` };
        }

        if (dbTicket) {
          const mappedTicket = mapDbTicket(dbTicket, dbProfiles || [], dbContacts || [], orgMap);
          setTickets(prev => [mappedTicket, ...prev]);

          // Send asynchronous background notifications
          const { data: mgrProfile } = await supabase.from('profiles').select('id').eq('email', 'manager@supportstudio.com').maybeSingle();
          if (mgrProfile) {
            await supabase.from('notifications').insert({
              user_id: mgrProfile.id,
              title: `New Ticket: ${ticketId}`,
              message: `Ticket "${data.title}" was submitted. Source: ${ticketSource}`,
              ticket_id: ticketId
            });
          }
          if (consultantId) {
            await supabase.from('notifications').insert({
              user_id: consultantId,
              title: 'New Ticket Assigned',
              message: `You have been assigned to ${ticketId} during creation.`,
              ticket_id: ticketId
            });
          }

          return { success: true, ticketId: mappedTicket.id };
        }

      } catch (err: any) {
        console.error('[TICKET CREATION FATAL RUNTIME ERROR]:', err);
        return { success: false, error: err.message || 'Fatal database transaction error' };
      }
    }

    return { success: false, error: 'Database connection is not configured.' };
  };

  const requestEscalation = async (
    ticketId: string,
    reason: string,
    severity: 'Low' | 'Medium' | 'High',
    actorName: string,
    files?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[]
  ): Promise<{ success: boolean; error?: string }> => {
    let escalationId = `esc-${Date.now()}`;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', actorName).maybeSingle();
        const actorId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');
        
        const { data: insertedEsc, error: escErr } = await supabase.from('ticket_escalations').insert({
          ticket_id: ticketId,
          escalated_by: actorId,
          reason,
          severity,
          status: 'Pending'
        }).select('id');
        
        if (escErr) throw escErr;
        const escId = insertedEsc && insertedEsc.length > 0 ? insertedEsc[0].id : null;
        if (escId) {
          escalationId = escId;
        }

        // Upload attachment records linked to the escalation
        if (escId && files && files.length > 0) {
          for (const f of files) {
            const fileUrl = await uploadAttachmentToSupabase(ticketId, f.fileName, f.fileSize, f.fileType, f.fileObj);
            const { error: attErr } = await supabase.from('ticket_attachments').insert({
              ticket_id: ticketId,
              uploaded_by: actorId,
              file_name: f.fileName,
              file_path: fileUrl,
              file_size: f.fileSize,
              mime_type: f.fileType,
              escalation_id: escId
            });
            if (attErr) {
              console.error('[DATABASE INSERT ERROR] ticket_attachments registration for escalation:', attErr);
            }
          }
        }

        await supabase.from('tickets').update({ escalation_flag: true, updated_at: new Date().toISOString() }).eq('id', ticketId);
        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: actorId,
          field_changed: 'Ticket Escalated',
          old_value: 'None',
          new_value: `${severity} Severity Escalation`
        });
      } catch (err: any) {
        console.error('Error in requestEscalation Supabase update:', err);
        return { success: false, error: err.message || 'Database error occurred' };
      }
    }
    const newEscalation: TicketEscalation = {
      id: escalationId,
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
        const localAttachments = [...(t.attachments || [])];

        if (files && files.length > 0) {
          files.forEach((f, idx) => {
            localAttachments.push({
              id: `att-esc-${Date.now()}-${idx}`,
              ticketId,
              escalationId,
              fileName: f.fileName,
              filePath: `/files/${f.fileName}`,
              fileUrl: `/files/${f.fileName}`,
              fileType: f.fileType || '',
              fileSize: f.fileSize || 0,
              uploadedBy: actorName,
              visibility: 'public',
              createdAt: new Date().toISOString()
            });
          });
        }

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
          attachments: localAttachments,
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

    return { success: true };
  };

  const assignTicket = async (ticketId: string, managerName?: string, consultantName?: string, actorName?: string) => {
    const changeActor = actorName || 'System';
    if (isSupabaseConfigured && supabase) {
      try {
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
          dbData.primary_consultant_id = consultantId;
          
          const oldPrimaryName = ticketObj?.assignedConsultant || 'Unassigned';
          
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Assigned Lead Consultant',
            old_value: oldPrimaryName,
            new_value: consultantName || 'Unassigned'
          });

          // Set all assignments to is_primary = false first
          await supabase.from('ticket_assignments')
            .update({ is_primary: false })
            .eq('ticket_id', ticketId);

          if (consultantId) {
            // Check if this assignment already exists
            const { data: existingAsg } = await supabase.from('ticket_assignments')
              .select('ticket_id')
              .eq('ticket_id', ticketId)
              .eq('consultant_id', consultantId)
              .maybeSingle();

            if (existingAsg) {
              await supabase.from('ticket_assignments')
                .update({ is_primary: true, active: true })
                .eq('ticket_id', ticketId)
                .eq('consultant_id', consultantId);
            } else {
              await supabase.from('ticket_assignments').insert({
                ticket_id: ticketId,
                consultant_id: consultantId,
                consultant_type: cons?.consultant_type || 'Functional',
                is_primary: true,
                active: true,
                assigned_by: actorId
              });
            }

            // Sync ticket status if New -> Assigned
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

            // Send notification to the new primary consultant
            await supabase.from('notifications').insert({
              user_id: consultantId,
              title: 'Assigned as Primary Lead',
              message: `You have been designated as the Primary Lead Consultant for ticket ${ticketId} by ${changeActor}.`,
              ticket_id: ticketId
            });
          }

          // Send notification to the old primary consultant (if any)
          if (ticketObj?.primaryConsultantId && ticketObj.primaryConsultantId !== consultantId) {
            await supabase.from('notifications').insert({
              user_id: ticketObj.primaryConsultantId,
              title: 'Lead Assignment Changed',
              message: `The Lead Consultant assignment for ticket ${ticketId} has been changed. You are now a secondary resource.`,
              ticket_id: ticketId
            });
          }
        }

        await supabase.from('tickets').update(dbData).eq('id', ticketId);
        await fetchData();
      } catch (err) {
        console.error('Error in assignTicket Supabase update:', err);
      }
    } else {
      // Local fallback mode
      const updated = tickets.map(t => {
        if (t.id === ticketId) {
          const hist: AuditHistory[] = [...t.history];
          const updates: Partial<Ticket> = { updatedAt: new Date().toISOString() };

          if (managerName !== undefined) {
            updates.assignedManager = managerName || undefined;
            hist.push({
              id: `h-mgr-${Date.now()}`,
              ticketId,
              changedBy: changeActor,
              fieldChanged: 'Assigned Manager',
              oldValue: t.assignedManager || 'None',
              newValue: managerName || 'None',
              createdAt: new Date().toISOString()
            });
          }

          if (consultantName !== undefined) {
            updates.assignedConsultant = consultantName || undefined;
            updates.primaryConsultantId = consultantName ? (consultantName.toLowerCase() === 'keerthana' ? '7408c315-ab62-475d-af67-6471b926efbc' : 'fe03e764-f139-4739-a0f7-44a966c1840a') : undefined;
            
            hist.push({
              id: `h-cons-${Date.now()}`,
              ticketId,
              changedBy: changeActor,
              fieldChanged: 'Assigned Lead Consultant',
              oldValue: t.assignedConsultant || 'Unassigned',
              newValue: consultantName || 'Unassigned',
              createdAt: new Date().toISOString()
            });

            if (consultantName && t.status === 'New') {
              updates.status = 'Assigned';
              hist.push({
                id: `h-status-${Date.now()}`,
                ticketId,
                changedBy: changeActor,
                fieldChanged: 'Status',
                oldValue: 'New',
                newValue: 'Assigned',
                createdAt: new Date().toISOString()
              });
            }

            // Update local assignments array
            const newAsgs = (t.assignments || []).map(a => ({
              ...a,
              isPrimary: a.consultantName === consultantName
            }));

            if (consultantName && !newAsgs.some(a => a.consultantName === consultantName)) {
              newAsgs.push({
                ticketId,
                consultantId: updates.primaryConsultantId || `cons-${Date.now()}`,
                consultantName: consultantName,
                consultantType: consultantName.toLowerCase() === 'keerthana' ? 'Technical' : 'Functional',
                isPrimary: true,
                active: true,
                assignedAt: new Date().toISOString()
              });
            }
            updates.assignments = newAsgs;
          }

          return { ...t, ...updates, history: hist };
        }
        return t;
      });
      syncTickets(updated);
    }
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
    attachments?: { fileName: string; fileSize: number; fileType: string; fileUrl?: string; fileObj?: File }[],
    mentions?: string[]
  ) => {
    const commentId = `c-${Date.now()}`;
    
    // Build attachments
    const newAttachments: Attachment[] = [];
    for (let idx = 0; idx < (attachments || []).length; idx++) {
      const att = attachments![idx];
      const fileUrl = await uploadAttachmentToSupabase(ticketId, att.fileName, att.fileSize, att.fileType, att.fileObj, att.fileUrl);
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

        if (newAttachments && newAttachments.length > 0) {
          for (const att of newAttachments) {
            await supabase.from('ticket_comment_attachments').insert({
              comment_id: dbCommentId,
              ticket_id: ticketId,
              file_name: att.fileName,
              file_url: att.fileUrl,
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
            if (ticketObj && ticketObj.organizationId) {
              const { data: contr } = await supabase.from('customer_contracts').select('id, used_hours').eq('organization_id', ticketObj.organizationId).maybeSingle();
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
        // 1. Insert into new ticket_estimates table
        await supabase.from('ticket_estimates').upsert({
          ticket_id: ticketId,
          consultant_id: consultantUUID,
          consultant_type: consultantType,
          estimated_hours: total,
          remarks: data.remarks || 'Consultant Estimate',
          submitted_at: new Date().toISOString()
        }, {
          onConflict: 'ticket_id,consultant_id'
        });

        // 2. Insert/update legacy tables for safety
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
          approved_by: null,
          approved_at: newEstimate.approvedAt
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

        // 3. Recalculate aggregate estimated hours for this ticket
        const { data: ests } = await supabase.from('ticket_estimates').select('estimated_hours').eq('ticket_id', ticketId);
        const aggregateTotal = ests ? ests.reduce((sum, curr) => sum + Number(curr.estimated_hours || 0), 0) : total;

        await supabase.from('tickets').update({
          quoted_hours: aggregateTotal,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantUUID,
          field_changed: 'Estimated Hours Quoted',
          old_value: '0',
          new_value: `${total} (Func: ${data.functionalEstimatedHours}, Tech: ${data.technicalEstimatedHours})`
        });
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

        // Update local estimates array
        const newEstRecord = {
          id: `est-${Date.now()}`,
          ticketId,
          consultantId: consultantUUID,
          consultantType,
          estimatedHours: total,
          remarks: data.remarks,
          submittedAt: new Date().toISOString()
        };

        const newEstimates = [...(t.estimates || [])];
        const estIdx = newEstimates.findIndex(e => e.consultantId === consultantUUID);
        if (estIdx >= 0) {
          newEstimates[estIdx] = newEstRecord;
        } else {
          newEstimates.push(newEstRecord);
        }

        const aggregateTotal = newEstimates.reduce((sum, est) => sum + est.estimatedHours, 0);

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
          quotedHours: aggregateTotal,
          hourEstimates: [...(t.hourEstimates || []), newEstimate],
          estimates: newEstimates,
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
        // 1. Insert/upsert into new ticket_estimates table
        await supabase.from('ticket_estimates').upsert({
          ticket_id: ticketId,
          consultant_id: consultantUUID,
          consultant_type: consultantType,
          estimated_hours: total,
          remarks: data.remarks || 'Consultant Revision Estimate',
          submitted_at: new Date().toISOString()
        }, {
          onConflict: 'ticket_id,consultant_id'
        });

        // 2. Insert into legacy tables for safety
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
          approved_by: null,
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
            approved_by: managerId,
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
      actualHours?: { consultantId: string; hours: number }[];
      files?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[];
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const consultantId = user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5';
    const consultantName = user?.name || data.requestedBy;

    const currentTicket = tickets.find(t => t.id === ticketId);

    // Classify actual hours by functional or technical type
    let totalFuncActual = 0;
    let totalTechActual = 0;
    const actualHoursList = data.actualHours || [];

    // Fallback: if actualHoursList is empty, try to construct it from functionalActualHours and technicalActualHours for the primary consultant
    if (actualHoursList.length === 0) {
      const isFunctional = currentTicket?.assignments?.find(a => a.consultantId === consultantId)?.consultantType !== 'Technical';
      actualHoursList.push({
        consultantId: consultantId,
        hours: isFunctional ? data.functionalActualHours : data.technicalActualHours
      });
    }

    // In local fallback or DB, we want to calculate the sums
    const resolvedHoursList: { consultantId: string; consultantName: string; consultantType: 'Functional' | 'Technical'; hours: number }[] = [];

    for (const ah of actualHoursList) {
      let type: 'Functional' | 'Technical' = 'Functional';
      let name = 'Consultant';
      const asg = currentTicket?.assignments?.find(a => a.consultantId === ah.consultantId);
      if (asg) {
        type = asg.consultantType;
        name = asg.consultantName;
      } else {
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: prof } = await supabase.from('profiles').select('full_name, consultant_type').eq('id', ah.consultantId).maybeSingle();
            if (prof) {
              type = (prof.consultant_type as any) || 'Functional';
              name = prof.full_name;
            }
          } catch (e) {
            console.error('Error resolving profile for actual hours entry:', e);
          }
        }
      }
      resolvedHoursList.push({
        consultantId: ah.consultantId,
        consultantName: name,
        consultantType: type,
        hours: ah.hours
      });

      if (type === 'Functional') {
        totalFuncActual += ah.hours;
      } else {
        totalTechActual += ah.hours;
      }
    }

    const grandTotal = totalFuncActual + totalTechActual;
    let closureRequestId = `cls-${Date.now()}`;

    const newRequest: TicketClosureRequest = {
      id: closureRequestId,
      ticketId,
      requestedBy: consultantName,
      functionalActualHours: totalFuncActual,
      technicalActualHours: totalTechActual,
      totalActualHours: grandTotal,
      workCompletedSummary: data.workCompletedSummary,
      rootCause: data.rootCause || 'SAP Configuration/Process Alignment',
      resolutionSummary: data.resolutionSummary,
      pendingItems: data.pendingItems,
      status: 'Pending Manager Approval',
      managerApprovalStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      // Keep track of what we insert for rollback
      let dbClosureReqId: string | null = null;
      let previousTicketState: any = null;

      console.log(`[CLOSURE WORKFLOW] Initiating closure request for ticket: ${ticketId} by consultant: ${consultantName}`);

      try {
        // Save previous ticket state for rollback
        const { data: oldTicket, error: fetchOldErr } = await supabase
          .from('tickets')
          .select('status, closure_status, root_cause, resolution_summary')
          .eq('id', ticketId)
          .single();
        if (fetchOldErr) {
          console.error('[CLOSURE WORKFLOW] Error fetching current ticket state:', fetchOldErr);
          throw fetchOldErr;
        }
        previousTicketState = oldTicket;
        console.log('[CLOSURE WORKFLOW] Previous ticket state saved for rollback safety:', previousTicketState);

        // 1. Insert closure request
        console.log('[CLOSURE WORKFLOW] Step 1: Inserting ticket_closure_requests record...');
        const { data: insertedReq, error: reqErr } = await supabase.from('ticket_closure_requests').insert({
          ticket_id: ticketId,
          requested_by: consultantId,
          functional_actual_hours: totalFuncActual,
          technical_actual_hours: totalTechActual,
          total_actual_hours: grandTotal,
          work_completed_summary: data.workCompletedSummary,
          root_cause: data.rootCause || 'SAP Configuration/Process Alignment',
          resolution_summary: data.resolutionSummary,
          pending_items: data.pendingItems || null,
          status: 'Pending Manager Approval',
          manager_approval_status: 'Pending'
        }).select('id');

        if (reqErr) {
          console.error('[CLOSURE WORKFLOW] Step 1 Failed (ticket_closure_requests insert):', reqErr);
          throw reqErr;
        }
        const insertedReqRow = Array.isArray(insertedReq) ? insertedReq[0] : insertedReq;
        dbClosureReqId = insertedReqRow.id;
        if (dbClosureReqId) {
          closureRequestId = dbClosureReqId;
        }
        console.log('[CLOSURE WORKFLOW] Step 1 Succeeded. Closure Request ID:', dbClosureReqId);

        // 2. Upload and insert files linked to this closure request
        if (dbClosureReqId && data.files && data.files.length > 0) {
          console.log(`[CLOSURE WORKFLOW] Step 2: Uploading ${data.files.length} attachments...`);
          for (const f of data.files) {
            const fileUrl = await uploadAttachmentToSupabase(ticketId, f.fileName, f.fileSize, f.fileType, f.fileObj);
            const { error: attErr } = await supabase.from('ticket_attachments').insert({
              ticket_id: ticketId,
              uploaded_by: consultantId,
              file_name: f.fileName,
              file_path: fileUrl,
              file_size: f.fileSize,
              mime_type: f.fileType,
              closure_request_id: dbClosureReqId
            });
            if (attErr) {
              console.error('[DATABASE INSERT ERROR] ticket_attachments registration for closure:', attErr);
              throw attErr;
            }
          }
          console.log('[CLOSURE WORKFLOW] Step 2 Succeeded. Attachments registered.');
        }

        // 3. Insert actual hours logs for each consultant
        console.log('[CLOSURE WORKFLOW] Step 3: Inserting actual hours and syncing legacy consultant efforts...');
        for (const rh of resolvedHoursList) {
          const { error: actErr } = await supabase.from('ticket_actual_hours').insert({
            closure_request_id: dbClosureReqId,
            ticket_id: ticketId,
            consultant_id: rh.consultantId,
            consultant_type: rh.consultantType,
            actual_hours: rh.hours,
            billable: true,
            approval_status: 'pending'
          });
          if (actErr) {
            console.error(`[CLOSURE WORKFLOW] Step 3 Failed to insert actual hours for ${rh.consultantId}:`, actErr);
            throw actErr;
          }

          // Also update ticket_consultant_efforts for backwards compatibility
          const { data: existingEff, error: effFetchErr } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', rh.consultantId)
            .eq('is_deleted', false)
            .maybeSingle();

          if (effFetchErr) throw effFetchErr;

          if (existingEff) {
            const { error: effUpdErr } = await supabase.from('ticket_consultant_efforts').update({
              actual_hours: rh.hours,
              closure_status: 'Submitted',
              work_summary: data.workCompletedSummary,
              resolution_notes: data.resolutionSummary,
              updated_at: new Date().toISOString()
            }).eq('id', existingEff.id);
            if (effUpdErr) throw effUpdErr;
          } else {
            const { error: effInsErr } = await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: rh.consultantId,
              consultant_type: rh.consultantType,
              estimated_hours: 0,
              actual_hours: rh.hours,
              closure_status: 'Submitted',
              work_summary: data.workCompletedSummary,
              resolution_notes: data.resolutionSummary
            });
            if (effInsErr) throw effInsErr;
          }
        }
        console.log('[CLOSURE WORKFLOW] Step 3 Succeeded.');

        // 4. Update ticket status
        console.log('[CLOSURE WORKFLOW] Step 4: Updating ticket status to Request for Closure...');
        const { error: ticketUpdErr } = await supabase.from('tickets').update({
          status: 'Request for Closure',
          closure_status: 'Awaiting Manager Approval',
          root_cause: data.rootCause || null,
          resolution_summary: data.resolutionSummary,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);
        if (ticketUpdErr) {
          console.error('[CLOSURE WORKFLOW] Step 4 Failed (tickets update):', ticketUpdErr);
          throw ticketUpdErr;
        }
        console.log('[CLOSURE WORKFLOW] Step 4 Succeeded.');

        // 5. Log history
        console.log('[CLOSURE WORKFLOW] Step 5: Recording history transitions...');
        const { error: histErr1 } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantId,
          field_changed: 'Status',
          old_value: previousTicketState.status || 'In Progress',
          new_value: 'Request for Closure'
        });
        if (histErr1) {
          console.error('[CLOSURE WORKFLOW] Step 5 Failed to log history transition:', histErr1);
          throw histErr1;
        }

        const { error: histErr2 } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantId,
          field_changed: 'Actual Hours Submitted',
          old_value: '0',
          new_value: `${grandTotal} (Func: ${totalFuncActual}, Tech: ${totalTechActual})`
        });
        if (histErr2) {
          console.error('[CLOSURE WORKFLOW] Step 5 Failed to log actual hours history entry:', histErr2);
          throw histErr2;
        }
        console.log('[CLOSURE WORKFLOW] Step 5 Succeeded.');

        // 6. Refetch verification check to confirm details exist in Supabase
        console.log('[CLOSURE WORKFLOW] Step 6: Querying database to confirm records exist...');
        const { data: verifyReq, error: verifyErr } = await supabase
          .from('ticket_closure_requests')
          .select('id')
          .eq('id', dbClosureReqId)
          .single();

        if (verifyErr || !verifyReq) {
          console.error('[CLOSURE WORKFLOW] Step 6 Verification Failed (record not found or error):', verifyErr);
          throw new Error(verifyErr?.message || 'Verification failed: inserted closure request could not be retrieved from Supabase.');
        }
        console.log('[CLOSURE WORKFLOW] Step 6 Succeeded. DB sync confirmed. Performing full refetch...');

        // Perform full refresh of client context datasets
        await fetchData();

        return { success: true };

      } catch (err: any) {
        console.error('[CLOSURE WORKFLOW] Error raising closure request in Supabase (initiating rollback):', err);
        // ROLLBACK
        if (dbClosureReqId) {
          await supabase.from('ticket_attachments').delete().eq('closure_request_id', dbClosureReqId);
          await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
          await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
        }
        if (previousTicketState) {
          await supabase.from('tickets').update({
            status: previousTicketState.status,
            closure_status: previousTicketState.closure_status,
            root_cause: previousTicketState.root_cause,
            resolution_summary: previousTicketState.resolution_summary,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);
        }
        // Rollback legacy efforts values
        for (const rh of resolvedHoursList) {
          await supabase.from('ticket_consultant_efforts').update({
            actual_hours: 0,
            closure_status: 'Pending',
            updated_at: new Date().toISOString()
          }).eq('ticket_id', ticketId).eq('consultant_id', rh.consultantId);
        }
        return { success: false, error: err.message || 'Database transaction failed' };
      }
    }

    // Local state fallback update
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        // Construct synthesized efforts
        const updatedEfforts = (t.consultantEfforts || []).map(eff => {
          const rh = resolvedHoursList.find(x => x.consultantId === eff.consultantId);
          if (rh) {
            return {
              ...eff,
              actualHours: rh.hours,
              closureStatus: 'Submitted' as const,
              workSummary: data.workCompletedSummary,
              resolutionNotes: data.resolutionSummary,
              updatedAt: new Date().toISOString()
            };
          }
          return eff;
        });

        // Add actual hours logs
        const localActualHoursLogs = [...(t.actualHoursLogs || [])];
        resolvedHoursList.forEach(rh => {
          localActualHoursLogs.push({
            id: `act-${Date.now()}-${Math.random()}`,
            closureRequestId,
            ticketId,
            consultantId: rh.consultantId,
            consultantType: rh.consultantType,
            actualHours: rh.hours
          });
        });

        // Add attachments locally
        const localAttachments = [...(t.attachments || [])];
        if (data.files && data.files.length > 0) {
          data.files.forEach((f, idx) => {
            localAttachments.push({
              id: `att-cls-${Date.now()}-${idx}`,
              ticketId,
              closureRequestId,
              fileName: f.fileName,
              filePath: `/files/${f.fileName}`,
              fileUrl: `/files/${f.fileName}`,
              fileType: f.fileType || '',
              fileSize: f.fileSize || 0,
              uploadedBy: consultantName,
              visibility: 'public',
              createdAt: new Date().toISOString()
            });
          });
        }

        const hist = [...t.history];
        hist.push({
          id: `h-cls-log-${Date.now()}`,
          ticketId,
          changedBy: consultantName,
          fieldChanged: 'Status',
          oldValue: t.status,
          newValue: 'Request for Closure',
          createdAt: new Date().toISOString()
        });

        return {
          ...t,
          status: 'Request for Closure' as TicketStatus,
          closureStatus: 'Awaiting Manager Approval',
          consultantEfforts: updatedEfforts,
          actualHoursLogs: localActualHoursLogs,
          closureRequests: [...(t.closureRequests || []), newRequest],
          attachments: localAttachments,
          updatedAt: new Date().toISOString(),
          history: hist
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'manager@supportstudio.com',
      'Closure Request Raised',
      `Primary consultant ${consultantName} has submitted actual hours and requested closure for ticket ${ticketId}. Awaiting Manager Approval.`,
      ticketId
    );

    return { success: true };
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
      actualHours?: { consultantId: string; hours: number }[];
      files?: { fileName: string; fileSize: number; fileType: string; fileObj?: File }[];
    }
  ): Promise<{ success: boolean; error?: string }> => {
    let consultantId = user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5';
    let consultantName = data.requestedBy;

    const currentTicket = tickets.find(t => t.id === ticketId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('profiles').select('id, full_name').eq('full_name', data.requestedBy).maybeSingle();
        if (prof) {
          consultantId = prof.id;
          consultantName = prof.full_name;
        }
      } catch (err) {
        console.error('Error resolving profile:', err);
      }
    }

    // Classify actual hours by functional or technical type
    let totalFuncActual = 0;
    let totalTechActual = 0;
    const actualHoursList = data.actualHours || [];

    if (actualHoursList.length === 0) {
      const isFunctional = currentTicket?.assignments?.find(a => a.consultantId === consultantId)?.consultantType !== 'Technical';
      actualHoursList.push({
        consultantId: consultantId,
        hours: isFunctional ? data.functionalActualHours : data.technicalActualHours
      });
    }

    const resolvedHoursList: { consultantId: string; consultantName: string; consultantType: 'Functional' | 'Technical'; hours: number }[] = [];

    for (const ah of actualHoursList) {
      let type: 'Functional' | 'Technical' = 'Functional';
      let name = 'Consultant';
      const asg = currentTicket?.assignments?.find(a => a.consultantId === ah.consultantId);
      if (asg) {
        type = asg.consultantType;
        name = asg.consultantName;
      } else {
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: prof } = await supabase.from('profiles').select('full_name, consultant_type').eq('id', ah.consultantId).maybeSingle();
            if (prof) {
              type = (prof.consultant_type as any) || 'Functional';
              name = prof.full_name;
            }
          } catch (e) {
            console.error('Error resolving profile for actual hours entry:', e);
          }
        }
      }
      resolvedHoursList.push({
        consultantId: ah.consultantId,
        consultantName: name,
        consultantType: type,
        hours: ah.hours
      });

      if (type === 'Functional') {
        totalFuncActual += ah.hours;
      } else {
        totalTechActual += ah.hours;
      }
    }

    const grandTotal = totalFuncActual + totalTechActual;
    let closureRequestId = `cls-${Date.now()}`;

    const newRequest: TicketClosureRequest = {
      id: closureRequestId,
      ticketId,
      requestedBy: consultantName,
      functionalActualHours: totalFuncActual,
      technicalActualHours: totalTechActual,
      totalActualHours: grandTotal,
      workCompletedSummary: data.workCompletedSummary,
      rootCause: data.rootCause || 'SAP Configuration/Process Alignment',
      resolutionSummary: data.resolutionSummary,
      pendingItems: data.pendingItems,
      status: 'Pending Manager Approval',
      managerApprovalStatus: 'Pending',
      resubmittedFromId: requestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      let dbClosureReqId: string | null = null;
      let previousTicketState: any = null;
      let previousRequestState: any = null;

      console.log(`[CLOSURE WORKFLOW] Initiating resubmit closure request for ticket: ${ticketId} by consultant: ${consultantName}`);

      try {
        // Save previous ticket and closure request state
        console.log('[CLOSURE WORKFLOW] Step 0: Saving previous ticket and request state for rollback...');
        const { data: oldTicket, error: fetchOldErr } = await supabase
          .from('tickets')
          .select('status, closure_status, root_cause, resolution_summary')
          .eq('id', ticketId)
          .single();
        if (fetchOldErr) throw fetchOldErr;
        previousTicketState = oldTicket;

        const { data: oldRequest, error: fetchOldReqErr } = await supabase
          .from('ticket_closure_requests')
          .select('status')
          .eq('id', requestId)
          .single();
        if (fetchOldReqErr) throw fetchOldReqErr;
        previousRequestState = oldRequest;

        // 1. Update previous request status to Resubmitted
        console.log(`[CLOSURE WORKFLOW] Step 1: Updating previous request ${requestId} status to Resubmitted...`);
        const { error: oldReqUpdErr } = await supabase.from('ticket_closure_requests').update({
          status: 'Resubmitted'
        }).eq('id', requestId);
        if (oldReqUpdErr) throw oldReqUpdErr;

        // 2. Insert resubmitted request
        console.log('[CLOSURE WORKFLOW] Step 2: Inserting resubmitted ticket_closure_requests record...');
        const { data: insertedReq, error: reqErr } = await supabase.from('ticket_closure_requests').insert({
          ticket_id: ticketId,
          requested_by: consultantId,
          functional_actual_hours: totalFuncActual,
          technical_actual_hours: totalTechActual,
          total_actual_hours: grandTotal,
          work_completed_summary: data.workCompletedSummary,
          root_cause: data.rootCause || 'SAP Configuration/Process Alignment',
          resolution_summary: data.resolutionSummary,
          pending_items: data.pendingItems || null,
          status: 'Pending Manager Approval',
          manager_approval_status: 'Pending',
          resubmitted_from_id: requestId
        }).select('id').single();

        if (reqErr) {
          console.error('[CLOSURE WORKFLOW] Step 2 Failed (ticket_closure_requests insert):', reqErr);
          throw reqErr;
        }
        dbClosureReqId = insertedReq.id;
        if (dbClosureReqId) {
          closureRequestId = dbClosureReqId;
        }
        console.log('[CLOSURE WORKFLOW] Step 2 Succeeded. Closure Request ID:', dbClosureReqId);

        // 2.5. Upload and insert files linked to this closure request
        if (dbClosureReqId && data.files && data.files.length > 0) {
          console.log(`[CLOSURE WORKFLOW] Step 2.5: Uploading ${data.files.length} attachments...`);
          for (const f of data.files) {
            const fileUrl = await uploadAttachmentToSupabase(ticketId, f.fileName, f.fileSize, f.fileType, f.fileObj);
            const { error: attErr } = await supabase.from('ticket_attachments').insert({
              ticket_id: ticketId,
              uploaded_by: consultantId,
              file_name: f.fileName,
              file_path: fileUrl,
              file_size: f.fileSize,
              mime_type: f.fileType,
              closure_request_id: dbClosureReqId
            });
            if (attErr) {
              console.error('[DATABASE INSERT ERROR] ticket_attachments registration for resubmitted closure:', attErr);
              throw attErr;
            }
          }
          console.log('[CLOSURE WORKFLOW] Step 2.5 Succeeded. Attachments registered.');
        }

        // 3. Insert actual hours logs for each consultant
        console.log('[CLOSURE WORKFLOW] Step 3: Inserting actual hours and syncing legacy consultant efforts...');
        for (const rh of resolvedHoursList) {
          const { error: actErr } = await supabase.from('ticket_actual_hours').insert({
            closure_request_id: dbClosureReqId,
            ticket_id: ticketId,
            consultant_id: rh.consultantId,
            consultant_type: rh.consultantType,
            actual_hours: rh.hours,
            billable: true,
            approval_status: 'pending'
          });
          if (actErr) {
            console.error(`[CLOSURE WORKFLOW] Step 3 Failed to insert actual hours for ${rh.consultantId}:`, actErr);
            throw actErr;
          }

          const { data: existingEff, error: effFetchErr } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', rh.consultantId)
            .eq('is_deleted', false)
            .maybeSingle();

          if (effFetchErr) throw effFetchErr;

          if (existingEff) {
            const { error: effUpdErr } = await supabase.from('ticket_consultant_efforts').update({
              actual_hours: rh.hours,
              closure_status: 'Submitted',
              work_summary: data.workCompletedSummary,
              resolution_notes: data.resolutionSummary,
              updated_at: new Date().toISOString()
            }).eq('id', existingEff.id);
            if (effUpdErr) throw effUpdErr;
          } else {
            const { error: effInsErr } = await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: rh.consultantId,
              consultant_type: rh.consultantType,
              estimated_hours: 0,
              actual_hours: rh.hours,
              closure_status: 'Submitted',
              work_summary: data.workCompletedSummary,
              resolution_notes: data.resolutionSummary
            });
            if (effInsErr) throw effInsErr;
          }
        }
        console.log('[CLOSURE WORKFLOW] Step 3 Succeeded.');

        // 4. Update ticket status
        console.log('[CLOSURE WORKFLOW] Step 4: Updating ticket status to Request for Closure...');
        const { error: ticketUpdErr } = await supabase.from('tickets').update({
          status: 'Request for Closure',
          closure_status: 'Awaiting Manager Approval',
          root_cause: data.rootCause || null,
          resolution_summary: data.resolutionSummary,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);
        if (ticketUpdErr) {
          console.error('[CLOSURE WORKFLOW] Step 4 Failed (tickets update):', ticketUpdErr);
          throw ticketUpdErr;
        }
        console.log('[CLOSURE WORKFLOW] Step 4 Succeeded.');

        // 5. Log history
        console.log('[CLOSURE WORKFLOW] Step 5: Recording history transitions...');
        const { error: histErr1 } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantId,
          field_changed: 'Status',
          old_value: previousTicketState.status || 'In Progress',
          new_value: 'Request for Closure'
        });
        if (histErr1) {
          console.error('[CLOSURE WORKFLOW] Step 5 Failed to log history transition:', histErr1);
          throw histErr1;
        }

        const { error: histErr2 } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: consultantId,
          field_changed: 'Actual Hours Resubmitted',
          old_value: '0',
          new_value: `${grandTotal} (Func: ${totalFuncActual}, Tech: ${totalTechActual})`
        });
        if (histErr2) {
          console.error('[CLOSURE WORKFLOW] Step 5 Failed to log actual hours history entry:', histErr2);
          throw histErr2;
        }
        console.log('[CLOSURE WORKFLOW] Step 5 Succeeded.');

        // 6. Refetch verification check to confirm details exist in Supabase
        console.log('[CLOSURE WORKFLOW] Step 6: Querying database to confirm records exist...');
        const { data: verifyReq, error: verifyErr } = await supabase
          .from('ticket_closure_requests')
          .select('id')
          .eq('id', dbClosureReqId)
          .single();

        if (verifyErr || !verifyReq) {
          console.error('[CLOSURE WORKFLOW] Step 6 Verification Failed (record not found or error):', verifyErr);
          throw new Error(verifyErr?.message || 'Verification failed: inserted closure request could not be retrieved from Supabase.');
        }
        console.log('[CLOSURE WORKFLOW] Step 6 Succeeded. DB sync confirmed. Performing full refetch...');

        // Perform full refresh of client context datasets
        await fetchData();

        return { success: true };

      } catch (err: any) {
        console.error('[CLOSURE WORKFLOW] Error resubmitting closure request in Supabase (initiating rollback):', err);
        // ROLLBACK
        if (dbClosureReqId) {
          await supabase.from('ticket_attachments').delete().eq('closure_request_id', dbClosureReqId);
          await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
          await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
        }
        if (previousRequestState) {
          await supabase.from('ticket_closure_requests').update({
            status: previousRequestState.status
          }).eq('id', requestId);
        }
        if (previousTicketState) {
          await supabase.from('tickets').update({
            status: previousTicketState.status,
            closure_status: previousTicketState.closure_status,
            root_cause: previousTicketState.root_cause,
            resolution_summary: previousTicketState.resolution_summary,
            updated_at: new Date().toISOString()
          }).eq('id', ticketId);
        }
        for (const rh of resolvedHoursList) {
          await supabase.from('ticket_consultant_efforts').update({
            actual_hours: 0,
            closure_status: 'Pending',
            updated_at: new Date().toISOString()
          }).eq('ticket_id', ticketId).eq('consultant_id', rh.consultantId);
        }
        return { success: false, error: err.message || 'Database transaction failed' };
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const updatedEfforts = (t.consultantEfforts || []).map(eff => {
          const rh = resolvedHoursList.find(x => x.consultantId === eff.consultantId);
          if (rh) {
            return {
              ...eff,
              actualHours: rh.hours,
              closureStatus: 'Submitted' as const,
              workSummary: data.workCompletedSummary,
              resolutionNotes: data.resolutionSummary,
              updatedAt: new Date().toISOString()
            };
          }
          return eff;
        });

        const localActualHoursLogs = [...(t.actualHoursLogs || [])];
        resolvedHoursList.forEach(rh => {
          localActualHoursLogs.push({
            id: `act-${Date.now()}-${Math.random()}`,
            closureRequestId,
            ticketId,
            consultantId: rh.consultantId,
            consultantType: rh.consultantType,
            actualHours: rh.hours
          });
        });

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

        // Add attachments locally
        const localAttachments = [...(t.attachments || [])];
        if (data.files && data.files.length > 0) {
          data.files.forEach((f, idx) => {
            localAttachments.push({
              id: `att-cls-${Date.now()}-${idx}`,
              ticketId,
              closureRequestId,
              fileName: f.fileName,
              filePath: `/files/${f.fileName}`,
              fileUrl: `/files/${f.fileName}`,
              fileType: f.fileType || '',
              fileSize: f.fileSize || 0,
              uploadedBy: consultantName,
              visibility: 'public',
              createdAt: new Date().toISOString()
            });
          });
        }

        const hist = [...t.history];
        hist.push({
          id: `h-cls-resub-${Date.now()}`,
          ticketId,
          changedBy: consultantName,
          fieldChanged: 'Closure Request Resubmitted',
          oldValue: '',
          newValue: `${grandTotal} hrs`,
          createdAt: new Date().toISOString()
        });

        return {
          ...t,
          status: 'Request for Closure' as TicketStatus,
          closureStatus: 'Awaiting Manager Approval',
          consultantEfforts: updatedEfforts,
          actualHoursLogs: localActualHoursLogs,
          closureRequests: [...closureRequests, newRequest],
          attachments: localAttachments,
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
      `Primary consultant ${consultantName} has resubmitted closure details for ticket ${ticketId}.`,
      ticketId
    );

    return { success: true };
  };

  const approveClosureRequest = async (
    ticketId: string,
    requestId: string,
    managerName: string,
    score?: number,
    feedback?: string
  ): Promise<{ success: boolean; error?: string }> => {
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
      let previousTicketState: any = null;
      let previousRequestState: any = null;
      let satisfactionRatingId: string | null = null;

      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
        const managerId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        // 0. Validate actual hours exist
        const { data: dbActuals, error: dbActualsErr } = await supabase
          .from('ticket_actual_hours')
          .select('id')
          .eq('closure_request_id', requestId);

        if (dbActualsErr) throw dbActualsErr;
        if (!dbActuals || dbActuals.length === 0) {
          throw new Error('Closure approval blocked: No actual hours logs found for this closure request. Re-submit closure or check resource efforts.');
        }

        // Save states for rollback
        const { data: oldTicket, error: fetchOldErr } = await supabase
          .from('tickets')
          .select('status, closure_status, closed_by, closed_at, resolved_at, updated_at')
          .eq('id', ticketId)
          .single();
        if (fetchOldErr) throw fetchOldErr;
        previousTicketState = oldTicket;

        const { data: oldReq, error: fetchOldReqErr } = await supabase
          .from('ticket_closure_requests')
          .select('status, manager_approval_status, manager_approved_by, manager_approved_at')
          .eq('id', requestId)
          .single();
        if (fetchOldReqErr) throw fetchOldReqErr;
        previousRequestState = oldReq;

        // 1. Update closure request status to Approved
        const { error: reqUpdErr } = await supabase.from('ticket_closure_requests').update({
          status: 'Approved',
          manager_approval_status: 'Approved',
          manager_approved_by: managerId,
          manager_approved_at: new Date().toISOString()
        }).eq('id', requestId);
        if (reqUpdErr) throw reqUpdErr;

        // 2. Automatically close the ticket directly
        const { error: ticketUpdErr } = await supabase.from('tickets').update({
          status: 'Closed',
          closure_status: 'Approved',
          closed_by: managerId,
          closed_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);
        if (ticketUpdErr) throw ticketUpdErr;

        // 3. Log to ticket history
        const { error: histErr } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Status',
          old_value: 'Request for Closure',
          new_value: 'Closed'
        });
        if (histErr) throw histErr;

        // 4. Update legacy ticket_consultant_efforts closure status
        const { error: effUpdErr } = await supabase.from('ticket_consultant_efforts')
          .update({ closure_status: 'Approved', updated_at: new Date().toISOString() })
          .eq('ticket_id', ticketId);
        if (effUpdErr) throw effUpdErr;

        // 4.5. Update actual hours approval status in database
        const { error: actUpdErr } = await supabase
          .from('ticket_actual_hours')
          .update({
            approval_status: 'approved',
            approved_by: managerId,
            approved_at: new Date().toISOString()
          })
          .eq('closure_request_id', requestId);
        if (actUpdErr) throw actUpdErr;

        // 4.6. Update contract utilized hours in Supabase
        if (currentTicket && currentTicket.organizationId) {
          const { data: contr } = await supabase
            .from('customer_contracts')
            .select('id, used_hours')
            .eq('organization_id', currentTicket.organizationId)
            .maybeSingle();

          if (contr) {
            const newUsedHours = Number(contr.used_hours) + Number(actualTotal);
            await supabase
              .from('customer_contracts')
              .update({ used_hours: newUsedHours })
              .eq('id', contr.id);
          }
        }

        // 5. Save satisfaction rating if provided
        if (score !== undefined && score > 0 && feedback) {
          const { data: insRating, error: ratingErr } = await supabase.from('satisfaction_ratings').insert({
            ticket_id: ticketId,
            score: score,
            feedback: feedback
          }).select('id').maybeSingle();

          if (ratingErr) throw ratingErr;
          if (insRating) satisfactionRatingId = insRating.id;
        }

      } catch (err: any) {
        console.error('Error approving closure request in Supabase (initiating rollback):', err);
        // ROLLBACK
        if (previousRequestState) {
          await supabase.from('ticket_closure_requests').update({
            status: previousRequestState.status,
            manager_approval_status: previousRequestState.manager_approval_status,
            manager_approved_by: previousRequestState.manager_approved_by,
            manager_approved_at: previousRequestState.manager_approved_at
          }).eq('id', requestId);
        }
        if (previousTicketState) {
          await supabase.from('tickets').update({
            status: previousTicketState.status,
            closure_status: previousTicketState.closure_status,
            closed_by: previousTicketState.closed_by,
            closed_at: previousTicketState.closed_at,
            resolved_at: previousTicketState.resolved_at,
            updated_at: previousTicketState.updated_at
          }).eq('id', ticketId);
        }
        await supabase.from('ticket_consultant_efforts').update({
          closure_status: 'Submitted',
          updated_at: new Date().toISOString()
        }).eq('ticket_id', ticketId);
        await supabase.from('ticket_actual_hours').update({
          approval_status: 'pending',
          approved_by: null,
          approved_at: null
        }).eq('closure_request_id', requestId);

        if (satisfactionRatingId) {
          await supabase.from('satisfaction_ratings').delete().eq('id', satisfactionRatingId);
        }

        return { success: false, error: err.message || 'Database transaction failed' };
      }
    }

    // Local fallback update
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

        const updatedEfforts = (t.consultantEfforts || []).map(eff => ({
          ...eff,
          closureStatus: 'Approved' as const,
          updatedAt: new Date().toISOString()
        }));

        const updatedActualHours = (t.actualHoursLogs || []).map(ah => {
          if (ah.closureRequestId === requestId) {
            return {
              ...ah,
              approvalStatus: 'approved',
              approvedBy: managerName,
              approvedAt: new Date().toISOString()
            };
          }
          return ah;
        });

        const hist = [
          ...t.history,
          {
            id: `h-cls-app-${Date.now()}`,
            ticketId,
            changedBy: managerName,
            fieldChanged: 'Status',
            oldValue: t.status,
            newValue: 'Closed',
            createdAt: new Date().toISOString()
          }
        ];

        let ratingObj = t.rating;
        if (score !== undefined && score > 0 && feedback) {
          ratingObj = {
            id: `r-${Date.now()}`,
            ticketId,
            score,
            feedback,
            createdAt: new Date().toISOString()
          };
        }

        // Update contracts locally
        const updatedContracts = contracts.map(c => {
          if (c.organizationName === t.organization || (t.organizationId && c.customerId === t.organizationId)) {
            return {
              ...c,
              usedHours: Number(c.usedHours) + Number(actualTotal)
            };
          }
          return c;
        });
        setContracts(updatedContracts);
        localStorage.setItem('sst_contracts', JSON.stringify(updatedContracts));

        return {
          ...t,
          status: 'Closed' as TicketStatus,
          closureStatus: 'Approved',
          closedBy: managerName,
          closedAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          closureRequests,
          consultantEfforts: updatedEfforts,
          actualHoursLogs: updatedActualHours,
          updatedAt: new Date().toISOString(),
          history: hist,
          rating: ratingObj
        };
      }
      return t;
    });

    syncTickets(updated);

    createSystemNotification(
      'consultant@supportstudio.com',
      'Closure Request Approved',
      `Closure request for ${ticketId} has been approved. Ticket status is now Closed.`,
      ticketId
    );

    return { success: true };
  };

  const rejectClosureRequest = async (
    ticketId: string,
    requestId: string,
    managerName: string,
    rejectionReason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    const revertedStatus: TicketStatus = 'In Progress';

    if (isSupabaseConfigured && supabase) {
      let previousTicketState: any = null;
      let previousRequestState: any = null;

      try {
        const { data: prof } = await supabase.from('profiles').select('id').eq('full_name', managerName).maybeSingle();
        const managerId = prof ? prof.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        // Save states for rollback
        const { data: oldTicket, error: fetchOldErr } = await supabase
          .from('tickets')
          .select('status, closure_status, updated_at')
          .eq('id', ticketId)
          .single();
        if (fetchOldErr) throw fetchOldErr;
        previousTicketState = oldTicket;

        const { data: oldReq, error: fetchOldReqErr } = await supabase
          .from('ticket_closure_requests')
          .select('status, manager_approval_status, manager_rejected_by, manager_rejected_at, rejection_reason')
          .eq('id', requestId)
          .single();
        if (fetchOldReqErr) throw fetchOldReqErr;
        previousRequestState = oldReq;

        // 1. Update closure request status to Rejected
        const { error: reqUpdErr } = await supabase.from('ticket_closure_requests').update({
          status: 'Rejected',
          manager_approval_status: 'Rejected',
          manager_rejected_by: managerId,
          manager_rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        }).eq('id', requestId);
        if (reqUpdErr) throw reqUpdErr;

        // 2. Revert legacy consultant efforts closure status
        const { error: effUpdErr } = await supabase.from('ticket_consultant_efforts').update({
          closure_status: 'Pending',
          updated_at: new Date().toISOString()
        }).eq('ticket_id', ticketId);
        if (effUpdErr) throw effUpdErr;

        // 2.5. Update actual hours approval status to rejected in database
        const { error: actUpdErr } = await supabase
          .from('ticket_actual_hours')
          .update({
            approval_status: 'rejected'
          })
          .eq('closure_request_id', requestId);
        if (actUpdErr) throw actUpdErr;

        // 3. Update ticket status
        const { error: ticketUpdErr } = await supabase.from('tickets').update({
          status: revertedStatus,
          closure_status: 'Pending',
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);
        if (ticketUpdErr) throw ticketUpdErr;

        // 4. Log to history
        const { error: histErr1 } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Status',
          old_value: 'Request for Closure',
          new_value: revertedStatus
        });
        if (histErr1) throw histErr1;

        const { error: histErr2 } = await supabase.from('ticket_history').insert({
          ticket_id: ticketId,
          changed_by: managerId,
          field_changed: 'Closure Request Rejected',
          old_value: '',
          new_value: rejectionReason
        });
        if (histErr2) throw histErr2;

      } catch (err: any) {
        console.error('Error rejecting closure request in Supabase (initiating rollback):', err);
        // ROLLBACK
        if (previousRequestState) {
          await supabase.from('ticket_closure_requests').update({
            status: previousRequestState.status,
            manager_approval_status: previousRequestState.manager_approval_status,
            manager_rejected_by: previousRequestState.manager_rejected_by,
            manager_rejected_at: previousRequestState.manager_rejected_at,
            rejection_reason: previousRequestState.rejection_reason
          }).eq('id', requestId);
        }
        if (previousTicketState) {
          await supabase.from('tickets').update({
            status: previousTicketState.status,
            closure_status: previousTicketState.closure_status,
            updated_at: previousTicketState.updated_at
          }).eq('id', ticketId);
        }
        await supabase.from('ticket_consultant_efforts').update({
          closure_status: 'Submitted',
          updated_at: new Date().toISOString()
        }).eq('ticket_id', ticketId);

        return { success: false, error: err.message || 'Database transaction failed' };
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

        const updatedActualHours = (t.actualHoursLogs || []).map(ah => {
          if (ah.closureRequestId === requestId) {
            return {
              ...ah,
              approvalStatus: 'rejected'
            };
          }
          return ah;
        });

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
          closureStatus: 'Pending',
          closureRequests,
          consultantEfforts: updatedEfforts,
          actualHoursLogs: updatedActualHours,
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

    return { success: true };
  };

  const updateConsultantEfforts = async (ticketId: string, efforts: TicketConsultantEffort[]) => {
    const currentTicket = tickets.find(t => t.id === ticketId);
    if (!currentTicket) return;
    
    const existingAssignments = currentTicket.assignments || [];
    const existingActiveAsgs = existingAssignments.filter(a => a.active);

    const addedConsultants = efforts.filter(e => !existingActiveAsgs.some(x => x.consultantId === e.consultantId));
    const removedConsultants = existingActiveAsgs.filter(a => !efforts.some(x => x.consultantId === a.consultantId));

    const actorName = user?.name || 'System';
    const actorEmail = user?.email || 'manager@supportstudio.com';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profActor } = await supabase.from('profiles').select('id').eq('email', actorEmail).maybeSingle();
        const actorId = profActor ? profActor.id : (user?.id || 'd3b07384-d113-4ec6-a558-7e30773d57d5');

        // 1. Process all active assignments and their estimates from the new efforts list
        for (const e of efforts) {
          let consultantUUID = e.consultantId;
          const { data: consProf } = await supabase.from('profiles').select('id, consultant_type').eq('full_name', e.consultantName).maybeSingle();
          if (consProf) {
            consultantUUID = consProf.id;
          }

          // Check if this assignment exists
          const { data: existingAsg } = await supabase.from('ticket_assignments')
            .select('ticket_id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', consultantUUID)
            .maybeSingle();

          if (existingAsg) {
            await supabase.from('ticket_assignments')
              .update({ active: true })
              .eq('ticket_id', ticketId)
              .eq('consultant_id', consultantUUID);
          } else {
            await supabase.from('ticket_assignments').insert({
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: e.consultantType,
              is_primary: false, // default false, changed through assignTicket
              active: true,
              assigned_by: actorId
            });
          }

          // Upsert estimate
          if (e.estimatedHours >= 0) {
            await supabase.from('ticket_estimates').upsert({
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: e.consultantType,
              estimated_hours: e.estimatedHours,
              remarks: e.remarks || 'Updated by Manager',
              submitted_at: new Date().toISOString()
            }, {
              onConflict: 'ticket_id,consultant_id'
            });
          }

          // For legacy compatibility, also upsert into ticket_consultant_efforts
          const { data: legacyEff } = await supabase.from('ticket_consultant_efforts')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('consultant_id', consultantUUID)
            .eq('is_deleted', false)
            .maybeSingle();

          if (legacyEff) {
            await supabase.from('ticket_consultant_efforts').update({
              estimated_hours: e.estimatedHours,
              remarks: e.remarks || 'Updated by Manager',
              updated_at: new Date().toISOString()
            }).eq('id', legacyEff.id);
          } else {
            await supabase.from('ticket_consultant_efforts').insert({
              ticket_id: ticketId,
              consultant_id: consultantUUID,
              consultant_type: e.consultantType,
              estimated_hours: e.estimatedHours,
              actual_hours: 0,
              remarks: e.remarks || 'Updated by Manager'
            });
          }
        }

        // 2. Mark removed consultants as inactive
        for (const r of removedConsultants) {
          await supabase.from('ticket_assignments')
            .update({ active: false })
            .eq('ticket_id', ticketId)
            .eq('consultant_id', r.consultantId);

          // For legacy compatibility, mark as deleted
          await supabase.from('ticket_consultant_efforts')
            .update({
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              deleted_by: actorId
            })
            .eq('ticket_id', ticketId)
            .eq('consultant_id', r.consultantId);
        }

        // 3. Log history and send notifications for added consultants
        for (const added of addedConsultants) {
          let targetUUID = added.consultantId;
          const { data: consProf } = await supabase.from('profiles').select('id').eq('full_name', added.consultantName).maybeSingle();
          if (consProf) targetUUID = consProf.id;

          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Resource Assigned',
            old_value: 'None',
            new_value: `${added.consultantName} (${added.consultantType})`
          });

          await supabase.from('notifications').insert({
            user_id: targetUUID,
            title: 'Resource Assigned',
            message: `You have been assigned to ticket ${ticketId} as a ${added.consultantType} resource by ${actorName}.`,
            ticket_id: ticketId
          });
        }

        // 4. Log history and send notifications for removed consultants
        for (const removed of removedConsultants) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketId,
            changed_by: actorId,
            field_changed: 'Resource Removed',
            old_value: `${removed.consultantName} (${removed.consultantType})`,
            new_value: 'None'
          });

          await supabase.from('notifications').insert({
            user_id: removed.consultantId,
            title: 'Resource Removed',
            message: `You have been removed from ticket ${ticketId} by ${actorName}.`,
            ticket_id: ticketId
          });
        }

        await fetchData();
      } catch (err) {
        console.error('Supabase updateConsultantEfforts failed:', err);
      }
    } else {
      // Local fallback mode
      const localHistories: AuditHistory[] = [];
      const updatedAssignments = [...(currentTicket.assignments || [])];
      const updatedEstimates = [...(currentTicket.estimates || [])];

      // Mark removed active assignments as active = false
      removedConsultants.forEach((removed, idx) => {
        const asgIdx = updatedAssignments.findIndex(a => a.consultantId === removed.consultantId && a.active);
        if (asgIdx >= 0) {
          updatedAssignments[asgIdx] = { ...updatedAssignments[asgIdx], active: false };
        }

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

      // Update/add new assignments and estimates
      efforts.forEach((e) => {
        const asgIdx = updatedAssignments.findIndex(a => a.consultantId === e.consultantId);
        if (asgIdx >= 0) {
          updatedAssignments[asgIdx] = { ...updatedAssignments[asgIdx], active: true };
        } else {
          updatedAssignments.push({
            ticketId,
            consultantId: e.consultantId,
            consultantName: e.consultantName,
            consultantType: e.consultantType,
            isPrimary: false,
            active: true,
            assignedAt: new Date().toISOString()
          });
        }

        const estIdx = updatedEstimates.findIndex(est => est.consultantId === e.consultantId);
        if (estIdx >= 0) {
          updatedEstimates[estIdx] = {
            ...updatedEstimates[estIdx],
            estimatedHours: e.estimatedHours,
            remarks: e.remarks || 'Updated by Manager',
            submittedAt: new Date().toISOString()
          };
        } else {
          updatedEstimates.push({
            id: `est-${Date.now()}-${Math.random()}`,
            ticketId,
            consultantId: e.consultantId,
            consultantType: e.consultantType,
            estimatedHours: e.estimatedHours,
            remarks: e.remarks || 'Updated by Manager',
            submittedAt: new Date().toISOString()
          });
        }
      });

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

      // Synthesize consultantEfforts locally
      const synthesizedEfforts = updatedAssignments.map(a => {
        const est = updatedEstimates.find(est => est.consultantId === a.consultantId);
        return {
          id: `synthesized-${a.consultantId}-${ticketId}`,
          ticketId,
          consultantId: a.consultantId,
          consultantName: a.consultantName,
          consultantType: a.consultantType,
          estimatedHours: est ? est.estimatedHours : 0,
          actualHours: 0,
          remarks: est?.remarks || '',
          createdAt: a.assignedAt,
          updatedAt: a.assignedAt,
          isDeleted: !a.active,
          closureStatus: 'Pending' as const,
          workSummary: '',
          resolutionNotes: ''
        };
      }).filter(eff => !eff.isDeleted);

      const updated = tickets.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            assignments: updatedAssignments,
            estimates: updatedEstimates,
            consultantEfforts: synthesizedEfforts,
            updatedAt: new Date().toISOString(),
            history: [...t.history, ...localHistories]
          };
        }
        return t;
      });

      syncTickets(updated);
    }
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
        profiles,
        orgMap,
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
        resetMockData,
        fetchTicketById
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
