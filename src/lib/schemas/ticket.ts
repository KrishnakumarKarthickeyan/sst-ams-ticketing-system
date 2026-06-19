import { z } from 'zod';

/**
 * Create-ticket form validation (manager/admin "create on behalf"). Single source
 * for the required-field rules; the page maps issues back to its error list so
 * behaviour is unchanged, just centralized and typed.
 */
export const ticketCreateSchema = z.object({
  title: z.string().trim().min(1, 'Subject / Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  requestType: z.string().min(1, 'Request Type is required'),
  classification: z.string().min(1, 'Classification is required'),
  category: z.string().min(1, 'Category is required'),
  priority: z.string().min(1, 'Priority is required'),
  sapModules: z.array(z.string()).min(1, 'At least one SAP Module must be selected'),
  hasCustomer: z.literal(true, { message: 'Customer Account is required' }),
});

export type TicketCreateForm = z.infer<typeof ticketCreateSchema>;

/** Run the schema and return a flat list of messages (empty = valid). */
export function validateTicketCreate(input: {
  title: string; description: string; requestType: string; classification: string;
  category: string; priority: string; sapModules: string[]; hasCustomer: boolean;
}): string[] {
  const r = ticketCreateSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map(i => i.message);
}
