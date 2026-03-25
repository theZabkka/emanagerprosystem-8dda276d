
-- Get logged hours per user for team utilization
CREATE OR REPLACE FUNCTION public.get_team_logged_hours(
  _from_date timestamptz DEFAULT now() - interval '30 days',
  _to_date timestamptz DEFAULT now(),
  _project_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
  FROM (
    SELECT
      tl.user_id,
      p.full_name,
      p.avatar_url,
      SUM(tl.duration)::int AS total_minutes
    FROM time_logs tl
    JOIN profiles p ON p.id = tl.user_id
    LEFT JOIN tasks t ON t.id = tl.task_id
    WHERE tl.created_at BETWEEN _from_date AND _to_date
      AND (_project_id IS NULL OR t.project_id = _project_id)
      AND (_user_id IS NULL OR tl.user_id = _user_id)
    GROUP BY tl.user_id, p.full_name, p.avatar_url
    ORDER BY total_minutes DESC
  ) r INTO result;
  RETURN result;
END;
$$;

-- Get Cost of Poor Quality: total logged time on tasks that went through corrections
CREATE OR REPLACE FUNCTION public.get_copq_stats(
  _from_date timestamptz DEFAULT now() - interval '30 days',
  _to_date timestamptz DEFAULT now(),
  _project_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_copq_minutes', (
      SELECT COALESCE(SUM(tl.duration), 0)::int
      FROM time_logs tl
      JOIN tasks t ON t.id = tl.task_id
      WHERE tl.created_at BETWEEN _from_date AND _to_date
        AND (_project_id IS NULL OR t.project_id = _project_id)
        AND (_user_id IS NULL OR tl.user_id = _user_id)
        AND EXISTS (
          SELECT 1 FROM task_status_history tsh
          WHERE tsh.task_id = t.id AND tsh.new_status = 'corrections'
        )
    ),
    'tasks_with_corrections', (
      SELECT COUNT(DISTINCT t.id)::int
      FROM tasks t
      WHERE t.created_at BETWEEN _from_date AND _to_date
        AND (_project_id IS NULL OR t.project_id = _project_id)
        AND EXISTS (
          SELECT 1 FROM task_status_history tsh
          WHERE tsh.task_id = t.id AND tsh.new_status = 'corrections'
        )
        AND (_user_id IS NULL OR EXISTS (
          SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = _user_id
        ))
    )
  ) INTO result;
  RETURN result;
END;
$$;
