
CREATE OR REPLACE FUNCTION public.validate_bug_report_status()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid bug report status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
