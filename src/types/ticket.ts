export type SAPModule =
  | 'FICO'
  | 'MM'
  | 'SD'
  | 'PP'
  | 'PM'
  | 'QM'
  | 'HCM'
  | 'SuccessFactors' // legacy
  | 'BASIS'
  | 'ABAP'
  | 'Security/GRC' // legacy
  | 'CPI/Integration' // legacy
  | 'BW/BI' // legacy
  | 'Fiori' // legacy
  | 'TRM' // legacy
  | 'SF EC'
  | 'SF ECP'
  | 'SF PMGM'
  | 'SF RCM'
  | 'SAC'
  | 'CPI';

export type IssueCategory =
  | 'Functional Issue'
  | 'Technical Issue'
  | 'Authorization Issue'
  | 'Integration Issue'
  | 'Performance Issue'
  | 'Master Data Issue'
  | 'Configuration Issue'
  | 'Enhancement Request'
  | 'Bug Fix'
  | 'Training / How-to Support';

export type SupportContractType =
  | 'AMS'
  | 'Implementation Support'
  | 'Rollout Support'
  | 'Migration Support'
  | 'Upgrade Support'
  | 'Hypercare Support';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TicketStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Waiting for Internal Team'
  | 'Resolved'
  | 'Closed'
  | 'Reopened'
  | 'Requirement Gathering'
  | 'Waiting for Hours Approval'
  | 'In Progress - Technical'
  | 'In Progress - Functional'
  | 'Raised to SAP'
  | 'Customer Action'
  | 'Request for Closure'
  | 'Reopen Requested'
  | 'Awaiting Closure'
  | 'On Hold'
  | 'Awaiting Functional Submission'
  | 'Awaiting Technical Submission'
  | 'Awaiting Manager Approval'
  | 'Escalated';

export interface Comment {
  id: string;
  ticketId: string;
  authorName: string;
  authorEmail: string;
  authorRole: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  ticketId: string;
  commentId?: string; // Nullable if attached to ticket directly
  closureRequestId?: string; // Nullable if attached to closure request
  escalationId?: string; // Nullable if attached to escalation
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  visibility: 'public' | 'internal';
  createdAt: string;
}

export type EffortActivityType =
  | 'Analysis'
  | 'Configuration'
  | 'Development'
  | 'Testing'
  | 'Meeting'
  | 'Documentation'
  | 'Support'
  | 'Debugging'
  | 'Customer Coordination'
  | 'SAP Follow-up';

export interface EffortLog {
  id: string;
  ticketId: string;
  consultantId?: string;
  consultantName: string;
  workDate?: string;
  hoursWorked?: number;
  description: string;
  activityType: EffortActivityType;
  billable: boolean;
  status: 'Draft' | 'Pending' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Resubmitted';
  rejectionReason?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  resubmittedFromId?: string;
  createdAt: string;
  updatedAt?: string;

  // Compatibility fields for other dashboards
  hoursLogged: number;
  activityDate: string;
  startTime?: string;
  endTime?: string;
}

export interface AuditHistory {
  id: string;
  ticketId: string;
  changedBy: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface SatisfactionRating {
  id: string;
  ticketId: string;
  score: number; // 1-5
  feedback?: string;
  createdAt: string;
}

export type TicketType =
  | 'Incident'
  | 'Service Request'
  | 'Enhancement Request'
  | 'Change Request'
  // ITIL types present in live data — were missing from the union/select, so a
  // ticket of these types fell back to displaying "Incident" (corrections doc item 23).
  | 'Problem Record'
  | 'Support Request'
  | 'Access Request'
  | 'Training Request'
  | 'Configuration Request'
  | 'Report Request';

export type FunctionalOrTechnical = 'Functional' | 'Technical';

export interface TicketEscalation {
  id: string;
  ticketId: string;
  escalatedBy: string;
  reason: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Investigating' | 'Resolved' | 'Rejected';
  createdAt: string;
}

export interface CustomerContact {
  id: string;
  organizationName: string;
  name: string;
  designation: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
  isSecondary: boolean;
}

export interface TicketDeleteRequest {
  id: string;
  ticketId: string;
  requestedBy: string; // Requester Full Name or User ID
  requestedAt: string; // ISO String
  reason: string;
  managerApproval: 'Pending' | 'Approved' | 'Rejected';
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  adminApproval: 'Pending' | 'Approved' | 'Rejected';
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  finalStatus: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string; // e.g. UUID (internal) or legacy AS360-MM-1001
  ticketNumber?: string; // e.g. BIT-FICO-000001
  title: string;
  description: string;
  organization: string; // Organization Name
  requestedBy: string; // Requester Full Name
  requestedByEmail: string;
  requestedByPhone?: string;
  sapModule: SAPModule;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedManager?: string; // Manager Name
  assignedConsultant?: string; // Consultant Name
  slaDueAt: string; // ISO String
  leadAssignedAt?: string | null; // ISO — when the lead consultant was first assigned (SLA clock start)
  slaStatus?: string | null; // engine-computed: Not Started | On Track | At Risk | Breached | Met
  resolvedAt?: string; // ISO String
  closedAt?: string; // ISO String
  createdAt: string;
  updatedAt: string;
  rootCause?: string;
  resolutionSummary?: string;
  billable: boolean;
  escalationFlag: boolean;
  approvalRequiredFlag: boolean;
  transportRequest?: string; // SAP Transport Request (e.g. DEVK900123)
  source: 'Created by Client' | 'Created by Super Admin';
  comments: Comment[];
  attachments: Attachment[];
  efforts: EffortLog[];
  history: AuditHistory[];
  rating?: SatisfactionRating;
  
