/**
 * Shared domain model interfaces derived from the Supabase schema.
 *
 * Use these when you need typed objects outside of direct Supabase query results.
 * They intentionally mirror the DB columns but live in app-land so we can extend
 * them (e.g. with joined relations) without touching the auto-generated types.ts.
 */

import type { Database } from "@/integrations/supabase/types";

// ── Enums ──────────────────────────────────────────────────────────────────────

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type AssignmentRole = Database["public"]["Enums"]["assignment_role"];
export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];

// ── Core models ────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  type: string | null;
  due_date: string | null;
  estimated_time: number | null;
  logged_time: number | null;
  lexo_rank: string | null;
  is_archived: boolean;
  is_client_visible: boolean | null;
  is_video_task: boolean | null;
  is_misunderstood: boolean;
  not_understood: boolean | null;
  not_understood_at: string | null;
  misunderstood_by: string | null;
  misunderstood_reason: string | null;
  parent_task_id: string | null;
  project_id: string | null;
  client_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  status_updated_at: string | null;
  archived_at: string | null;
  verification_start_time: string | null;
  accepted_responsibility_by: string | null;
  client_review_accepted_by: string | null;
  correction_severity: string | null;
  bug_description: string | null;
  bug_reason: string | null;
  bug_severity: string | null;
  // Brief fields
  brief_goal: string | null;
  brief_deliverable: string | null;
  brief_format: string | null;
  brief_dont_do: string | null;
  brief_input_materials: string | null;
  brief_inspiration: string | null;
}

export interface TaskAssignment {
  task_id: string;
  user_id: string;
  role: AssignmentRole | null;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  nip: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  voivodeship: string | null;
  country: string | null;
  status: string | null;
  score: number | null;
  monthly_value: number | null;
  has_retainer: boolean;
  is_auto_created: boolean;
  tags: string[] | null;
  public_status_token: string | null;
  created_at: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  status: string | null;
  phone: string | null;
  website: string | null;
  client_id: string | null;
  zadarma_sip_login: string | null;
  created_at: string | null;
}

export interface CrmDeal {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  assigned_to: string | null;
  client_id: string | null;
  priority: string;
  due_date: string | null;
  is_archived: boolean;
  reminder_active: boolean;
  reminder_trigger_date: string | null;
  lexo_rank: string;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CrmColumn {
  id: string;
  name: string;
  lexo_rank: string;
  created_at: string | null;
}

export interface CrmLabel {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  client_id: string | null;
  manager_id: string | null;
  start_date: string | null;
  end_date: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string | null;
}
