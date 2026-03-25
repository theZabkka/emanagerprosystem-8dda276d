
-- Update get_rejection_stats to accept optional _user_id parameter
CREATE OR REPLACE FUNCTION public.get_rejection_stats(
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
BEGIN
  SELECT json_build_object(
    'by_category', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT reason_category, COUNT(*)::int AS count
        FROM task_rejections
        WHERE created_at BETWEEN _from_date AND _to_date
          AND (_project_id IS NULL OR project_id = _project_id)
          AND (_user_id IS NULL OR assigned_to = _user_id)
        GROUP BY reason_category
        ORDER BY count DESC
      ) r
    ),
    'by_assignee', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT tr.assigned_to, p.full_name, COUNT(*)::int AS count
        FROM task_rejections tr
        LEFT JOIN profiles p ON p.id = tr.assigned_to
        WHERE tr.created_at BETWEEN _from_date AND _to_date
          AND (_project_id IS NULL OR tr.project_id = _project_id)
          AND (_user_id IS NULL OR tr.assigned_to = _user_id)
        GROUP BY tr.assigned_to, p.full_name
        ORDER BY count DESC
        LIMIT 10
      ) r
    ),
    'top_rejected_tasks', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT tr.task_id, t.title, COUNT(*)::int AS rejection_count
        FROM task_rejections tr
        JOIN tasks t ON t.id = tr.task_id
        WHERE tr.created_at BETWEEN _from_date AND _to_date
          AND (_project_id IS NULL OR tr.project_id = _project_id)
          AND (_user_id IS NULL OR tr.assigned_to = _user_id)
        GROUP BY tr.task_id, t.title
        ORDER BY rejection_count DESC
        LIMIT 5
      ) r
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- Update get_lead_time_stats to accept optional _user_id parameter
CREATE OR REPLACE FUNCTION public.get_lead_time_stats(
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
BEGIN
  SELECT json_build_object(
    'overall_avg_hours', (
      SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (
        COALESCE(t.status_updated_at, t.updated_at) - t.created_at
      )) / 3600)::numeric, 1), 0)
      FROM tasks t
      WHERE t.status IN ('done', 'closed')
        AND t.created_at BETWEEN _from_date AND _to_date
        AND (_project_id IS NULL OR t.project_id = _project_id)
        AND (_user_id IS NULL OR EXISTS (
          SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = _user_id
        ))
    ),
    'by_project', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT
          t.project_id,
          p.name AS project_name,
          COUNT(*)::int AS task_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (
            COALESCE(t.status_updated_at, t.updated_at) - t.created_at
          )) / 3600)::numeric, 1) AS avg_hours
        FROM tasks t
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.status IN ('done', 'closed')
          AND t.created_at BETWEEN _from_date AND _to_date
          AND (_project_id IS NULL OR t.project_id = _project_id)
          AND (_user_id IS NULL OR EXISTS (
            SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = _user_id
          ))
        GROUP BY t.project_id, p.name
        ORDER BY avg_hours DESC
      ) r
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- Create new individual quality ranking function
CREATE OR REPLACE FUNCTION public.get_individual_quality_ranking(
  _from_date timestamptz DEFAULT (now() - interval '30 days'),
  _to_date timestamptz DEFAULT now(),
  _project_id uuid DEFAULT NULL
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
      COALESCE(completed.cnt, 0)::int AS total_tasks_completed,
      COALESCE(rejected.cnt, 0)::int AS total_rejections,
      CASE
        WHEN COALESCE(completed.cnt, 0) = 0 THEN 0
        ELSE ROUND(
          ((COALESCE(completed.cnt, 0) - COALESCE(rejected.cnt, 0))::numeric
           / COALESCE(completed.cnt, 0)::numeric) * 100, 1
        )
      END AS quality_score_percentage
    FROM profiles p
    LEFT JOIN (
      SELECT ta.user_id, COUNT(DISTINCT t.id) AS cnt
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE t.status IN ('done', 'closed')
        AND t.created_at BETWEEN _from_date AND _to_date
        AND (_project_id IS NULL OR t.project_id = _project_id)
      GROUP BY ta.user_id
    ) completed ON completed.user_id = p.id
    LEFT JOIN (
      SELECT tr.assigned_to AS user_id, COUNT(*) AS cnt
      FROM task_rejections tr
      WHERE tr.created_at BETWEEN _from_date AND _to_date
        AND (_project_id IS NULL OR tr.project_id = _project_id)
      GROUP BY tr.assigned_to
    ) rejected ON rejected.user_id = p.id
    WHERE p.role IN ('superadmin', 'boss', 'koordynator', 'specjalista', 'praktykant')
      AND p.status != 'inactive'
      AND (COALESCE(completed.cnt, 0) > 0 OR COALESCE(rejected.cnt, 0) > 0)
    ORDER BY quality_score_percentage DESC
  ) r
  INTO result;
  RETURN result;
END;
$$;
