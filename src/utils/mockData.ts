import {
  Ticket,
  CustomerContract,
  KnowledgebaseArticle,
  KnowledgebaseCategory,
  Notification,
  SAPModule,
  CustomerContact,
  TicketDeleteRequest,
  TicketStatus,
  TicketPriority,
  TicketType,
  FunctionalOrTechnical,
  Comment,
  Attachment,
  TicketHourEstimate,
  TicketClosureRequest,
  TicketConsultantEffort,
  AuditHistory,
  TicketUnlockRequest
} from '../types/ticket';

// Relative date builders
export const getPastDate = (hoursAgo: number) => {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
};

export const getFutureDate = (hoursFromNow: number) => {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
};

export const MOCK_ORGANIZATIONS = [
  { id: 'org-1', name: 'Apex Global Industries', domain: 'apexglobal.com' },
  { id: 'org-2', name: 'Titan Energy Corp', domain: 'titanenergy.com' },
  { id: 'org-3', name: 'Nexa Manufacturing', domain: 'nexamfg.com' }
];

export const MOCK_CONTRACTS: CustomerContract[] = [
  {
    id: 'c-1',
    organizationName: 'Apex Global Industries',
    contractType: 'AMS',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    totalHours: 1200.0,
    usedHours: 485.5,
    monthlyBudgetHours: 100.0,
    isActive: true
  },
  {
    id: 'c-2',
    organizationName: 'Titan Energy Corp',
    contractType: 'Implementation Support',
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    totalHours: 800.0,
    usedHours: 240.0,
    monthlyBudgetHours: 120.0,
    isActive: true
  },
  {
    id: 'c-3',
    organizationName: 'Nexa Manufacturing',
    contractType: 'Upgrade Support',
    startDate: '2026-02-15',
    endDate: '2026-08-15',
    totalHours: 500.0,
    usedHours: 120.0,
    monthlyBudgetHours: 80.0,
    isActive: true
  }
];

export const MOCK_CATEGORIES: KnowledgebaseCategory[] = [
  {
    id: 'cat-1',
    name: 'Functional Guides',
    slug: 'functional-guides',
    description: 'Detailed instructions on FICO, SD, MM, PP, PM transactions, master data and standard setup.'
  },
  {
    id: 'cat-2',
    name: 'Technical Troubleshooting',
    slug: 'technical-troubleshooting',
    description: 'ABAP corrections, BAdIs, User-Exits, Fiori configurations and performance audits.'
  },
  {
    id: 'cat-3',
    name: 'Integrations & Cloud APIs',
    slug: 'integrations-cloud-apis',
    description: 'SAP CPI flows, mappings, SOAP/REST APIs and middleware settings.'
  },
  {
    id: 'cat-4',
    name: 'BASIS, Authorizations & Transport Management',
    slug: 'basis-auth-transports',
    description: 'Release strategies, TR imports, role security, PFCG adjustments and GRC administration.'
  }
];

export const MOCK_ARTICLES: KnowledgebaseArticle[] = [
  {
    id: 'kb-1',
    categoryId: 'cat-1',
    categoryName: 'Functional Guides',
    title: 'MM: Configuring Release Strategy for Purchase Orders',
    slug: 'mm-configuring-release-strategy-po',
    sapModule: 'MM',
    isInternal: false,
    authorName: 'Marcus Vance',
    ratingsCount: 8,
    ratingsSum: 38,
    content: `
# MM: Configuring Release Strategy for Purchase Orders
This guide outlines the standard setup for Purchase Order (PO) Release Strategies using release codes and release groups.
    `,
    createdAt: getPastDate(120),
    updatedAt: getPastDate(90)
  }
];

// --- 50 Ticket Templates ---
interface TicketTemplate {
  id: string;
  title: string;
  description: string;
  sapModule: SAPModule;
  priority: TicketPriority;
  status: TicketStatus;
  ticketType: TicketType;
  functionalOrTechnical: FunctionalOrTechnical;
  organization: string;
  requestedBy: string;
  businessImpact: string;
  quotedHours: number;
  billable: boolean;
  reopenedCount?: number;
  customerActionRequired?: boolean;
  raisedToSap?: boolean;
}

