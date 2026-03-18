
-- ============================================================
-- 1. HELPER FUNCTIONS (security definer, bypass RLS)
-- ============================================================

-- Check if user is staff (admin or moderator in user_roles)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Check if user is the creator of a task
CREATE OR REPLACE FUNCTION public.is_task_member(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE user_id = _user_id AND task_id = _task_id
  ) OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = _task_id AND created_by = _user_id
  )
$$;

-- Check if user is project manager or staff
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND manager_id = _user_id
  ) OR public.is_staff(_user_id)
$$;

-- ============================================================
-- 2. CLIENT TABLES — restrict to staff only
-- ============================================================

-- client_contracts
DROP POLICY IF EXISTS "Authenticated can insert client_contracts" ON public.client_contracts;
DROP POLICY IF EXISTS "Authenticated can update client_contracts" ON public.client_contracts;
DROP POLICY IF EXISTS "Authenticated can delete client_contracts" ON public.client_contracts;

CREATE POLICY "Staff can insert client_contracts" ON public.client_contracts
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update client_contracts" ON public.client_contracts
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete client_contracts" ON public.client_contracts
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- client_conversations
DROP POLICY IF EXISTS "Authenticated can insert client_conversations" ON public.client_conversations;
DROP POLICY IF EXISTS "Authenticated can update client_conversations" ON public.client_conversations;
DROP POLICY IF EXISTS "Authenticated can delete client_conversations" ON public.client_conversations;

CREATE POLICY "Staff can insert client_conversations" ON public.client_conversations
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update client_conversations" ON public.client_conversations
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete client_conversations" ON public.client_conversations
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- client_files
DROP POLICY IF EXISTS "Authenticated can insert client_files" ON public.client_files;
DROP POLICY IF EXISTS "Authenticated can delete client_files" ON public.client_files;

CREATE POLICY "Staff can insert client_files" ON public.client_files
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete client_files" ON public.client_files
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- client_offers
DROP POLICY IF EXISTS "Authenticated can insert client_offers" ON public.client_offers;
DROP POLICY IF EXISTS "Authenticated can update client_offers" ON public.client_offers;
DROP POLICY IF EXISTS "Authenticated can delete client_offers" ON public.client_offers;

CREATE POLICY "Staff can insert client_offers" ON public.client_offers
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update client_offers" ON public.client_offers
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete client_offers" ON public.client_offers
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- client_orders
DROP POLICY IF EXISTS "Authenticated can insert client_orders" ON public.client_orders;
DROP POLICY IF EXISTS "Authenticated can update client_orders" ON public.client_orders;
DROP POLICY IF EXISTS "Authenticated can delete client_orders" ON public.client_orders;

CREATE POLICY "Staff can insert client_orders" ON public.client_orders
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update client_orders" ON public.client_orders
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete client_orders" ON public.client_orders
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- client_social_accounts
DROP POLICY IF EXISTS "Authenticated can insert client_social_accounts" ON public.client_social_accounts;
DROP POLICY IF EXISTS "Authenticated can update client_social_accounts" ON public.client_social_accounts;
DROP POLICY IF EXISTS "Authenticated can delete client_social_accounts" ON public.client_social_accounts;

CREATE POLICY "Staff can insert client_social_accounts" ON public.client_social_accounts
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update client_social_accounts" ON public.client_social_accounts
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete client_social_accounts" ON public.client_social_accounts
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- client_invoice_data
DROP POLICY IF EXISTS "Authenticated can insert client_invoice_data" ON public.client_invoice_data;
DROP POLICY IF EXISTS "Authenticated can update client_invoice_data" ON public.client_invoice_data;

CREATE POLICY "Staff can insert client_invoice_data" ON public.client_invoice_data
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update client_invoice_data" ON public.client_invoice_data
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- client_ideas: anyone authenticated can INSERT (by design), but UPDATE/DELETE only staff or creator
DROP POLICY IF EXISTS "Authenticated can update client_ideas" ON public.client_ideas;
DROP POLICY IF EXISTS "Authenticated can delete client_ideas" ON public.client_ideas;
DROP POLICY IF EXISTS "Authenticated can insert client_ideas" ON public.client_ideas;