  // Extended properties for Customer Portal redesign
  ticketType?: string;
  functionalOrTechnical?: string;
  classification?: string;
  businessImpact?: string;
  businessImpactLevel?: string;
  businessJustification?: string;
  expectedResolutionDate?: string;
  quotedHours?: number;
  raisedToSap?: boolean;
  reopenedCount?: number;
  customerActionRequired?: boolean;
  currentOwner?: string;
  nextActionOwner?: string;
  escalations?: TicketEscalation[];
  
  // Rework-specific fields
  sapModules?: SAPModule[]; // Multi-module array
  deleteRequests?: TicketDeleteRequest[]; // Soft delete requests
  createdByName?: string;
  createdByUser?: string;
  softDeleteStatus?: 'Active' | 'Pending Delete' | 'Archived';

  // Consultant workflows
  hourEstimates?: TicketHourEstimate[];
  closureRequests?: TicketClosureRequest[];
  consultantEfforts?: TicketConsultantEffort[];
  mentions?: TicketMention[];
  commentAttachments?: TicketCommentAttachment[];
  unlockRequests?: TicketUnlockRequest[];

  // Overhauled workflow fields
  primaryConsultantId?: string;
  closureStatus?: string;
  closedBy?: string;
  assignments?: TicketAssignment[];
  estimates?: TicketEstimate[];
  actualHoursLogs?: TicketActualHours[];
  organizationId?: string;
  leadConsultantId?: string;
  assignedConsultantId?: string;
  assignedManagerId?: string;
  escalationAcknowledgedAt?: string | null;
  escalationAcknowledgedBy?: string | null;
  escalationAcknowledgedByName?: string | null;
  isEscalated: boolean;
  escalatedAt?: string | null;
  escalatedBy?: string | null;
  escalationReason?: string | null;
}

export interface TicketAssignment {
  ticketId: string;
  consultantId: string;
  consultantName: string;
  consultantType: 'Functional' | 'Technical';
  isPrimary: boolean;
  active: boolean;
  assignedBy?: string;
  assignedAt: string;
}

export interface TicketEstimate {
  id: string;
  ticketId: string;
  consultantId: string;
  consultantType: 'Functional' | 'Technical';
  estimatedHours: number;
  remarks?: string;
  submittedAt: string;
}

export interface TicketActualHours {
  id: string;
  closureRequestId: string;
  ticketId: string;
  consultantId: string;
  consultantType: 'Functional' | 'Technical';
  actualHours: number;
  billable?: boolean;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
}

export interface TicketUnlockRequest {
  id: string;
  ticketId: string;
  closureRequestId?: string;
  requestedBy: string;
  reason: string;
  requestedChange: string;
  remarks?: string;
  attachmentUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  managerRejectedBy?: string;
  managerRejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketHourEstimate {
  id: string;
  ticketId: string;
  consultantId: string;
  functionalEstimatedHours: number;
  technicalEstimatedHours: number;
  totalEstimatedHours: number;
  remarks: string;
  status: 'Submitted' | 'Revision Requested' | 'Revision Approved' | 'Revision Rejected';
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketClosureRequest {
  id: string;
  ticketId: string;
  requestedBy: string;
  functionalActualHours: number;
  technicalActualHours: number;
  totalActualHours: number;
  workCompletedSummary: string;
  rootCause: string;
  resolutionSummary: string;
  pendingItems?: string;
  status: 'Pending Manager Approval' | 'Approved' | 'Rejected' | 'Resubmitted';
  managerApprovalStatus: 'Pending' | 'Approved' | 'Rejected';
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  managerRejectedBy?: string;
  managerRejectedAt?: string;
  rejectionReason?: string;
  resubmittedFromId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketConsultantEffort {
  id: string;
  ticketId: string;
  consultantId: string;
  consultantName: string;
  consultantType: 'Functional' | 'Technical';
  estimatedHours: number;
  actualHours: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  closureStatus?: 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
  workSummary?: string;
  resolutionNotes?: string;
  isPrimary?: boolean;
}

export interface TicketMention {
  id: string;
  ticketId: string;
  commentId: string;
  mentionedUserId: string;
  mentionedBy: string;
  createdAt: string;
}

export interface TicketCommentAttachment {
  id: string;
  commentId: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface KnowledgebaseArticle {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  slug: string;
  content: string;
  sapModule: SAPModule;
  isInternal: boolean;
  authorName: string;
  ratingsCount: number;
  ratingsSum: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgebaseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Notification {
  id: string;
  userId: string; // Target email / id
  title: string;
  message: string;
  ticketId?: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
  linkPath?: string;
  readAt?: string | null;
}

export interface CustomerContract {
  id: string;
  organizationName: string;
  contractType: SupportContractType;
  startDate: string;
  endDate: string;
  totalHours: number;
  usedHours: number;
  monthlyBudgetHours: number;
  isActive: boolean;
  customerId?: string;
  status?: string;
  monthlyUsedHours?: number;
  annualUsedHours?: number;
  remainingHours?: number;
  monthlyUtilizationPct?: number;
  annualUtilizationPct?: number;
  projectedExhaustion?: string;
  contractValue?: number;
}

export interface ReportPreset {
  id: string;
  name: string;
  filters: any;
  createdBy: string;
}
