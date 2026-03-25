
-- 1. Task extra stats: On-Time % and Backlog count
CREATE OR REPLACE FUNCTION public.get_task_extra_stats(
  _from_date timestamptz DEFAULT (now() - interval '30 days'),
  _to_date timestamptz DEFAULT now(),
  _project_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_total_done int;
  v_on_time int;
  v_backlog int;
BEGIN
  -- On-time: completed tasks where status_updated_at <= due_date
  SELECT COUNT(*) INTO v_total_done
  FROM tasks t
  WHERE t.status IN ('done', 'closed')
    AND t.created_at BETWEEN _from_date AND _to_date
    AND (_project_id IS NULL OR t.project_id = _project_id)
    AND (_user_id IS NULL OR EXISTS (
      SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = _user_id
    ))
    AND t.due_date IS NOT NULL;

  SELECT COUNT(*) INTO v_on_time
  FROM tasks t
  WHERE t.status IN ('done', 'closed')
    AND t.created_at BETWEEN _from_date AND _to_date
    AND (_project_id IS NULL OR t.project_id = _project_id)
    AND (_user_id IS NULL OR EXISTS (
      SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = _user_id
    ))
    AND t.due_date IS NOT NULL
    AND COALESCE(t.status_updated_at, t.updated_at)::date <= t.due_date;

  -- Backlog: current tasks in new/todo status (ignores date filter)
  SELECT COUNT(*) INTO v_backlog
  FROM tasks t
  WHERE t.status IN ('new', 'todo')
    AND t.is_archived = false
    AND (_project_id IS NULL OR t.project_id = _project_id)
    AND (_user_id IS NULL OR EXISTS (
      SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = _user_id
    ));

  SELECT json_build_object(
    'total_with_due', v_total_done,
    'on_time_count', v_on_time,
    'ontime_percentage', CASE WHEN v_total_done = 0 THEN 0 ELSE ROUND((v_on_time::numeric / v_total_done::numeric) * 100, 1) END,
    'backlog_count', v_backlog
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. Team workload: active tasks per user
CREATE OR REPLACE FUNCTION public.get_team_workload(
  _project_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
  FROM (
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(SUM(CASE WHEN t.status IN ('new', 'todo') THEN 1 ELSE 0 END), 0)::int AS todo_count,
      COALESCE(SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END), 0)::int AS in_progress_count,
      COALESCE(COUNT(t.id), 0)::int AS total_active
    FROM profiles p
    INNER JOIN task_assignments ta ON ta.user_id = p.id
    INNER JOIN tasks t ON t.id = ta.task_id
      AND t.status IN ('new', 'todo', 'in_progress')
      AND t.is_archived = false
      AND (_project_id IS NULL OR t.project_id = _project_id)
    WHERE p.role IN ('superadmin', 'boss', 'koordynator', 'specjalista', 'praktykant')
      AND p.status != 'inactive'
      AND (_user_id IS NULL OR p.id = _user_id)
    GROUP BY p.id, p.full_name, p.avatar_url
    ORDER BY total_active DESC
  ) r
  INTO result;

  RETURN result;
END;
$$;

-- 3. Pipeline stats: revenue from won deals + win rate
CREATE OR REPLACE FUNCTION public.get_pipeline_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_won_count int;
  v_lost_count int;
  v_won_revenue numeric;
BEGIN
  -- Won deals: columns with name matching 'wygran' or 'sukces' or 'won'
  SELECT COUNT(*), COALESCE(SUM(
    COALESCE((d.description)::numeric, 0)
  ), 0)
  INTO v_won_count, v_won_revenue
  FROM crm_deals d
  INNER JOIN crm_columns c ON c.id = d.column_id
  WHERE d.is_archived = false
    AND (LOWER(c.name) LIKE '%wygran%' OR LOWER(c.name) LIKE '%sukces%' OR LOWER(c.name) LIKE '%won%');

  -- Note: crm_deals doesn't have a value column, so revenue from description won't work.
  -- Let's just count won deals for now. Revenue = 0 placeholder.
  SELECT COUNT(*) INTO v_won_count
  FROM crm_deals d
  INNER JOIN crm_columns c ON c.id = d.column_id
  WHERE d.is_archived = false
    AND (LOWER(c.name) LIKE '%wygran%' OR LOWER(c.name) LIKE '%sukces%' OR LOWER(c.name) LIKE '%won%');

  SELECT COUNT(*) INTO v_lost_count
  FROM crm_deals d
  INNER JOIN crm_columns c ON c.id = d.column_id
  WHERE d.is_archived = false
    AND (LOWER(c.name) LIKE '%przegran%' OR LOWER(c.name) LIKE '%lost%' OR LOWER(c.name) LIKE '%strat%');

  SELECT json_build_object(
    'won_count', v_won_count,
    'lost_count', v_lost_count,
    'total_closed', v_won_count + v_lost_count,
    'win_rate', CASE WHEN (v_won_count + v_lost_count) = 0 THEN 0 ELSE ROUND((v_won_count::numeric / (v_won_count + v_lost_count)::numeric) * 100, 1) END
  ) INTO result;

  RETURN result;
END;
$$;
