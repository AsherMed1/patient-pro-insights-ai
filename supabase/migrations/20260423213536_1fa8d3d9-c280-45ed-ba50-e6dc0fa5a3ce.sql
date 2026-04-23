-- Reconcile Oralia Miller's appointment that had its GHL Cancelled webhook suppressed by the Welcome Call guard bug
DO $$
DECLARE
  v_appointment_id uuid := '2d30f3d8-a318-4ecc-ab60-77c7602f7ce9';
  v_existing_status text;
  v_audit_count integer;
BEGIN
  SELECT status INTO v_existing_status
  FROM public.all_appointments
  WHERE id = v_appointment_id;

  IF v_existing_status IS NULL THEN
    RAISE NOTICE 'Oralia Miller appointment % not found — skipping reconciliation', v_appointment_id;
  ELSE
    UPDATE public.all_appointments
    SET status = 'Cancelled',
        updated_at = now()
    WHERE id = v_appointment_id
      AND LOWER(TRIM(status)) <> 'cancelled';

    INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
    VALUES (
      v_appointment_id,
      'GHL backfill — original cancel webhook on Apr 21 was suppressed by Welcome Call guard bug. Status reconciled to Cancelled.',
      'System (Backfill)'
    );

    RAISE NOTICE 'Oralia Miller (id=%) reconciled. Previous status: %', v_appointment_id, v_existing_status;
  END IF;

  -- Audit: count other Welcome Call rows where webhook auto-completion was logged but status stayed Welcome Call
  SELECT COUNT(*) INTO v_audit_count
  FROM public.all_appointments a
  WHERE a.status = 'Welcome Call'
    AND a.date_of_appointment IS NOT NULL
    AND a.updated_at > a.date_of_appointment - interval '7 days'
    AND EXISTS (
      SELECT 1 FROM public.security_audit_log s
      WHERE s.details->>'appointment_id' = a.id::text
        AND s.event_type = 'appointment_auto_completed'
        AND s.details->>'old_status' = 'Welcome Call'
        AND s.details->>'new_status' = 'Welcome Call'
        AND s.created_at > a.updated_at - interval '5 minutes'
    );

  RAISE NOTICE 'Audit: % other Welcome Call rows may have suppressed GHL status changes (manual review recommended)', v_audit_count;
END $$;