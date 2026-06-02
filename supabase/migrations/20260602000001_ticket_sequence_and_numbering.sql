-- 1. Create ticket sequence
CREATE SEQUENCE IF NOT EXISTS public.ticket_sequence_seq START WITH 1;

-- 2. Alter organizations table to add customer_short_code
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS customer_short_code TEXT UNIQUE;

-- Populate existing organizations if any (so we can enforce NOT NULL safely)
UPDATE public.organizations SET customer_short_code = UPPER(SUBSTRING(name, 1, 3)) WHERE customer_short_code IS NULL;

-- Make it not null
ALTER TABLE public.organizations ALTER COLUMN customer_short_code SET NOT NULL;

-- 3. Alter tickets table to add sequence, primary_module and ticket_number
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_sequence BIGINT UNIQUE;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS primary_module TEXT;

-- Update existing records if any
UPDATE public.tickets SET primary_module = COALESCE(sap_module, 'FICO') WHERE primary_module IS NULL;
ALTER TABLE public.tickets ALTER COLUMN primary_module SET NOT NULL;

-- Populate existing sequences and ticket numbers
DO $$
DECLARE
    t_row RECORD;
    seq_val BIGINT;
    org_code TEXT;
BEGIN
    FOR t_row IN SELECT id, organization_id, sap_module, created_at FROM public.tickets WHERE ticket_sequence IS NULL ORDER BY created_at ASC LOOP
        seq_val := nextval('public.ticket_sequence_seq');
        SELECT customer_short_code INTO org_code FROM public.organizations WHERE id = t_row.organization_id;
        IF org_code IS NULL THEN
            org_code := 'ORG';
        END IF;
        UPDATE public.tickets 
        SET ticket_sequence = seq_val,
            ticket_number = org_code || '-' || COALESCE(t_row.sap_module, 'FICO') || '-' || LPAD(seq_val::text, 6, '0')
        WHERE id = t_row.id;
    END LOOP;
END $$;

-- Make them not null
ALTER TABLE public.tickets ALTER COLUMN ticket_sequence SET NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN ticket_number SET NOT NULL;

-- 4. Create trigger to auto-generate ticket_number and ticket_sequence on insert
CREATE OR REPLACE FUNCTION public.generate_ticket_number_trigger()
RETURNS TRIGGER AS $$
DECLARE
    org_short_code TEXT;
    seq_val BIGINT;
BEGIN
    -- Resolve customer short code
    SELECT customer_short_code INTO org_short_code 
    FROM public.organizations 
    WHERE id = NEW.organization_id;
    
    IF org_short_code IS NULL OR org_short_code = '' THEN
        RAISE EXCEPTION 'Organization short code not found for organization_id %', NEW.organization_id;
    END IF;
    
    -- If primary_module is null, set it from sap_module
    IF NEW.primary_module IS NULL OR NEW.primary_module = '' THEN
        NEW.primary_module := NEW.sap_module;
    END IF;
    
    IF NEW.primary_module IS NULL OR NEW.primary_module = '' THEN
        NEW.primary_module := 'FICO'; -- Fallback
    END IF;
    
    -- Generate sequence value
    seq_val := nextval('public.ticket_sequence_seq');
    NEW.ticket_sequence := seq_val;
    
    -- Format ticket number
    NEW.ticket_number := org_short_code || '-' || NEW.primary_module || '-' || LPAD(seq_val::text, 6, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON public.tickets;
CREATE TRIGGER trg_generate_ticket_number
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number_trigger();
