
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

  -- Close previous status history entry
  UPDATE task_status_history
  SET status_exited_at = _now,
      duration_seconds = EXTRACT(EPOCH FROM (_now - COALESCE(status_entered_at, created_at)))::integer
  WHERE task_id = _task_id
    AND status_exited_at IS NULL;

  -- Insert new status history entry
  INSERT INTO task_status_history (task_id, old_status, new_status, changed_by, created_at, status_entered_at, note)
  VALUES (_task_id, _old_status::text, _new_status::text, _changed_by, _now, _now, _note);

  -- Update the task
  UPDATE tasks 
  SET status = _new_status,
      updated_at = _now,
      status_updated_at = _now,
      verification_start_time = CASE WHEN _new_status = 'review' THEN _now ELSE NULL END
  WHERE id = _task_id;

  -- Auto-cleanup: mark all task-related notifications as read when status changes
  UPDATE notifications
  SET is_read = true
  WHERE is_read = false
    AND link LIKE '%/tasks/' || _task_id::text || '%';
END;
$function$;
