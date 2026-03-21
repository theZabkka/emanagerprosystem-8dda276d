
-- Add status_updated_at column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Backfill: set status_updated_at = updated_at for existing tasks
UPDATE public.tasks SET status_updated_at = COALESCE(updated_at, created_at) WHERE status_updated_at IS NULL;

-- Update change_task_status function to also set status_updated_at
CREATE OR REPLACE FUNCTION public.change_task_status(_task_id uuid, _new_status task_status, _changed_by uuid, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old_status task_status;
  _now timestamptz := now();
BEGIN
  SELECT status INTO _old_status FROM tasks WHERE id = _task_id;
  
  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Task not found: %', _task_id;
  END IF;
  
  IF _old_status = _new_status THEN
    RETURN;
  END IF;

  UPDATE task_status_history
  SET status_exited_at = _now,
      duration_seconds = EXTRACT(EPOCH FROM (_now - COALESCE(status_entered_at, created_at)))::integer
  WHERE task_id = _task_id
    AND status_exited_at IS NULL;

  INSERT INTO task_status_history (task_id, old_status, new_status, changed_by, created_at, status_entered_at, note)
  VALUES (_task_id, _old_status::text, _new_status::text, _changed_by, _now, _now, _note);

  UPDATE tasks 
  SET status = _new_status,
      updated_at = _now,
      status_updated_at = _now,
      verification_start_time = CASE WHEN _new_status = 'review' THEN _now ELSE NULL END
  WHERE id = _task_id;
END;
$function$;
