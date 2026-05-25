import {
  Ticket,
  CustomerContract,
  KnowledgebaseArticle,
  KnowledgebaseCategory,
  Notification,
  SAPModule,
  CustomerContact,
  TicketDeleteRequest
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
    ratingsSum: 38, // Avg: 4.75
    content: `
# MM: Configuring Release Strategy for Purchase Orders

This guide outlines the standard setup for Purchase Order (PO) Release Strategies using release codes and release groups.

## 1. Define Release Procedure for POs
Go to **SPRO** -> **Materials Management** -> **Purchasing** -> **Purchase Order** -> **Release Procedure for Purchase Orders** -> **Define Release Procedure for Purchase Orders**.

Here, define:
* **Release Groups**: (e.g., \`01\` - Purchase Order)
* **Release Codes**: (e.g., \`L1\` - Manager, \`L2\` - Director, \`L3\` - VP)
* **Release Indicator**: (e.g., \`0\` - Blocked, \`1\` - Released)
* **Release Strategies**: Assign codes, indicators, and release prerequisites.

## 2. Define Characteristics (CT04)
Create characteristics referencing structure \`CEBAN\` (for purchase requisitions) or \`CEKKO\` (for purchase orders).
* For PO Value: characteristic mapped to table \`CEKKO\`, field \`GNETW\` (Net order value).
* For Document Type: characteristic mapped to \`CEKKO\`, field \`BSART\`.

## 3. Define Class (CL02)
Assign characteristics to a class with class type **032** (Release Strategy).

## 4. Setup Classifications
In **SPRO** or using transaction **CL20N**, maintain values for each strategy. For example:
* **Strategy P1**: PO value > $50,000 -> requires \`L1\` and \`L2\`.
    `,
    createdAt: getPastDate(120),
    updatedAt: getPastDate(90)
  },
  {
    id: 'kb-2',
    categoryId: 'cat-2',
    categoryName: 'Technical Troubleshooting',
    title: 'ABAP: Implementing Screen Enhancements in VF01/VF02',
    slug: 'abap-implementing-screen-enhancements-vf01-vf02',
    sapModule: 'ABAP',
    isInternal: true,
    authorName: 'Karthik Subramanian',
    ratingsCount: 4,
    ratingsSum: 20, // Avg: 5.0
    content: `
# ABAP: Screen Enhancements in Billing Documents

To append custom fields to billing documents (VF01/VF02), follow these steps.

## Step 1: Append Fields to VBRK Table
Extend standard table **VBRK** using an append structure:
1. Open transaction **SE11**, select Database Table \`VBRK\`.
2. Click **Append Structure...** and create a new append (e.g., \`ZVBRK_ENH\`).
3. Add custom fields, starting with prefix \`ZZ_\` (e.g., \`ZZ_TAX_COMP\` of type \`CHAR10\`).

## Step 2: Implement User Exits
Screen fields must be populated during document billing creation in program **RV60AFZZ**:
* Use exit **USEREXIT_NUMBER_RANGE** or **USEREXIT_FILL_VBRK_VBRP** to copy values from sales order (\`VBAK\`/\`VBAP\`) to the billing header.
* Example Code:
\`\`\`abap
FORM USEREXIT_FILL_VBRK_VBRP.
  IF vbrk-zz_tax_comp IS INITIAL.
    " Map zz_tax_comp from VBAK header
    SELECT SINGLE zz_tax_comp FROM vbak INTO vbrk-zz_tax_comp
      WHERE vbeln = vbrp-aubel.
  ENDIF.
ENDFORM.
\`\`\`
    `,
    createdAt: getPastDate(80),
    updatedAt: getPastDate(75)
  },
  {
    id: 'kb-3',
    categoryId: 'cat-4',
    categoryName: 'BASIS, Authorizations & Transport Management',
    title: 'BASIS: Resolving STMS Import Return Code 8 Errors',
    slug: 'basis-resolving-stms-import-return-code-8',
    sapModule: 'BASIS',
    isInternal: false,
    authorName: 'Elena Rostova',
    ratingsCount: 15,
    ratingsSum: 71, // Avg: 4.7
    content: `
# BASIS: Troubleshooting STMS Return Code 8

Return Code 8 indicates a transport import failed with errors (activation errors, syntax errors, or missing prerequisites).

## Common Causes & Fixes
1. **Missing Dependent Objects**: The transport relies on an active structure or data element that lives in a separate, unreleased transport.
   * **Fix**: Find the missing object in transaction \`SE11\` and verify its transport. Import the prerequisite transport first.
2. **Table Activation Failure**: Database errors during structural conversion.
   * **Fix**: Inspect the activation log via transaction \`SE14\` (Database Utility) and activate the object manually.
3. **Syntax Error in Program**: Program syntax failed during compilation post-import.
   * **Fix**: Run syntax check (\`Ctrl+F2\`) in target environment and import necessary correction transports.
    `,
    createdAt: getPastDate(60),
    updatedAt: getPastDate(60)
  }
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'SST-MM-1024',
    title: 'MM: Purchase Order Release Strategy Failure',
    description: 'Purchase Orders above $50k are not triggering the level 2 approval workflow (Director release). They are remaining in blocked status but without any workflow items sent to the approver. Checked release codes and release groups, config looks correct. Need urgent resolution as this is delaying critical procurement.',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    requestedByEmail: 'customer@sap.com',
    sapModule: 'MM',
    category: 'Functional Issue',
    priority: 'Critical',
    status: 'In Progress',
    assignedManager: 'Marcus Vance',
    assignedConsultant: 'Karthik Subramanian',
    slaDueAt: getFutureDate(2.5),
    createdAt: getPastDate(1.5),
    updatedAt: getPastDate(0.5),
    billable: true,
    escalationFlag: false,
    approvalRequiredFlag: false,
    source: 'Created by Client',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    businessImpact: 'Blocked procurement of manufacturing raw materials. Delaying assembly production cycles.',
    expectedResolutionDate: getFutureDate(4).split('T')[0],
    quotedHours: 6.0,
    raisedToSap: false,
    reopenedCount: 0,
    customerActionRequired: false,
    currentOwner: 'Karthik Subramanian',
    nextActionOwner: 'Karthik Subramanian',
    escalations: [],
    createdByName: 'Sarah Jenkins',
    createdByUser: 'cust-1',
    softDeleteStatus: 'Active',
    sapModules: ['MM', 'FICO'],
    deleteRequests: [],
    comments: [
      {
        id: 'c1',
        ticketId: 'SST-MM-1024',
        authorName: 'Sarah Jenkins',
        authorEmail: 'customer@sap.com',
        authorRole: 'Customer',
        content: 'Workflow failed for PO #4500123984. Approver checked their SAP inbox and SBWP, nothing there.',
        isInternal: false,
        createdAt: getPastDate(1.5)
      },
      {
        id: 'c2',
        ticketId: 'SST-MM-1024',
        authorName: 'Karthik Subramanian',
        authorEmail: 'consultant@sap.com',
        authorRole: 'Consultant',
        content: 'Hi Sarah, I am analyzing the issue. Running workflow diagnosis transaction SWI1/SWUD to inspect the release event trigger. I suspect a synchronization issue in the agent assignment. Will update shortly.',
        isInternal: false,
        createdAt: getPastDate(0.8)
      },
      {
        id: 'c2_int',
        ticketId: 'SST-MM-1024',
        authorName: 'Karthik Subramanian',
        authorEmail: 'consultant@sap.com',
        authorRole: 'Consultant',
        content: 'INTERNAL NOTE: Found that agent assignment for release code L2 is set as a specific user who left the company last week. Need Manager approval to update agent mapping or assign fallback position.',
        isInternal: true,
        createdAt: getPastDate(0.5)
      }
    ],
    attachments: [
      {
        id: 'a1',
        ticketId: 'SST-MM-1024',
        fileName: 'PO_Blocked_Screen.png',
        filePath: '/files/PO_Blocked_Screen.png',
        fileUrl: '/files/PO_Blocked_Screen.png',
        fileType: 'image/png',
        fileSize: 420000,
        uploadedBy: 'Sarah Jenkins',
        visibility: 'public',
        createdAt: getPastDate(1.5)
      }
    ],
    efforts: [
      {
        id: 'e1',
        ticketId: 'SST-MM-1024',
        consultantName: 'Karthik Subramanian',
        hoursLogged: 1.5,
        startTime: '09:00',
        endTime: '10:30',
        activityDate: getPastDate(0).split('T')[0],
        description: 'Analyzing CEKKO classifications and tracing SWI1 logs.',
        activityType: 'Analysis',
        billable: true,
        status: 'Approved',
        createdAt: getPastDate(0.5)
      }
    ],
    history: [
      {
        id: 'h1',
        ticketId: 'SST-MM-1024',
        changedBy: 'System',
        fieldChanged: 'Status',
        oldValue: 'New',
        newValue: 'Assigned',
        createdAt: getPastDate(1.4)
      },
      {
        id: 'h2',
        ticketId: 'SST-MM-1024',
        changedBy: 'Marcus Vance',
        fieldChanged: 'Assigned Consultant',
        oldValue: 'Unassigned',
        newValue: 'Karthik Subramanian',
        createdAt: getPastDate(1.3)
      },
      {
        id: 'h3',
        ticketId: 'SST-MM-1024',
        changedBy: 'Karthik Subramanian',
        fieldChanged: 'Status',
        oldValue: 'Assigned',
        newValue: 'In Progress',
        createdAt: getPastDate(0.8)
      }
    ]
  },
  {
    id: 'SST-FICO-1023',
    title: 'FICO: Asset Ledger Discrepancy during Depreciation Run',
    description: 'During the AFAB depreciation execution in QAS, we are getting error AA617 "Asset balance invalid". The asset general ledger accounts do not reconcile with the asset subledger for code 1000. It seems a manual GL posting was allowed on the reconciliation account.',
    organization: 'Titan Energy Corp',
    requestedBy: 'Marcus Vance',
    requestedByEmail: 'manager@sap.com',
    sapModule: 'FICO',
    category: 'Functional Issue',
    priority: 'High',
    status: 'New',
    assignedManager: 'Marcus Vance',
    slaDueAt: getFutureDate(5),
    createdAt: getPastDate(3),
    updatedAt: getPastDate(3),
    billable: true,
    escalationFlag: false,
    approvalRequiredFlag: false,
    source: 'Created by Client',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    businessImpact: 'Inability to close financial books for the current asset accounting period.',
    expectedResolutionDate: getFutureDate(2).split('T')[0],
    quotedHours: 10.0,
    raisedToSap: false,
    reopenedCount: 0,
    customerActionRequired: false,
    currentOwner: 'Marcus Vance',
    nextActionOwner: 'Marcus Vance',
    escalations: [],
    createdByName: 'Marcus Vance',
    createdByUser: 'mgr-1',
    softDeleteStatus: 'Active',
    sapModules: ['FICO'],
    deleteRequests: [],
    comments: [],
    attachments: [],
    efforts: [],
    history: []
  },
  {
    id: 'SST-ABAP-1022',
    title: 'ABAP: Add Custom Fields to SD Billing Document (VF01)',
    description: 'Request to add "Tax Compliance Code" (ZZ_TAX_COMP) to the header of the billing document VF01/VF02. We need to implement this in the screen enhancement VBRK and populate the field from the sales order item. Field is already appended to VBRK table.',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    requestedByEmail: 'customer@sap.com',
    sapModule: 'ABAP',
    category: 'Enhancement Request',
    priority: 'Medium',
    status: 'In Progress',
    assignedManager: 'Marcus Vance',
    assignedConsultant: 'Rajesh Kumar',
    transportRequest: 'DEVK903429',
    slaDueAt: getFutureDate(36),
    createdAt: getPastDate(12),
    updatedAt: getPastDate(2),
    billable: true,
    escalationFlag: false,
    approvalRequiredFlag: false,
    source: 'Created by Client',
    ticketType: 'Enhancement Request',
    functionalOrTechnical: 'Technical',
    businessImpact: 'Necessary for local tax compliance reporting updates inside Billing printouts.',
    expectedResolutionDate: getFutureDate(10).split('T')[0],
    quotedHours: 40.0,
    raisedToSap: false,
    reopenedCount: 0,
    customerActionRequired: false,
    currentOwner: 'Rajesh Kumar',
    nextActionOwner: 'Rajesh Kumar',
    escalations: [],
    createdByName: 'Sarah Jenkins',
    createdByUser: 'cust-1',
    softDeleteStatus: 'Active',
    sapModules: ['ABAP', 'SD'],
    deleteRequests: [],
    comments: [
      {
        id: 'c3',
        ticketId: 'SST-ABAP-1022',
        authorName: 'Rajesh Kumar',
        authorEmail: 'rajesh@sap.com',
        authorRole: 'Consultant',
        content: 'Appended field in VBRK table structure completed. Working on user exit USEREXIT_NUMBER_RANGE in program RV60AFZZ to populate the custom attribute during posting. Saving under TR DEVK903429.',
        isInternal: false,
        createdAt: getPastDate(6)
      },
      {
        id: 'c4',
        ticketId: 'SST-ABAP-1022',
        authorName: 'Sarah Jenkins',
        authorEmail: 'customer@sap.com',
        authorRole: 'Customer',
        content: 'Thanks Rajesh. Please ensure this is tested in QAS prior to transport release.',
        isInternal: false,
        createdAt: getPastDate(2)
      }
    ],
    attachments: [],
    efforts: [
      {
        id: 'e2',
        ticketId: 'SST-ABAP-1022',
        consultantName: 'Rajesh Kumar',
        hoursLogged: 4.0,
        startTime: '10:00',
        endTime: '14:00',
        activityDate: getPastDate(1).split('T')[0],
        description: 'VBRK append structure definitions and RV60AFZZ coding check.',
        activityType: 'Development',
        billable: true,
        status: 'Approved',
        createdAt: getPastDate(6)
      }
    ],
    history: []
  },
  {
    id: 'SST-BASIS-1021',
    title: 'BASIS: Transport Request Import Failure in QA',
    description: 'Transport Request DEVK902149 failed to import in QAS with return code 8. The error logs indicate a missing active version of structure ZMARA_EXT. The dependency transport was not released first.',
    organization: 'Nexa Manufacturing',
    requestedBy: 'David Miller',
    requestedByEmail: 'david@nexamfg.com',
    sapModule: 'BASIS',
    category: 'Technical Issue',
    priority: 'High',
    status: 'Resolved',
    assignedManager: 'Marcus Vance',
    assignedConsultant: 'Elena Rostova',
    transportRequest: 'DEVK902149',
    slaDueAt: getFutureDate(18),
    resolvedAt: getPastDate(4),
    createdAt: getPastDate(24),
    updatedAt: getPastDate(4),
    billable: true,
    escalationFlag: false,
    approvalRequiredFlag: true,
    source: 'Created by Client',
    ticketType: 'Service Request',
    functionalOrTechnical: 'Technical',
    businessImpact: 'Blocks deployment of materials master extensions in testing environments.',
    expectedResolutionDate: getPastDate(4).split('T')[0],
    quotedHours: 4.0,
    raisedToSap: false,
    reopenedCount: 0,
    customerActionRequired: false,
    currentOwner: 'Elena Rostova',
    nextActionOwner: 'Elena Rostova',
    escalations: [],
    createdByName: 'David Miller',
    createdByUser: 'cust-2',
    softDeleteStatus: 'Active',
    sapModules: ['BASIS'],
    deleteRequests: [],
    rootCause: 'Prerequisite table structure ZMARA_EXT was located in another transport DEVK902110 which had not yet been released or imported into QA, causing activation failure of dependent objects.',
    resolutionSummary: 'Manually imported the parent transport DEVK902110 in target QA environment, completed activation check via SE14, and then successfully re-imported DEVK902149 with return code 0.',
    comments: [
      {
        id: 'c5',
        ticketId: 'SST-BASIS-1021',
        authorName: 'Elena Rostova',
        authorEmail: 'elena@sap.com',
        authorRole: 'Consultant',
        content: 'Identified that ZMARA_EXT structure changes were in another unreleased transport DEVK902110. I have manually imported the prerequisite transport first and re-imported DEVK902149. Return code is now 0 (Success).',
        isInternal: false,
        createdAt: getPastDate(5)
      },
      {
        id: 'c6',
        ticketId: 'SST-BASIS-1021',
        authorName: 'David Miller',
        authorEmail: 'david@nexamfg.com',
        authorRole: 'Customer',
        content: 'Confirmed, structure is now active in QA and the transactions are running fine. Thank you for the quick resolution.',
        isInternal: false,
        createdAt: getPastDate(4)
      }
    ],
    attachments: [],
    efforts: [
      {
        id: 'e3',
        ticketId: 'SST-BASIS-1021',
        consultantName: 'Elena Rostova',
        hoursLogged: 2.25,
        startTime: '13:00',
        endTime: '15:15',
        activityDate: getPastDate(1).split('T')[0],
        description: 'Diagnosed STMS log, checked active dictionary objects, imported transport chain.',
        activityType: 'Support',
        billable: true,
        status: 'Approved',
        createdAt: getPastDate(5)
      }
    ],
    history: []
  },
  {
    id: 'SST-SD-1020',
    title: 'SD: Price Calculation Error for Intercompany Sales',
    description: 'The intercompany billing document (IV) is fetching incorrect pricing conditions for condition type PI01. It is pulling the standard price instead of the intercompany customer-specific price defined in condition records (VK11).',
    organization: 'Titan Energy Corp',
    requestedBy: 'Marcus Vance',
    requestedByEmail: 'manager@sap.com',
    sapModule: 'SD',
    category: 'Functional Issue',
    priority: 'Medium',
    status: 'Waiting for Customer',
    assignedManager: 'Marcus Vance',
    assignedConsultant: 'Karthik Subramanian',
    slaDueAt: getPastDate(1), // Already breached by 1 hour
    createdAt: getPastDate(50),
    updatedAt: getPastDate(0.2),
    billable: true,
    escalationFlag: true,
    approvalRequiredFlag: false,
    source: 'Created by Client',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    businessImpact: 'Blocked shipping billing cycles for intercompany distribution centers.',
    expectedResolutionDate: getFutureDate(1).split('T')[0],
    quotedHours: 8.0,
    raisedToSap: true,
    reopenedCount: 1,
    customerActionRequired: true,
    currentOwner: 'Sarah Jenkins',
    nextActionOwner: 'Sarah Jenkins',
    escalations: [
      {
        id: 'esc-1',
        ticketId: 'SST-SD-1020',
        escalatedBy: 'Sarah Jenkins',
        reason: 'Billing blocks causing critical shipment delays. Breached SLA hours limit.',
        severity: 'High',
        status: 'Investigating',
        createdAt: getPastDate(1)
      }
    ],
    createdByName: 'Marcus Vance',
    createdByUser: 'mgr-1',
    softDeleteStatus: 'Active',
    sapModules: ['SD'],
    deleteRequests: [],
    comments: [
      {
        id: 'c7',
        ticketId: 'SST-SD-1020',
        authorName: 'Karthik Subramanian',
        authorEmail: 'consultant@sap.com',
        authorRole: 'Consultant',
        content: 'Checked the pricing procedure. The condition type PI01 is configured with requirement 22 (Intercompany). However, it seems the VK11 condition records for intercompany customer 200349 do not have active dates covering the billing invoice date. Marcus, could you please verify VK13 records?',
        isInternal: false,
        createdAt: getPastDate(2)
      },
      {
        id: 'c8',
        ticketId: 'SST-SD-1020',
        authorName: 'Karthik Subramanian',
        authorEmail: 'consultant@sap.com',
        authorRole: 'Consultant',
        content: 'Status updated to Waiting for Customer. Awaiting verification of pricing validity dates in VK13.',
        isInternal: false,
        createdAt: getPastDate(0.2)
      }
    ],
    attachments: [],
    efforts: [
      {
        id: 'e4',
        ticketId: 'SST-SD-1020',
        consultantName: 'Karthik Subramanian',
        hoursLogged: 3.5,
        startTime: '14:00',
        endTime: '17:30',
        activityDate: getPastDate(2).split('T')[0],
        description: 'Tracing intercompany pricing schema, condition record validity dates checking.',
        activityType: 'Analysis',
        billable: true,
        status: 'Approved',
        createdAt: getPastDate(2)
      }
    ],
    history: []
  },
  {
    id: 'SST-PP-1019',
    title: 'PP: MRP Planned Orders Not Generating',
    description: 'MRP runs are failing to generate planned orders for custom materials in plant 1000. We checked material master configuration and MRP type is PD, but no planned orders are produced.',
    organization: 'Apex Global Industries',
    requestedBy: 'Sarah Jenkins',
    requestedByEmail: 'customer@sap.com',
    sapModule: 'PP',
    category: 'Functional Issue',
    priority: 'High',
    status: 'New',
    assignedManager: 'Marcus Vance',
    slaDueAt: getFutureDate(24),
    createdAt: getPastDate(4),
    updatedAt: getPastDate(2),
    billable: true,
    escalationFlag: false,
    approvalRequiredFlag: false,
    source: 'Created by Client',
    ticketType: 'Incident',
    functionalOrTechnical: 'Functional',
    businessImpact: 'Production scheduling delays due to missing planning runs.',
    expectedResolutionDate: getFutureDate(2).split('T')[0],
    quotedHours: 5.0,
    raisedToSap: false,
    reopenedCount: 0,
    customerActionRequired: false,
    currentOwner: 'Marcus Vance',
    nextActionOwner: 'Marcus Vance',
    escalations: [],
    createdByName: 'Sarah Jenkins',
    createdByUser: 'cust-1',
    softDeleteStatus: 'Pending Delete',
    sapModules: ['PP'],
    deleteRequests: [
      {
        id: 'dr-1',
        ticketId: 'SST-PP-1019',
        requestedBy: 'Sarah Jenkins',
        requestedAt: getPastDate(2),
        reason: 'This was mistakenly created as a duplicate. Issue resolved in another ticket.',
        managerApproval: 'Pending',
        adminApproval: 'Pending',
        finalStatus: 'Pending',
        createdAt: getPastDate(2),
        updatedAt: getPastDate(2)
      }
    ],
    comments: [],
    attachments: [],
    efforts: [],
    history: []
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    userId: 'manager@sap.com',
    title: 'New High Priority Ticket Submitted',
    message: 'Sarah Jenkins (Apex Global) created SST-MM-1024: "PO Release Strategy Failure".',
    ticketId: 'SST-MM-1024',
    isRead: false,
    createdAt: getPastDate(1.5)
  },
  {
    id: 'n-2',
    userId: 'consultant@sap.com',
    title: 'Ticket Assigned To You',
    message: 'Marcus Vance assigned SST-MM-1024 to your queue.',
    ticketId: 'SST-MM-1024',
    isRead: false,
    createdAt: getPastDate(1.3)
  },
  {
    id: 'n-3',
    userId: 'customer@sap.com',
    title: 'SST-BASIS-1021 Resolved',
    message: 'Elena Rostova resolved your STMS transport issue in QAS.',
    ticketId: 'SST-BASIS-1021',
    isRead: false,
    createdAt: getPastDate(4)
  }
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 'l-1',
    actor: 'Marcus Vance',
    action: 'Assign Ticket',
    target: 'SST-MM-1024',
    details: 'Assigned to consultant Karthik Subramanian.',
    timestamp: getPastDate(1.3)
  },
  {
    id: 'l-2',
    actor: 'Elena Rostova',
    action: 'Resolve Ticket',
    target: 'SST-BASIS-1021',
    details: 'Marked status as Resolved, added root cause analysis.',
    timestamp: getPastDate(4)
  },
  {
    id: 'l-3',
    actor: 'Sarah Jenkins',
    action: 'Create Ticket',
    target: 'SST-MM-1024',
    details: 'Ticket created with priority Critical.',
    timestamp: getPastDate(1.5)
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