const TICKET_TEMPLATES: TicketTemplate[] = [
  // --- PRIYA RAMAN (FUNCTIONAL: FICO, MM, SD, HCM, PM) ---
  {
    id: 'SST-FICO-1001',
    title: 'FICO: Invoice Posting Error via FB60',
    description: 'When posting vendor invoices via transaction FB60, user gets error message F5 348 "Company code APEX not found". Tested in DEV and it works fine, but fails in QAS. Check global parameters and OBY6 mapping.',
    sapModule: 'FICO',
    priority: 'Critical',
    status: 'In Progress - Functional',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Vendor invoice processing is completely blocked in North America, halting payment runs.',
    quotedHours: 8.0,
    billable: true
  },
  {
    id: 'SST-FICO-1002',
    title: 'FICO: Asset Depreciation Mismatch in Ledger',
    description: 'Asset depreciation calculations for April show a variance of $12,450 between the local ledger and IFRS parallel ledger. This needs investigation and GL account mapping corrections under transaction AO90.',
    sapModule: 'FICO',
    priority: 'High',
    status: 'Waiting for Hours Approval',
    ticketType: 'Change Request',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Monthly financial closure is delayed due to Ledger balance mismatch.',
    quotedHours: 12.0,
    billable: true
  },
  {
    id: 'SST-FICO-1003',
    title: 'FICO: Vendor Payment Run F110 Blocked',
    description: 'Vendor payment run is failing with error message "No payment method defined for country". We need to configure new payment method specifications in FBZP to support Citibank ACH format.',
    sapModule: 'FICO',
    priority: 'Critical',
    status: 'Requirement Gathering',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Critical vendors cannot be paid, risking operational downtime at field stations.',
    quotedHours: 16.0,
    billable: true
  },
  {
    id: 'SST-FICO-1004',
    title: 'FICO: Bank Reconciliation Statement Upload Error',
    description: 'MT940 bank statement upload via FF_5 throws error "Statement already exists". Need to configure parallel bank account keys and clean up clearing logs in FEBA.',
    sapModule: 'FICO',
    priority: 'Medium',
    status: 'Customer Action',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Daily treasury cash position reports cannot be generated.',
    quotedHours: 6.0,
    billable: false,
    customerActionRequired: true
  },
  {
    id: 'SST-FICO-1005',
    title: 'FICO: Cost Center Allocation Cycle Error',
    description: 'The KSU5 cost allocation cycle fails with error message "No receiver database records found". Check sender/receiver rules and cost center group hierarchies in transaction OKENN.',
    sapModule: 'FICO',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Report Request',
    functionalOrTechnical: 'Functional',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'No direct business impact. Routine cost center adjustments.',
    quotedHours: 4.0,
    billable: true
  },
  {
    id: 'SST-MM-1006',
    title: 'MM: Goods Receipt MIGO Valuation Error',
    description: 'Goods receipt posting via transaction MIGO results in valuation mismatch for material type ROH. Material price control is set to Standard (S), but invoice receipt has a variance that violates OBYC transaction WRX parameters.',
    sapModule: 'MM',
    priority: 'High',
    status: 'Raised to SAP',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Manufacturing raw materials are blocked at the warehouse and cannot be issued to production.',
    quotedHours: 10.0,
    billable: true,
    raisedToSap: true
  },
  {
    id: 'SST-MM-1007',
    title: 'MM: Purchase Order Workflow Stalled at Director Level',
    description: 'Purchase orders above $100k do not trigger the level-2 Director release code L2 in transaction ME29N. Check the release parameters and classification characteristics in transaction CL20N.',
    sapModule: 'MM',
    priority: 'Medium',
    status: 'In Progress - Functional',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Procurement of operations equipment is stalled.',
    quotedHours: 8.0,
    billable: true
  },
  {
    id: 'SST-MM-1008',
    title: 'MM: Stock Valuation Mismatch in Moving Avg Price',
    description: 'Stock valuation in MR11 shows duplicate invoice clearing entries. Price control was changed without matching adjustment postings, causing inconsistent MB5L status.',
    sapModule: 'MM',
    priority: 'Critical',
    status: 'Reopened',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Inventory reporting is legally incorrect, halting auditors review.',
    quotedHours: 14.0,
    billable: true,
    reopenedCount: 1
  },
  {
    id: 'SST-MM-1009',
    title: 'MM: Scheduling Agreement Configuration Update',
    description: 'Requesting updates to scheduling agreements in transaction ME31L to configure automatic delivery schedules based on material requisitions.',
    sapModule: 'MM',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Training Request',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'None. Standard process training.',
    quotedHours: 3.0,
    billable: false
  },
  {
    id: 'SST-MM-1010',
    title: 'MM: Physical Inventory Difference Posting Block',
    description: 'Transaction MI07 throws an authorization block during difference postings for storage location SL01. Check configuration of physical inventory parameters.',
    sapModule: 'MM',
    priority: 'High',
    status: 'Request for Closure',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Quarterly inventory count reconciliations cannot be completed.',
    quotedHours: 6.0,
    billable: true
  },
  {
    id: 'SST-SD-1011',
    title: 'SD: Pricing Condition Mismatch for Intercompany Billing',
    description: 'Sales Order billing under transaction VF01 shows incorrect pricing condition PI01 (Intercompany Price) mapping. Pricing procedure RVAA01 is picking up the pricing scale incorrectly.',
    sapModule: 'SD',
    priority: 'Critical',
    status: 'In Progress - Functional',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Intercompany billing invoices are blocked, halting regional financial settlements.',
    quotedHours: 10.0,
    billable: true
  },
  {
    id: 'SST-SD-1012',
    title: 'SD: Credit Limit check Overrides not Triggering GRC',
    description: 'Sales orders violating the credit limits are bypassed without triggering credit check release in transaction VKM1. This needs credit control area configuration updates in OVAK.',
    sapModule: 'SD',
    priority: 'High',
    status: 'Waiting for Hours Approval',
    ticketType: 'Enhancement Request',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Risk of shipment of goods to accounts exceeding credit bounds.',
    quotedHours: 15.0,
    billable: true
  },
  {
    id: 'SST-SD-1013',
    title: 'SD: Billing Document Blocked for Transfer to GL',
    description: 'Invoices under transaction VF02 are blocked for transfer to accounting due to missing pricing account key keys in VKOF. Need to maintain OBYC/VKOA records.',
    sapModule: 'SD',
    priority: 'Medium',
    status: 'Requirement Gathering',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Revenue recognition is delayed for Q2 shipments.',
    quotedHours: 6.0,
    billable: true
  },
  {
    id: 'SST-SD-1014',
    title: 'SD: Custom Tax Code Mapping in Pricing Procedure',
    description: 'Configure a new tax condition code UTX3 in SD pricing procedure to calculate VAT for international shipments originating from Nexa facilities.',
    sapModule: 'SD',
    priority: 'High',
    status: 'Closed',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Functional',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Ensures regulatory compliance for European client shipments.',
    quotedHours: 8.0,
    billable: true
  },
  {
    id: 'SST-SD-1015',
    title: 'SD: Shipping Point Determination Error',
    description: 'Sales Orders are resolving incorrect shipping points for storage location SL02. Verify shipping point determination rules in transaction OVL2.',
    sapModule: 'SD',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Functional',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Minor logistic delay, dispatch team manually overrides shipping points.',
    quotedHours: 4.0,
    billable: false
  },
  {
    id: 'SST-HCM-1016',
    title: 'HCM: Leave Approval Workflow Event Failure',
    description: 'Employee leave requests in ESS do not trigger the manager approval workflow. Workflow container element USER_LEAVE lacks binding with rule AC00000178.',
    sapModule: 'HCM',
    priority: 'High',
    status: 'Reopened',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Employees cannot secure leave approvals, causing escalation to HR directors.',
    quotedHours: 12.0,
    billable: true,
    reopenedCount: 1
  },
  {
    id: 'SST-HCM-1017',
    title: 'HCM: Payroll Schema Dump during Country Calculations',
    description: 'Transaction PC00_M10_CALC fails with ABAP runtime dump when executing payroll calculations for contract workers. Schema U000 processing rule is out of bounds.',
    sapModule: 'HCM',
    priority: 'Critical',
    status: 'In Progress - Functional',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Contract worker payroll run is stalled, risking labor disputes.',
    quotedHours: 20.0,
    billable: true
  },
  {
    id: 'SST-HCM-1018',
    title: 'HCM: Org Structure Tree Synchronization Error',
    description: 'Changes made in transaction PPOME are not replicating to SuccessFactors Employee Central via SAP CPI. Inspect the outbound ALE/IDoc triggers.',
    sapModule: 'HCM',
    priority: 'Medium',
    status: 'Customer Action',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Manager assignment data is desynchronized, disrupting automated approvals.',
    quotedHours: 8.0,
    billable: true,
    customerActionRequired: true
  },
  {
    id: 'SST-HCM-1019',
    title: 'HCM: Employee Subgroup Configuration Update',
    description: 'Add a new employee subgroup configuration in personnel structure table T501T to support intern hires in manufacturing divisions.',
    sapModule: 'HCM',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Functional',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Compliance with seasonal hiring policies.',
    quotedHours: 6.0,
    billable: true
  },
  {
    id: 'SST-HCM-1020',
    title: 'HCM: Payslip Layout PDF Alignment Fix',
    description: 'The standard HR payslip PDF layout via transaction PE51 has overlapping labels in the deduction summary column. Align the fields.',
    sapModule: 'HCM',
    priority: 'Low',
    status: 'Request for Closure',
    ticketType: 'Report Request',
    functionalOrTechnical: 'Functional',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Minor visual layout issue, no calculation discrepancies.',
    quotedHours: 5.0,
    billable: false
  },
  {
    id: 'SST-PM-1021',
    title: 'PM: Preventive Order Settlement Error',
    description: 'PM Work Order settlement via KO88 fails with message "Settlement rule contains error". Check cost distribution rule mapping for equipment PM-01.',
    sapModule: 'PM',
    priority: 'Medium',
    status: 'In Progress - Functional',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Maintenance cost logs cannot be posted to FICO cost centers.',
    quotedHours: 8.0,
    billable: true
  },
  {
    id: 'SST-PM-1022',
    title: 'PM: Maintenance Order Priority SLA Escalation Rules',
    description: 'Enhance preventive maintenance work order priority rules so that Critical equipment failures trigger automated pager notifications in GRC.',
    sapModule: 'PM',
    priority: 'Low',
    status: 'Waiting for Hours Approval',
    ticketType: 'Enhancement Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Aids in preventing refinery equipment failure escalations.',
    quotedHours: 12.0,
    billable: true
  },
  {
    id: 'SST-PM-1023',
    title: 'PM: Equipment Master Serial Number Link Issue',
    description: 'Equipment records in transaction IE02 are blocked for serialization modification because of historical stock log conflicts. Clear MB51 entries.',
    sapModule: 'PM',
    priority: 'Medium',
    status: 'Closed',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Functional',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Delays serialization tracking for pump replacements.',
    quotedHours: 6.0,
    billable: false
  },
  {
    id: 'SST-PM-1024',
    title: 'PM: Measurement Point Reading Import Failure',
    description: 'Interface uploading diesel engine operating hours to SAP PM measurement points via transaction IK11 is generating validation errors.',
    sapModule: 'PM',
    priority: 'High',
    status: 'Customer Action',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Preventive maintenance cycles based on run-hours are stalled.',
    quotedHours: 10.0,
    billable: true,
    customerActionRequired: true
  },
  {
    id: 'SST-PM-1025',
    title: 'PM: Maintenance Plan Schedule Recalculation',
    description: 'Recalculate scheduled cycles in IP30 for Titan refinery turbines to align with revised summer maintenance shutdowns.',
    sapModule: 'PM',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Functional',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Refinery shift realignment planning.',
    quotedHours: 4.0,
    billable: true
  },

  // --- ARJUN MEHTA (TECHNICAL: ABAP, BASIS, CPI, FIORI, SECURITY) ---
  {
    id: 'SST-ABAP-1026',
    title: 'ABAP: Runtime Dump in Custom Delivery Program',
    description: 'Custom program ZSD_DELIVERY_EXPORT fails with ABAP dump "GET_WA_NOT_ASSIGNED" in field symbol assignments. This happens during billing document extraction.',
    sapModule: 'ABAP',
    priority: 'Critical',
    status: 'In Progress - Technical',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Daily shipping export manifest files cannot be transferred, halting custom clearances.',
    quotedHours: 12.0,
    billable: true
  },
  {
    id: 'SST-ABAP-1027',
    title: 'ABAP: PDF Invoice Form Layout Adjustment',
    description: 'ZFI_INVOICE_PDF requires layout modifications. Vendor bank IBAN and SWIFT code fields need to be moved to the header panel for regional entities.',
    sapModule: 'ABAP',
    priority: 'Medium',
    status: 'Waiting for Hours Approval',
    ticketType: 'Report Request',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Invoices printed for German clients are legally non-compliant until layout update.',
    quotedHours: 10.0,
    billable: true
  },
  {
    id: 'SST-ABAP-1028',
    title: 'ABAP: BAdI Implementation for Goods Receipt Validation',
    description: 'Implement custom validation logic in BAdI MB_DOCUMENT_BADI method MB_DOCUMENT_BEFORE_UPDATE to check shelf life validation code configurations.',
    sapModule: 'ABAP',
    priority: 'High',
    status: 'In Progress - Technical',
    ticketType: 'Enhancement Request',
    functionalOrTechnical: 'Technical',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Prevents warehouse staff from checking in materials with expired shelf lives.',
    quotedHours: 18.0,
    billable: true
  },
  {
    id: 'SST-ABAP-1029',
    title: 'ABAP: OData API Performance Slowdown in ZGW_INVENTORY',
    description: 'Custom gateway service OData entity set InventorySet takes over 14 seconds to respond. Profile SQL queries in SE30/ST05 and optimize database index usage.',
    sapModule: 'ABAP',
    priority: 'Medium',
    status: 'Customer Action',
    ticketType: 'Enhancement Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Warehouse scanner app crashes due to gateway connection timeouts.',
    quotedHours: 16.0,
    billable: true,
    customerActionRequired: true
  },
  {
    id: 'SST-ABAP-1030',
    title: 'ABAP: Custom Report ZFI_LEDGER Optimization',
    description: 'Select queries inside ZFI_LEDGER contain nested loops over table BSEG. Refactor with INNER JOINs on BKPF/BSID and implement hashed internal tables.',
    sapModule: 'ABAP',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Report Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'None. Financial ledger report runs overnight anyway.',
    quotedHours: 14.0,
    billable: true
  },
  {
    id: 'SST-BASIS-1031',
    title: 'BASIS: Background Job BTC_PAYROLL Mismatch Timeout',
    description: 'Regular nightly batch job BTC_PAYROLL fails with error code BTC_TIMEOUT. Check work process allocations and memory parameters in profile rdisp/max_wprun_time.',
    sapModule: 'BASIS',
    priority: 'High',
    status: 'Raised to SAP',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Nightly batch runs are delayed, impacting system responsiveness for morning shifts.',
    quotedHours: 10.0,
    billable: true,
    raisedToSap: true
  },
  {
    id: 'SST-BASIS-1032',
    title: 'BASIS: Sandbox System Refresh Post-Checklist Execution',
    description: 'Execute post-system refresh activities on sandbox client SND90. Perform BD54 logical system renaming, SECSTORE cleanup, and SM59 RFC rebuilds.',
    sapModule: 'BASIS',
    priority: 'Critical',
    status: 'In Progress - Technical',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Development team is blocked from sandbox usage until refresh validation completes.',
    quotedHours: 24.0,
    billable: true
  },
  {
    id: 'SST-BASIS-1033',
    title: 'BASIS: RFC Connection Timeout to External Bank Portal',
    description: 'RFC destination BANK_CITI_SECURE fails test connection with error "Route permission denied". Verify saproute configurations and network firewalls.',
    sapModule: 'BASIS',
    priority: 'Medium',
    status: 'Requirement Gathering',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Outbound payment files cannot be transmitted automatically.',
    quotedHours: 6.0,
    billable: true
  },
  {
    id: 'SST-BASIS-1034',
    title: 'BASIS: STMS Import Return Code 8 Troubleshooting',
    description: 'Transport DEVK981242 fails to import to QAS with RC 8. Database activation error indicates table enhancements overlap with another package.',
    sapModule: 'BASIS',
    priority: 'High',
    status: 'Reopened',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'CR delivery timeline is delayed due to import failure.',
    quotedHours: 8.0,
    billable: true,
    reopenedCount: 1
  },
  {
    id: 'SST-BASIS-1035',
    title: 'BASIS: Kernel Upgrade Post-Validation Audit',
    description: 'Perform system checks and logs auditing after upgrading SAP Kernel to PL 400. Inspect ST22, SM21, and alert monitors.',
    sapModule: 'BASIS',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Scheduled maintenance audit.',
    quotedHours: 6.0,
    billable: false
  },
  {
    id: 'SST-CPI-1036',
    title: 'CPI: IDoc Integration Flow Failure for Sales Orders',
    description: 'SAP CPI flow "ERP_to_Salesforce_Order_Sync" is failing in message monitoring. The incoming IDoc payload violates schema validations due to missing partner segments.',
    sapModule: 'CPI/Integration',
    priority: 'Critical',
    status: 'In Progress - Technical',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Sales reps cannot track customer order statuses in Salesforce.',
    quotedHours: 8.0,
    billable: true
  },
  {
    id: 'SST-CPI-1037',
    title: 'CPI: IDoc to REST API Mapping Error',
    description: 'CPI integration flow throwing outbound payload errors. The JSON mapping template does not support escape characters in the customer comments fields.',
    sapModule: 'CPI/Integration',
    priority: 'High',
    status: 'Raised to SAP',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Customer shipments logs are missing dispatch records.',
    quotedHours: 12.0,
    billable: true,
    raisedToSap: true
  },
  {
    id: 'SST-CPI-1038',
    title: 'CPI: OAuth Certificate Token Renewal in Security Material',
    description: 'CITI bank integration OAuth certificate expires next week. Update keystore and security material configs in CPI cockpit.',
    sapModule: 'CPI/Integration',
    priority: 'Medium',
    status: 'Waiting for Hours Approval',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Payments processing will fail if token expires.',
    quotedHours: 4.0,
    billable: true
  },
  {
    id: 'SST-CPI-1039',
    title: 'CPI: SuccessFactors Employee Sync Flow Error',
    description: 'Daily synchronization flow SFSF_ECC_Master_Sync fails to process address records containing special European diacritics. Check character encoding.',
    sapModule: 'CPI/Integration',
    priority: 'Critical',
    status: 'Requirement Gathering',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Hiring reports are out of sync.',
    quotedHours: 10.0,
    billable: true
  },
  {
    id: 'SST-CPI-1040',
    title: 'CPI: Blocked Queues in Message Monitor Clean up',
    description: 'Clean up persistent blocked threads in the CPI message processing monitoring queues stemming from decommissioned vendor endpoints.',
    sapModule: 'CPI/Integration',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Minor cleanup, no critical impact.',
    quotedHours: 3.0,
    billable: false
  },
  {
    id: 'SST-FIORI-1041',
    title: 'Fiori: Catalog Role Authorization Failure',
    description: 'Custom catalog ZCAT_MM_APPROVER is not displaying tiles to purchase order approvers. Standard launchpad catalog node assignment is missing GRC roles.',
    sapModule: 'Fiori',
    priority: 'High',
    status: 'In Progress - Technical',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Approvers must log in via SAP GUI as a workaround, slowing mobile operations.',
    quotedHours: 8.0,
    billable: true
  },
  {
    id: 'SST-FIORI-1042',
    title: 'Fiori: Custom App Blank Screen post Gateway Upgrade',
    description: 'Custom app ZTRACK_SHIPMENT displays a blank white screen post gateway service pack upgrade. Check console logs for component loading failures.',
    sapModule: 'Fiori',
    priority: 'Critical',
    status: 'Reopened',
    ticketType: 'Incident',
    functionalOrTechnical: 'Technical',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Shipment loaders at dispatch docks cannot update status from handhelds.',
    quotedHours: 16.0,
    billable: true,
    reopenedCount: 1
  },
  {
    id: 'SST-FIORI-1043',
    title: 'Fiori: Launchpad Catalog Tile Configuration',
    description: 'Configure new tile catalog mappings for transaction S_ALR_87012357 (Tax Report) to support finance dashboard launch.',
    sapModule: 'Fiori',
    priority: 'Medium',
    status: 'Customer Action',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Delays finance users migration to web entry.',
    quotedHours: 6.0,
    billable: true,
    customerActionRequired: true
  },
  {
    id: 'SST-FIORI-1044',
    title: 'Fiori: Cache Clearing Post-BSP App Deployment',
    description: 'Run cache clear programs /UI2/INVALIDATE_CLIENT_CACHES and Invalidate UI5 metadata caches post transport deployment.',
    sapModule: 'Fiori',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'Standard post-go-live routine.',
    quotedHours: 3.0,
    billable: false
  },
  {
    id: 'SST-FIORI-1045',
    title: 'Fiori: Custom Theme Designer CSS Alignment Fix',
    description: 'Corporate logo alignment shifts during screen resizing. Adjust theme CSS stylesheet rules in Theme Designer.',
    sapModule: 'Fiori',
    priority: 'Low',
    status: 'Request for Closure',
    ticketType: 'Enhancement Request',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Robert Miller',
    businessImpact: 'Minor styling mismatch, no functionality issues.',
    quotedHours: 6.0,
    billable: true
  },
  {
    id: 'SST-SECURITY-1046',
    title: 'Security: Critical Role Authorization Mapping Error',
    description: 'Mass user assignment script added transaction SCC4 (Client Administration) access to basic developer roles. Revoke immediately and run user comparison.',
    sapModule: 'Security/GRC',
    priority: 'High',
    status: 'In Progress - Technical',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    businessImpact: 'Huge security audit violation risk if unchecked.',
    quotedHours: 10.0,
    billable: true
  },
  {
    id: 'SST-SECURITY-1047',
    title: 'Security: SOD Conflict Analysis in GRC Access Control',
    description: 'Inspect Segregation of Duties (SOD) alerts for purchasing department. Users hold both purchase order creation and payment authorization roles.',
    sapModule: 'Security/GRC',
    priority: 'Critical',
    status: 'Requirement Gathering',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Technical',
    organization: 'Nexa Manufacturing',
    requestedBy: 'Nitin Sharma',
    businessImpact: 'High risk of compliance failure under SOX audits.',
    quotedHours: 15.0,
    billable: true
  },
  {
    id: 'SST-SECURITY-1048',
    title: 'Security: Single Sign-On (SSO) Role Mapping Config',
    description: 'Configure Kerberos-based SSO mapping rules for Active Directory accounts to secure GUI logons without passwords.',
    sapModule: 'Security/GRC',
    priority: 'Medium',
    status: 'Waiting for Hours Approval',
    ticketType: 'Configuration Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'SSO rollout delays increase helpdesk password resets volume.',
    quotedHours: 12.0,
    billable: true
  },
  {
    id: 'SST-SECURITY-1049',
    title: 'Security: Firefighter Log Review Audit Check',
    description: 'Perform regular audit review of emergency Firefighter logs logged during the production system patch run.',
    sapModule: 'Security/GRC',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Report Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Routine security audit.',
    quotedHours: 4.0,
    billable: true
  },
  {
    id: 'SST-SECURITY-1050',
    title: 'Security: Mass Role Authorization Copy Script',
    description: 'Clone corporate authorization template roles to support onboarding of new support contractors in South Africa.',
    sapModule: 'Security/GRC',
    priority: 'Low',
    status: 'Closed',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    organization: 'Titan Energy Corp',
    requestedBy: 'David Vance',
    businessImpact: 'Contractor onboarding support.',
    quotedHours: 5.0,
    billable: false
  }
];

