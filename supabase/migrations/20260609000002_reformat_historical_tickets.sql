-- Reformat existing historical tickets to match the new ticket number pattern (without the SAP module segment)
UPDATE public.tickets t
SET ticket_number = o.customer_short_code || '-' || LPAD(t.ticket_sequence::text, 6, '0')
FROM public.organizations o
WHERE t.organization_id = o.id;
