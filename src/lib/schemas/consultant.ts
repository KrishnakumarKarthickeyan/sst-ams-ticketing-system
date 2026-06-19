import { z } from 'zod';
import { PASSWORD_RULE, PASSWORD_MESSAGE } from './client';

/**
 * Consultant (staff) provisioning form validation. Mirrors the client schema's
 * conventions so all create dialogs validate the same way.
 */
export const consultantCreateSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
    type: z.enum(['Functional', 'Technical']),
    pwdMode: z.enum(['auto', 'manual']),
    password: z.string().optional(),
    confirm: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.pwdMode === 'manual') {
      if (!v.password || !PASSWORD_RULE.test(v.password)) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: PASSWORD_MESSAGE });
      }
      if (v.password !== v.confirm) {
        ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Passwords do not match.' });
      }
    }
  });

export type ConsultantCreateForm = z.infer<typeof consultantCreateSchema>;
