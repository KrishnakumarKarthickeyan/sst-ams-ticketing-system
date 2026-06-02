CREATE OR REPLACE FUNCTION public.inspect_schema_columns(t_name text)
RETURNS TABLE(column_name text, data_type text) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::text, c.data_type::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t_name;
END;
$$ LANGUAGE plpgsql;
