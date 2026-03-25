
-- 1. Create task_rejections table
CREATE TABLE public.task_rejections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason_category TEXT NOT NULL DEFAULT 'Inne',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view task_rejections" ON public.task_rejections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert task_rejections" ON public.task_rejections
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

-- 2. RPC: get_rejection_stats
CREATE OR REPLACE FUNCTION public.get_rejection_stats(
  _from_date TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  _to_date TIMESTAMPTZ DEFAULT now(),
  _project_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
        GROUP BY tr.task_id, t.title
        ORDER BY rejection_count DESC
        LIMIT 5
      ) r
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- 3. RPC: get_lead_time_stats
CREATE OR REPLACE FUNCTION public.get_lead_time_stats(
  _from_date TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  _to_date TIMESTAMPTZ DEFAULT now(),
  _project_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
        GROUP BY t.project_id, p.name
        ORDER BY avg_hours DESC
      ) r
    )
  ) INTO result;
  RETURN result;
END;
$$;
