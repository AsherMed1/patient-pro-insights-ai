CREATE OR REPLACE FUNCTION public.qa_cases_escalation_status_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workflow_status = 'completed' AND COALESCE(OLD.workflow_status,'') <> 'completed' THEN
    IF NEW.escalation_status IS NOT NULL AND NEW.escalation_status <> 'Resolved' THEN
      NEW.escalation_status := 'Resolved';
    END IF;
    IF NEW.date_resolved IS NULL THEN
      NEW.date_resolved := now();
    END IF;
  END IF;

  IF COALESCE(OLD.workflow_status,'') = 'completed' AND NEW.workflow_status <> 'completed' THEN
    IF NEW.escalation_status IS NOT NULL THEN
      NEW.escalation_status := 'Follow-Up Required';
    END IF;
  END IF;

  -- Mirror: escalation resolution closes the audit record
  IF NEW.escalation_status = 'Resolved'
     AND COALESCE(OLD.escalation_status,'') <> 'Resolved'
     AND NEW.workflow_status = COALESCE(OLD.workflow_status, NEW.workflow_status)
     AND NEW.workflow_status <> 'completed' THEN
    NEW.workflow_status := 'completed';
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.date_resolved IS NULL THEN
      NEW.date_resolved := now();
    END IF;
  END IF;

  -- Mirror: reopening the escalation reopens the audit record
  IF COALESCE(OLD.escalation_status,'') = 'Resolved'
     AND NEW.escalation_status IS NOT NULL
     AND NEW.escalation_status <> 'Resolved'
     AND NEW.workflow_status = COALESCE(OLD.workflow_status, NEW.workflow_status)
     AND NEW.workflow_status = 'completed' THEN
    NEW.workflow_status := 'pending_escalated';
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;