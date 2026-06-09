-- Update ticket number generation trigger to drop the SAP module segment (format: SHORTCODE-SEQ)
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
    
    -- Format ticket number: drop the primary_module segment
    NEW.ticket_number := org_short_code || '-' || LPAD(seq_val::text, 6, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
