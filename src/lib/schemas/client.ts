import { z } from 'zod';

/**
 * Single source of truth for client/contract/SLA form validation. Replaces the
 * scattered regex + length checks in the create/edit dialogs so messages and
 * rules stay consistent. Pure schemas — unit-tested and reused by react-hook-form
 * (zodResolver) and by imperative `safeParse` call sites alike.
 */

// Inputs are converted to numbers at the boundary (RHF `valueAsNumber`, or
// `Number()` at imperative call sites) so the schema stays a plain number type —
// this keeps react-hook-form's input/output generics aligned.
const hours = z
  .number({ message: 'Enter a number' })
  .min(0, 'Must be ≥ 0')
  .max(2000, 'Unrealistically large');

/** Per-priority SLA targets (business hours). */
export const slaTargetsSchema = z.object({
  critical: hours,
  high: hours,
  medium: hours,
  low: hours,
});
export type SlaTargetsForm = z.infer<typeof slaTargetsSchema>;

/** Shared strong-password rule: 12+ chars with upper, lower, number, symbol. */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]).{12,}$/;
export const PASSWORD_MESSAGE = 'Password must be 12+ chars with upper, lower, number, and symbol.';

/**
 * Client provisioning form. Cross-field rules (end after start, manual-password
 * confirmation, new-org fields) are enforced with `superRefine` so the dialog can
 * surface one consistent error per field.
 */
export const clientCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
    phone: z.string().trim().optional(),
    designation: z.string().trim().optional(),

    orgMode: z.enum(['existing', 'new']),
    orgId: z.string().optional(),
    newOrgName: z.string().trim().optional(),
    newOrgCode: z.string().trim().optional(),
    newOrgDomain: z.string().trim().optional(),

    contractType: z.string().min(1),
    contractStatus: z.enum(['Active', 'Draft', 'Expired']),
    startDate: z.string().min(1, 'Contract start date is required.'),
    endDate: z.string().min(1, 'Contract end date is required.'),
    monthlyHours: z.string().optional(),
    annualHours: z.string().optional(),

    sla: slaTargetsSchema,

    isActive: z.boolean(),
    pwdMode: z.enum(['auto', 'manual']),
    password: z.string().optional(),
    confirm: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate && new Date(v.endDate) <= new Date(v.startDate)) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be strictly after start date.' });
    }
    if (v.orgMode === 'new') {
      if (!v.newOrgName?.trim()) ctx.addIssue({ code: 'custom', path: ['newOrgName'], message: 'Organization name is required.' });
      if (!v.newOrgCode?.trim()) ctx.addIssue({ code: 'custom', path: ['newOrgCode'], message: 'Organization short code is required.' });
    } else if (!v.orgId) {
      ctx.addIssue({ code: 'custom', path: ['orgId'], message: 'Please select an organization.' });
    }
    if (v.pwdMode === 'manual') {
      if (!v.password || !PASSWORD_RULE.test(v.password)) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password must be 12+ chars with upper, lower, number, and symbol.' });
      }
      if (v.password !== v.confirm) {
        ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Passwords do not match.' });
      }
    }
  });

export type ClientCreateForm = z.infer<typeof clientCreateSchema>;
