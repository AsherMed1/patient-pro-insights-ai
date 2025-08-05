-- First, let's see what statuses exist that are not in our allowed list
-- This query will show us what we're about to delete (for logging purposes)
DO $$
DECLARE
    allowed_statuses text[] := ARRAY['New', 'Confirmed', 'Showed', 'No Show', 'Cancelled', 'Rescheduled', 'Welcome Call', 'Won'];
    invalid_count integer;
    invalid_statuses text[];
BEGIN
    -- Get count of appointments with invalid statuses
    SELECT COUNT(*), array_agg(DISTINCT status)
    INTO invalid_count, invalid_statuses
    FROM all_appointments 
    WHERE status IS NOT NULL 
    AND status != ''
    AND NOT (LOWER(TRIM(status)) = ANY(SELECT LOWER(TRIM(unnest(allowed_statuses)))))
    AND status NOT ILIKE '%completed%'; -- Keep completed statuses for now as they might be auto-generated

    -- Log what we found
    RAISE NOTICE 'Found % appointments with invalid statuses: %', invalid_count, invalid_statuses;
    
    -- Delete appointments with invalid statuses (excluding completed variants)
    DELETE FROM all_appointments 
    WHERE status IS NOT NULL 
    AND status != ''
    AND NOT (LOWER(TRIM(status)) = ANY(SELECT LOWER(TRIM(unnest(allowed_statuses)))))
    AND status NOT ILIKE '%completed%';
    
    GET DIAGNOSTICS invalid_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % appointments with invalid statuses', invalid_count;
END $$;