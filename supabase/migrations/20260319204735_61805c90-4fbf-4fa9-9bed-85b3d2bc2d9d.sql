-- Add timing columns to task_status_history
ALTER TABLE public.task_status_history 
  ADD COLUMN IF NOT EXISTS status_entered_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_exited_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS note text;

-- Backfill: set status_entered_at = created_at for existing rows
UPDATE public.task_status_history SET status_entered_at = created_at WHERE status_entered_at IS NULL;

-- Create the RPC function for atomic status changes
CREATE OR REPLACE FUNCTION public.change_task_status(
  _task_id uuid,
  _new_status task_status,
  _changed_by uuid,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_status task_status;
  _now timestamptz := now();
BEGIN
  -- Get current status
  SELECT status INTO _old_status FROM tasks WHERE id = _task_id;
  
  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Task not found: %', _task_id;
  END IF;
  
  IF _old_status = _new_status THEN
    RETURN; -- no change
  END IF;

  -- Close the previous open period (where status_exited_at IS NULL for this task)
  UPDATE task_status_history
  SET status_exited_at = _now,
      duration_seconds = EXTRACT(EPOCH FROM (_now - COALESCE(status_entered_at, created_at)))::integer
  WHERE task_id = _task_id
    AND status_exited_at IS NULL;

  -- Insert new history record with open period
  INSERT INTO task_status_history (task_id, old_status, new_status, changed_by, created_at, status_entered_at, note)
  VALUES (_task_id, _old_status::text, _new_status::text, _changed_by, _now, _now, _note);

  -- Update the task status
  UPDATE tasks 
  SET status = _new_status,
      updated_at = _now,
      verification_start_time = CASE WHEN _new_status = 'review' THEN _now ELSE NULL END
  WHERE id = _task_id;
END;
$$;