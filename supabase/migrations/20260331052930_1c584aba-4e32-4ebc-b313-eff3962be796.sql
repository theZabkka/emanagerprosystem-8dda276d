-- =============================================================
-- FK fixes for hard delete: profiles → SET NULL, projects.tasks → CASCADE
-- RLS DELETE policies for clients, projects, profiles
-- =============================================================

-- ── PROFILES: change NO ACTION → SET NULL for all referencing FKs ──

ALTER TABLE public.activity_log DROP CONSTRAINT activity_log_user_id_fkey;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_contracts DROP CONSTRAINT client_contracts_created_by_fkey;
ALTER TABLE public.client_contracts ADD CONSTRAINT client_contracts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_conversations DROP CONSTRAINT client_conversations_participant_id_fkey;
ALTER TABLE public.client_conversations ADD CONSTRAINT client_conversations_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_files DROP CONSTRAINT client_files_uploaded_by_fkey;
ALTER TABLE public.client_files ADD CONSTRAINT client_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_ideas DROP CONSTRAINT client_ideas_created_by_fkey;
ALTER TABLE public.client_ideas ADD CONSTRAINT client_ideas_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_offers DROP CONSTRAINT client_offers_created_by_fkey;
ALTER TABLE public.client_offers ADD CONSTRAINT client_offers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_orders DROP CONSTRAINT client_orders_created_by_fkey;
ALTER TABLE public.client_orders ADD CONSTRAINT client_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.comments DROP CONSTRAINT comments_user_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.crm_deal_comments DROP CONSTRAINT crm_deal_comments_user_id_fkey;
ALTER TABLE public.crm_deal_comments ADD CONSTRAINT crm_deal_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.crm_deals DROP CONSTRAINT crm_deals_assigned_to_fkey;
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pipeline_deals DROP CONSTRAINT pipeline_deals_assigned_to_fkey;
ALTER TABLE public.pipeline_deals ADD CONSTRAINT pipeline_deals_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.projects DROP CONSTRAINT projects_manager_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.subtasks DROP CONSTRAINT subtasks_assigned_to_fkey;
ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.task_corrections DROP CONSTRAINT task_corrections_created_by_fkey;
ALTER TABLE public.task_corrections ADD CONSTRAINT task_corrections_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.task_materials DROP CONSTRAINT task_materials_uploaded_by_fkey;
ALTER TABLE public.task_materials ADD CONSTRAINT task_materials_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.task_status_history DROP CONSTRAINT task_status_history_changed_by_fkey;
ALTER TABLE public.task_status_history ADD CONSTRAINT task_status_history_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT tasks_created_by_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT tasks_misunderstood_by_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_misunderstood_by_fkey
  FOREIGN KEY (misunderstood_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tickets DROP CONSTRAINT tickets_assigned_to_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.time_logs DROP CONSTRAINT time_logs_user_id_fkey;
ALTER TABLE public.time_logs ADD CONSTRAINT time_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── PROJECTS: tasks CASCADE instead of SET NULL ──

ALTER TABLE public.tasks DROP CONSTRAINT tasks_project_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- ── RLS DELETE policies ──

-- Clients: staff can delete
CREATE POLICY "Staff can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (is_staff(auth.uid()));

-- Projects: staff can delete  
CREATE POLICY "Staff can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (is_staff(auth.uid()));

-- Profiles: staff can delete (other profiles, not self — enforced in app)
CREATE POLICY "Staff can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (is_staff(auth.uid()));