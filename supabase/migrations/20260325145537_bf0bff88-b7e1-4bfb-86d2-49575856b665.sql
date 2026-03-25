
-- 1. Add closed_at to crm_deals
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- 2. Create crm_stage_logs table
CREATE TABLE IF NOT EXISTS public.crm_stage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.crm_columns(id) ON DELETE CASCADE,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz
);

ALTER TABLE public.crm_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm_stage_logs" ON public.crm_stage_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert crm_stage_logs" ON public.crm_stage_logs
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update crm_stage_logs" ON public.crm_stage_logs
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

CREATE INDEX idx_crm_stage_logs_deal ON public.crm_stage_logs(deal_id);
CREATE INDEX idx_crm_stage_logs_column ON public.crm_stage_logs(column_id);

-- 3. RPC: Advanced pipeline metrics
CREATE OR REPLACE FUNCTION public.get_pipeline_advanced_metrics()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'avg_sales_cycle_days', (
      SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400)::numeric, 1), 0)
      FROM crm_deals d
      INNER JOIN crm_columns c ON c.id = d.column_id
      WHERE d.closed_at IS NOT NULL
        AND (LOWER(c.name) LIKE '%wygran%' OR LOWER(c.name) LIKE '%sukces%' OR LOWER(c.name) LIKE '%won%')
    ),
    'bottleneck', (
      SELECT row_to_json(b) FROM (
        SELECT
          c.name AS column_name,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(sl.exited_at, now()) - sl.entered_at)) / 86400)::numeric, 1) AS avg_days
        FROM crm_stage_logs sl
        JOIN crm_columns c ON c.id = sl.column_id
        WHERE NOT (LOWER(c.name) LIKE '%wygran%' OR LOWER(c.name) LIKE '%sukces%' OR LOWER(c.name) LIKE '%won%'
                OR LOWER(c.name) LIKE '%przegran%' OR LOWER(c.name) LIKE '%lost%' OR LOWER(c.name) LIKE '%strat%')
        GROUP BY c.id, c.name
        HAVING COUNT(*) >= 1
        ORDER BY avg_days DESC
        LIMIT 1
      ) b
    ),
    'won_deals_count', (
      SELECT COUNT(*)::int FROM crm_deals d
      INNER JOIN crm_columns c ON c.id = d.column_id
      WHERE d.closed_at IS NOT NULL
        AND (LOWER(c.name) LIKE '%wygran%' OR LOWER(c.name) LIKE '%sukces%' OR LOWER(c.name) LIKE '%won%')
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- 4. RPC: Project health score
CREATE OR REPLACE FUNCTION public.get_project_health_score(p_project_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_score numeric := 100;
  v_total_active int;
  v_overdue int;
  v_overdue_pct numeric;
  v_corrections_minutes int;
  v_corrections_hours numeric;
  v_penalty numeric;
  result JSON;
BEGIN
  SELECT COUNT(*) INTO v_total_active
  FROM tasks
  WHERE project_id = p_project_id
    AND is_archived = false
    AND status NOT IN ('done', 'closed');

  SELECT COUNT(*) INTO v_overdue
  FROM tasks
  WHERE project_id = p_project_id
    AND is_archived = false
    AND status NOT IN ('done', 'closed')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  IF v_total_active > 0 THEN
    v_overdue_pct := (v_overdue::numeric / v_total_active::numeric) * 100;
  ELSE
    v_overdue_pct := 0;
  END IF;

  v_score := v_score - v_overdue_pct;

  SELECT COALESCE(SUM(tl.duration), 0) INTO v_corrections_minutes
  FROM time_logs tl
  JOIN tasks t ON t.id = tl.task_id
  WHERE t.project_id = p_project_id
    AND EXISTS (
      SELECT 1 FROM task_status_history tsh
      WHERE tsh.task_id = t.id AND tsh.new_status = 'corrections'
    );

  v_corrections_hours := v_corrections_minutes::numeric / 60;
  v_penalty := FLOOR(v_corrections_hours / 10) * 5;
  v_score := v_score - v_penalty;

  IF v_score < 0 THEN v_score := 0; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  SELECT json_build_object(
    'score', ROUND(v_score, 0)::int,
    'total_active', v_total_active,
    'overdue', v_overdue,
    'overdue_pct', ROUND(v_overdue_pct, 1),
    'corrections_hours', ROUND(v_corrections_hours, 1),
    'corrections_penalty', ROUND(v_penalty, 0)::int
  ) INTO result;
  RETURN result;
END;
$$;
