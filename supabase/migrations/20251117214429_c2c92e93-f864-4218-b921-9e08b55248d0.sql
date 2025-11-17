-- Create a function to fix completed appointments
CREATE OR REPLACE FUNCTION fix_completed_appointments()
RETURNS TABLE(updated_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  update_count bigint;
BEGIN
  UPDATE all_appointments
  SET 
    internal_process_complete = true,
    updated_at = now()
  WHERE 
    LOWER(TRIM(status)) IN ('cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon')
    AND (internal_process_complete = false OR internal_process_complete IS NULL);
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  RETURN QUERY SELECT update_count;
END;
$$;

-- Execute the function immediately
SELECT fix_completed_appointments();