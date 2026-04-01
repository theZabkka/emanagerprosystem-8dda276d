
CREATE OR REPLACE FUNCTION public.hard_delete_task(p_task_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  -- Check caller is superadmin
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmin can hard-delete tasks';
  END IF;

  -- Delete dependent records in order
  DELETE FROM time_logs WHERE task_id = p_task_id;
  DELETE FROM task_status_history WHERE task_id = p_task_id;
  DELETE FROM task_rejections WHERE task_id = p_task_id;
  DELETE FROM task_corrections WHERE task_id = p_task_id;
  DELETE FROM task_materials WHERE task_id = p_task_id;
  DELETE FROM task_assignments WHERE task_id = p_task_id;
  DELETE FROM subtasks WHERE task_id = p_task_id;
  DELETE FROM comments WHERE task_id = p_task_id;
  DELETE FROM checklist_items WHERE checklist_id IN (SELECT id FROM checklists WHERE task_id = p_task_id);
  DELETE FROM checklists WHERE task_id = p_task_id;
  DELETE FROM user_task_positions WHERE task_id = p_task_id;
  DELETE FROM calls WHERE task_id = p_task_id;

  -- Clear parent references from child tasks
  UPDATE tasks SET parent_task_id = NULL WHERE parent_task_id = p_task_id;

  -- Finally delete the task itself
  DELETE FROM tasks WHERE id = p_task_id;
END;
$$;