CREATE POLICY "Users can insert own client_ideas" ON public.client_ideas
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Staff or creator can update client_ideas" ON public.client_ideas
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Staff or creator can delete client_ideas" ON public.client_ideas
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()) OR created_by = auth.uid());

-- ============================================================
-- 3. TASK TABLES — restrict to task members or staff
-- ============================================================

-- tasks
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;

CREATE POLICY "Authenticated users can insert tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Task members or staff can update tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), id)
  );

-- subtasks
DROP POLICY IF EXISTS "Authenticated can insert subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated can delete subtasks" ON public.subtasks;

CREATE POLICY "Task members or staff can insert subtasks" ON public.subtasks
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );
CREATE POLICY "Task members or staff can update subtasks" ON public.subtasks
  FOR UPDATE TO authenticated USING (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );
CREATE POLICY "Task members or staff can delete subtasks" ON public.subtasks
  FOR DELETE TO authenticated USING (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );

-- checklists
DROP POLICY IF EXISTS "Authenticated can insert checklists" ON public.checklists;
DROP POLICY IF EXISTS "Authenticated can update checklists" ON public.checklists;

CREATE POLICY "Task members or staff can insert checklists" ON public.checklists
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );
CREATE POLICY "Task members or staff can update checklists" ON public.checklists
  FOR UPDATE TO authenticated USING (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );

-- checklist_items
DROP POLICY IF EXISTS "Authenticated can insert checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated can update checklist_items" ON public.checklist_items;

CREATE POLICY "Staff can insert checklist_items" ON public.checklist_items
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.checklists cl
    WHERE cl.id = checklist_id AND public.is_task_member(auth.uid(), cl.task_id)
  ));
CREATE POLICY "Staff can update checklist_items" ON public.checklist_items
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.checklists cl
    WHERE cl.id = checklist_id AND public.is_task_member(auth.uid(), cl.task_id)
  ));

-- task_materials
DROP POLICY IF EXISTS "Authenticated can insert materials" ON public.task_materials;
DROP POLICY IF EXISTS "Authenticated can delete materials" ON public.task_materials;

CREATE POLICY "Task members or staff can insert materials" ON public.task_materials
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );
CREATE POLICY "Task members or staff can delete materials" ON public.task_materials
  FOR DELETE TO authenticated USING (
    public.is_staff(auth.uid()) OR uploaded_by = auth.uid()
  );

-- task_assignments
DROP POLICY IF EXISTS "Authenticated users can insert assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON public.task_assignments;

CREATE POLICY "Staff can insert assignments" ON public.task_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id));
CREATE POLICY "Staff can delete assignments" ON public.task_assignments
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()) OR user_id = auth.uid());

-- task_status_history: keep insert open (system writes), no changes needed

-- ============================================================
-- 4. PROJECTS + PIPELINE — restrict to manager or staff
-- ============================================================

-- projects
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;

CREATE POLICY "Staff can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Manager or staff can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (
    public.is_staff(auth.uid()) OR manager_id = auth.uid()
  );

-- pipeline_deals
DROP POLICY IF EXISTS "Authenticated users can insert deals" ON public.pipeline_deals;
DROP POLICY IF EXISTS "Authenticated users can update deals" ON public.pipeline_deals;

CREATE POLICY "Staff can insert deals" ON public.pipeline_deals
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff or assigned can update deals" ON public.pipeline_deals
  FOR UPDATE TO authenticated USING (
    public.is_staff(auth.uid()) OR assigned_to = auth.uid()
  );

-- ============================================================
-- 5. CHANNELS — restrict update to staff
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can update own channels" ON public.channels;
CREATE POLICY "Staff can update channels" ON public.channels
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- ============================================================
-- 6. PROFILES — fix self-referencing subquery
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
