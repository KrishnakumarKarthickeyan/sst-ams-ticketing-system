import {
  Ticket,
  CustomerContract,
  KnowledgebaseArticle,
  KnowledgebaseCategory,
  Notification,
  SAPModule,
  CustomerContact
} from '../types/ticket';

// Relative date builders
export const getPastDate = (hoursAgo: number) => {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
};

export const getFutureDate = (hoursFromNow: number) => {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
};

export const MOCK_ORGANIZATIONS: any[] = [];

export const MOCK_CONTRACTS: CustomerContract[] = [];

export const MOCK_CATEGORIES: KnowledgebaseCategory[] = [];

export const MOCK_ARTICLES: KnowledgebaseArticle[] = [];

export const MOCK_TICKETS: Ticket[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

export const MOCK_AUDIT_LOGS: any[] = [];

export const FAQ_MOCK: Record<SAPModule, string[]> = {
  FICO: [],
  MM: [],
  SD: [],
  PP: [],
  PM: [],
  QM: [],
  HCM: [],
  SuccessFactors: [],
  BASIS: [],
  ABAP: [],
  'Security/GRC': [],
  'CPI/Integration': [],
  'BW/BI': [],
  Fiori: [],
  TRM: []
};

export const MOCK_CONTACTS: CustomerContact[] = [];