// --- Inflation Helper ---
const inflateTickets = (): Ticket[] => {
  return TICKET_TEMPLATES.map((tmpl, idx) => {
    const isFunctional = tmpl.functionalOrTechnical === 'Functional';
    const consultantName = isFunctional ? 'Priya Raman' : 'Arjun Mehta';
    const consultantEmail = isFunctional ? 'consultant@sap.com' : 'arjun.technical@example.com';
    const consultantId = isFunctional ? 'usr-consult-333' : 'usr-consult-444';

    // Base Date setups
    const daysAgo = 5 + (idx % 10);
    const createdAt = getPastDate(daysAgo * 24);
    const updatedAt = getPastDate((daysAgo - 3) * 24);

    // SLA calculations
    const isBreached = tmpl.priority === 'Critical' && idx % 3 === 0;
    const slaDueAt = isBreached
      ? getPastDate(48) // past due date
      : getFutureDate(48 + (idx % 4) * 24); // future due date

    const hourEstimates: TicketHourEstimate[] = [];
    const closureRequests: TicketClosureRequest[] = [];
    const efforts: TicketConsultantEffort[] = [];
    const history: AuditHistory[] = [
      {
        id: `h-init-${tmpl.id}`,
        ticketId: tmpl.id,
        changedBy: 'System',
        fieldChanged: 'Status',
        oldValue: 'New',
        newValue: 'Assigned',
        createdAt: getPastDate(daysAgo * 24)
      },
      {
        id: `h-assign-${tmpl.id}`,
        ticketId: tmpl.id,
        changedBy: 'Marcus Vance',
        fieldChanged: 'Assigned Consultant',
        oldValue: 'Unassigned',
        newValue: consultantName,
        createdAt: getPastDate(daysAgo * 24 - 1)
      }
    ];

    const comments: Comment[] = [
      {
        id: `c-init-${tmpl.id}`,
        ticketId: tmpl.id,
        authorName: tmpl.requestedBy,
        authorEmail: tmpl.organization === 'Apex Global Industries' ? 'customer@sap.com' : 'user@client.com',
        authorRole: 'Customer' as const,
        content: tmpl.description,
        isInternal: false,
        createdAt: createdAt
      }
    ];

    // Status: Waiting for Hours Approval
    if (tmpl.status === 'Waiting for Hours Approval' || tmpl.status === 'In Progress' || tmpl.status === 'In Progress - Functional' || tmpl.status === 'In Progress - Technical' || tmpl.status === 'Customer Action' || tmpl.status === 'Raised to SAP' || tmpl.status === 'Request for Closure' || tmpl.status === 'Closed' || tmpl.status === 'Reopened') {
      hourEstimates.push({
        id: `est-${tmpl.id}`,
        ticketId: tmpl.id,
        consultantId: consultantName,
        functionalEstimatedHours: isFunctional ? tmpl.quotedHours : 0,
        technicalEstimatedHours: !isFunctional ? tmpl.quotedHours : 0,
        totalEstimatedHours: tmpl.quotedHours,
        remarks: 'Estimation mapped based on initial scoping validation check.',
        status: tmpl.status === 'Waiting for Hours Approval' ? ('Submitted' as const) : ('Revision Approved' as const),
        submittedAt: getPastDate((daysAgo - 1) * 24),
        approvedBy: 'Marcus Vance',
        approvedAt: getPastDate((daysAgo - 1) * 24 - 2),
        createdAt: getPastDate((daysAgo - 1) * 24),
        updatedAt: getPastDate((daysAgo - 1) * 24)
      });

      comments.push({
        id: `c-est-${tmpl.id}`,
        ticketId: tmpl.id,
        authorName: consultantName,
        authorEmail: consultantEmail,
        authorRole: 'Consultant' as const,
        content: `Scope validated. Quoted ${tmpl.quotedHours} hours for the initial setup. Awaiting validation parameters.`,
        isInternal: false,
        createdAt: getPastDate((daysAgo - 1) * 24)
      });
    }

    // Status: In Progress
    if (tmpl.status === 'In Progress' || tmpl.status === 'In Progress - Functional' || tmpl.status === 'In Progress - Technical' || tmpl.status === 'Customer Action' || tmpl.status === 'Raised to SAP' || tmpl.status === 'Request for Closure' || tmpl.status === 'Closed' || tmpl.status === 'Reopened') {
      efforts.push({
        id: `eff-${tmpl.id}`,
        ticketId: tmpl.id,
        consultantId: consultantId,
        consultantName: consultantName,
        consultantType: tmpl.functionalOrTechnical,
        estimatedHours: tmpl.quotedHours,
        actualHours: tmpl.quotedHours * 0.8,
        remarks: 'Analyzing structures and configuring prototype.',
        createdAt: getPastDate((daysAgo - 2) * 24),
        updatedAt: getPastDate((daysAgo - 2) * 24)
      });

      comments.push({
        id: `c-progress-${tmpl.id}`,
        ticketId: tmpl.id,
        authorName: consultantName,
        authorEmail: consultantEmail,
        authorRole: 'Consultant' as const,
        content: `Prototype complete. Initiating testing procedures.`,
        isInternal: true,
        createdAt: getPastDate((daysAgo - 2) * 24)
      });
    }

    // Status: Customer Action
    if (tmpl.status === 'Customer Action') {
      comments.push({
        id: `c-custaction-${tmpl.id}`,
        ticketId: tmpl.id,
        authorName: consultantName,
        authorEmail: consultantEmail,
        authorRole: 'Consultant' as const,
        content: `Hi ${tmpl.requestedBy}, could you please provide a fresh screenshot of the transaction log? Connection failed under current parameters.`,
        isInternal: false,
        createdAt: getPastDate(12)
      });
    }

    // Status: Raised to SAP
    if (tmpl.status === 'Raised to SAP') {
      comments.push({
        id: `c-sap-${tmpl.id}`,
        ticketId: tmpl.id,
        authorName: consultantName,
        authorEmail: consultantEmail,
        authorRole: 'Consultant' as const,
        content: `Raised ticket under OSS component BC-SEC-LGN with SAP support (Ref: 0029384/2026). Awaiting response from their L3 engineers.`,
        isInternal: false,
        createdAt: getPastDate(20)
      });
    }

    // Status: Request for Closure / Closed / Reopened
    if (tmpl.status === 'Request for Closure' || tmpl.status === 'Closed' || tmpl.status === 'Reopened') {
      const clsStatus = tmpl.status === 'Request for Closure'
        ? ('Pending Manager Approval' as const)
        : tmpl.status === 'Closed'
          ? ('Approved' as const)
          : ('Rejected' as const);

      const actHours = tmpl.quotedHours * 0.9;
      closureRequests.push({
        id: `cls-${tmpl.id}`,
        ticketId: tmpl.id,
        requestedBy: consultantName,
        functionalActualHours: isFunctional ? actHours : 0,
        technicalActualHours: !isFunctional ? actHours : 0,
        totalActualHours: actHours,
        workCompletedSummary: `Implemented mapping corrections, validated via testing and logged transport.`,
        rootCause: `Configuration mismatch in target master settings.`,
        resolutionSummary: `Aligned OB52 keys / program filters to default parameters.`,
        status: clsStatus,
        managerApprovalStatus: (clsStatus === 'Approved' ? 'Approved' : clsStatus === 'Rejected' ? 'Rejected' : 'Pending') as any,
        managerApprovedBy: clsStatus === 'Approved' ? 'Marcus Vance' : undefined,
        managerApprovedAt: clsStatus === 'Approved' ? getPastDate(6) : undefined,
        rejectionReason: clsStatus === 'Rejected' ? 'Requested hours calculation correction.' : undefined,
        createdAt: getPastDate(8),
        updatedAt: getPastDate(6)
      });

      if (tmpl.status === 'Closed') {
        comments.push({
          id: `c-closed-${tmpl.id}`,
          ticketId: tmpl.id,
          authorName: 'Marcus Vance',
          authorEmail: 'manager@sap.com',
          authorRole: 'Manager' as const,
          content: 'Resolution verified. Closing the ticket and archiving log mappings.',
          isInternal: false,
          createdAt: getPastDate(6)
        });
      } else if (tmpl.status === 'Reopened') {
        comments.push({
          id: `c-reopen-${tmpl.id}`,
          ticketId: tmpl.id,
          authorName: tmpl.requestedBy,
          authorEmail: 'customer@sap.com',
          authorRole: 'Customer' as const,
          content: 'Reopening. The error occurred again during invoice runs in transaction FB60. Please check parallel ledgers.',
          isInternal: false,
          createdAt: getPastDate(4)
        });
      }
    }

    return {
      id: tmpl.id,
      title: tmpl.title,
      description: tmpl.description,
      organization: tmpl.organization,
      requestedBy: tmpl.requestedBy,
      requestedByEmail: tmpl.organization === 'Apex Global Industries' ? 'customer@sap.com' : 'user@client.com',
      sapModule: tmpl.sapModule,
      category: isFunctional ? 'Functional Issue' : 'Technical Issue',
      priority: tmpl.priority,
      status: tmpl.status,
      assignedManager: 'Marcus Vance',
      assignedConsultant: consultantName,
      slaDueAt: slaDueAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      billable: tmpl.billable,
      escalationFlag: tmpl.priority === 'Critical',
      approvalRequiredFlag: false,
      source: 'Created by Client',
      ticketType: tmpl.ticketType,
      functionalOrTechnical: tmpl.functionalOrTechnical,
      businessImpact: tmpl.businessImpact,
      expectedResolutionDate: getFutureDate(72).split('T')[0],
      quotedHours: tmpl.quotedHours,
      raisedToSap: tmpl.raisedToSap || false,
      reopenedCount: tmpl.reopenedCount || 0,
      customerActionRequired: tmpl.customerActionRequired || false,
      currentOwner: consultantName,
      nextActionOwner: tmpl.status === 'Customer Action' ? tmpl.requestedBy : consultantName,
      comments: comments,
      attachments: [],
      efforts: [],
      history: history,
      hourEstimates: hourEstimates,
      closureRequests: closureRequests,
      unlockRequests: []
    };
  });
};

