/**
 * Shared domain model types derived from the Supabase auto-generated schema.
 *
 * These use the `Tables`, `TablesInsert`, and `TablesUpdate` helpers so they
 * stay in sync with the DB without manual maintenance.
 *
 * For joined / enriched shapes (e.g. a CrmDeal with its profile and client),
 * define separate "WithRelations" interfaces below.
 */

import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

// ── Re-exported Enums ──────────────────────────────────────────────────────────

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type AssignmentRole = Database["public"]["Enums"]["assignment_role"];
export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type AppRole = Database["public"]["Enums"]["app_role"];

// ── Row types (read from DB) ───────────────────────────────────────────────────

export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

export type TaskAssignment = Tables<"task_assignments">;

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;

export type Profile = Tables<"profiles">;

export type CrmDeal = Tables<"crm_deals">;
export type CrmDealInsert = TablesInsert<"crm_deals">;
export type CrmDealUpdate = TablesUpdate<"crm_deals">;

export type CrmColumn = Tables<"crm_columns">;
export type CrmLabel = Tables<"crm_labels">;
export type CrmDealComment = Tables<"crm_deal_comments">;
export type CrmStageLog = Tables<"crm_stage_logs">;

export type Project = Tables<"projects">;
export type CustomerContact = Tables<"customer_contacts">;
export type Notification = Tables<"notifications">;

// ── Enriched / joined types ────────────────────────────────────────────────────

/** CrmDeal row + optional joined profile and client */
export interface CrmDealWithRelations extends CrmDeal {
  profiles?: { full_name: string | null } | null;
  clients?: { id: string; name: string } | null;
  labels?: CrmLabel[];
}

/** CrmDealComment row + optional joined profile */
export interface CrmDealCommentWithProfile extends CrmDealComment {
  profiles?: { full_name: string | null } | null;
}

/** Task with selected joins used in the Tasks page query */
export interface TaskWithRelations {
  id: string;
  title: string;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  due_date: string | null;
  lexo_rank: string | null;
  client_id: string | null;
  project_id: string | null;
  type: string | null;
  parent_task_id: string | null;
  not_understood: boolean | null;
  not_understood_at: string | null;
  is_misunderstood: boolean;
  correction_severity: string | null;
  is_archived: boolean;
  estimated_time: number | null;
  logged_time: number | null;
  updated_at: string | null;
  created_at: string | null;
  status_updated_at: string | null;
  clients: { name: string; has_retainer: boolean } | null;
  projects: { name: string } | null;
  task_assignments: Array<{
    user_id: string;
    role: AssignmentRole | null;
    profiles: { full_name: string | null } | null;
  }>;
}
