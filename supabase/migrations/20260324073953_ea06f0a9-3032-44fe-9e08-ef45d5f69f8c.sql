
-- Add archive columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add archived_at to tasks (is_archived already exists)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Partial index for active projects
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects (id) WHERE is_archived = false;

-- RPC: Archive project with tasks (atomic)
CREATE OR REPLACE FUNCTION public.archive_project_with_tasks(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE projects
  SET is_archived = true, archived_at = v_now
  WHERE id = p_project_id AND is_archived = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or already archived: %', p_project_id;
  END IF;

  UPDATE tasks
  SET is_archived = true, archived_at = v_now
  WHERE project_id = p_project_id AND is_archived = false;
END;
$$;

-- RPC: Restore project with tasks (Timestamp Restore correlation)
CREATE OR REPLACE FUNCTION public.restore_project_with_tasks(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_archived_at TIMESTAMPTZ;
BEGIN
  SELECT archived_at INTO v_archived_at
  FROM projects
  WHERE id = p_project_id AND is_archived = true;

  IF v_archived_at IS NULL THEN
    RAISE EXCEPTION 'Project not found or not archived: %', p_project_id;
  END IF;

  UPDATE projects
  SET is_archived = false, archived_at = NULL
  WHERE id = p_project_id;

  -- CRITICAL: Only restore tasks whose archived_at matches the project's archived_at exactly
  UPDATE tasks
  SET is_archived = false, archived_at = NULL
  WHERE project_id = p_project_id AND archived_at = v_archived_at;
END;
$$;