export const MOCK_TICKETS: Ticket[] = inflateTickets();

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    userId: 'manager@sap.com',
    title: 'New High Priority Ticket Submitted',
    message: 'Sarah Jenkins (Apex Global) created SST-FICO-1001: "Invoice Posting Error".',
    ticketId: 'SST-FICO-1001',
    isRead: false,
    createdAt: getPastDate(1.5)
  },
  {
    id: 'n-2',
    userId: 'consultant@sap.com',
    title: 'Ticket Assigned To You',
    message: 'Marcus Vance assigned SST-FICO-1001 to your queue.',
    ticketId: 'SST-FICO-1001',
    isRead: false,
    createdAt: getPastDate(1.3)
  }
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 'l-1',
    actor: 'Marcus Vance',
    action: 'Assign Ticket',
    target: 'SST-FICO-1001',
    details: 'Assigned to consultant Priya Raman.',
    timestamp: getPastDate(1.3)
  }
];

export const FAQ_MOCK: Record<SAPModule, string[]> = {
  FICO: [
    'How do I clear general ledger balances using transaction F-03?',
    'What causes error AA617 during depreciation runs, and how is AFAB restarted?',
    'Steps to adjust financial accounting periods in OB52.'
  ],
  MM: [
    'How to release blocked purchase orders via ME28 or ME29N.',
    'Common errors when executing physical inventory counts in MI07.',
    'Resolving account determination mismatch BSX/WRX in OBYC.'
  ],
  SD: [
    'Maintaining condition records for custom taxes in transaction VK11.',
    'Steps to release credit block on sales orders in VKM1 / VKM4.',
    'Debugging intercompany billing pricing mismatch PI01.'
  ],
  PP: [
    'Why is MRP not generating planned orders for custom materials?',
    'Closing production orders with remaining variances in CO11N.'
  ],
  PM: [
    'Creating preventive maintenance cycle schedules in IP42.',
    'Configuring order release triggers for technical components.'
  ],
  QM: [
    'How to record inspection lot results for master records.'
  ],
  HCM: [
    'Configuring work schedules and calendar generations.'
  ],
  SuccessFactors: [
    'How to map employee data fields from ECC core to SuccessFactors Central.'
  ],
  BASIS: [
    'How to check system processes logs in SM50/SM66.',
    'Steps to import transport requests manually in STMS.',
    'Configuring RFC connections in transaction SM59.'
  ],
  ABAP: [
    'Standard design rules for implementing custom BAdIs.',
    'Adding fields to standard table VBRK with screen extensions.'
  ],
  'Security/GRC': [
    'Steps to configure Single Sign-On (SSO) for GUI logins.'
  ],
  'CPI/Integration': [
    'Debugging message flows in CPI dashboard.'
  ],
  'BW/BI': [
    'Reloading failing delta loads from datasource extractor.'
  ],
  Fiori: [
    'Clearing Fiori Launchpad caches after deploying custom BSP applications.'
  ],
  TRM: [
    'Managing interest rate structures in cash desks.'
  ]
};

export const MOCK_CONTACTS: CustomerContact[] = [
  {
    id: 'cc-1',
    organizationName: 'Apex Global Industries',
    name: 'Sarah Jenkins',
    designation: 'IT Director & Global Lead',
    email: 'customer@sap.com',
    phone: '+1 (555) 123-4567',
    isPrimary: true,
    isSecondary: false
  },
  {
    id: 'cc-2',
    organizationName: 'Apex Global Industries',
    name: 'Robert Miller',
    designation: 'MM Business Analyst',
    email: 'robert@apexglobal.com',
    phone: '+1 (555) 765-4321',
    isPrimary: false,
    isSecondary: true
  },
  {
    id: 'cc-3',
    organizationName: 'Titan Energy Corp',
    name: 'David Vance',
    designation: 'Finance Operations Lead',
    email: 'david@titanenergy.com',
    phone: '+1 (555) 901-2345',
    isPrimary: true,
    isSecondary: false
  },
  {
    id: 'cc-4',
    organizationName: 'Nexa Manufacturing',
    name: 'Nitin Sharma',
    designation: 'SAP Basis Lead Specialist',
    email: 'nitin@nexamfg.com',
    phone: '+1 (555) 345-6789',
    isPrimary: true,
    isSecondary: false
  }
];
