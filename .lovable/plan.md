

# EMANAGER.PRO CRM -- Implementation Plan

## Current State
The project is a blank Lovable scaffold (placeholder page). Supabase is connected but has no tables. The build error is a transient environment issue (rolldown native binding) that will resolve on next rebuild.

## Strategy: Phased Build
This is a 30+ page CRM system. Building everything at once would be unstable. The plan below covers **Phase 1** -- the foundational layer that all other modules depend on.

---

## Phase 1: Auth + Layout + Dashboard

### Step 1: Database Schema (Supabase Migration)

Create the core tables needed for Phase 1:

- **profiles** -- `id` (UUID, PK, references auth.users), `email`, `full_name`, `role`, `avatar_url`, `department`, `status`, `created_at`
- **user_roles** -- `id`, `user_id` (FK auth.users), `role` (enum: admin/moderator/user) -- separate table per security requirements
- **clients** -- `id`, `name`, `contact_person`, `email`, `phone`, `status` (enum), `score`, `monthly_value`, `tags[]`, `created_at`
- **projects** -- `id`, `client_id` (FK), `name`, `description`, `status`, `start_date`, `end_date`, `manager_id` (FK profiles), `created_at`
- **tasks** -- `id`, `project_id` (FK), `client_id` (FK), `title`, `description`, `type`, `status`, `priority`, `due_date`, `estimated_time`, `logged_time`, `created_by` (FK profiles), `parent_task_id` (self-ref for subtasks), `created_at`, `updated_at`
- **task_assignments** -- `task_id`, `user_id`, `role` (primary/collaborator/reviewer)
- **activity_log** -- `id`, `user_id`, `action`, `entity_type`, `entity_id`, `entity_name`, `details`, `created_at`
- **pipeline_deals** -- `id`, `client_id`, `title`, `value`, `stage` (enum), `assigned_to`, `days_in_stage`, `created_at`

RLS policies: authenticated users can read all rows (team CRM); writes restricted by role using `has_role()` security definer function.

Auto-create profile trigger on auth.users insert.

Enable Realtime on: tasks, activity_log, clients, pipeline_deals.

### Step 2: Authentication

**Files to create:**
- `src/pages/Login.tsx` -- Login page matching screenshot (EMANAGER.PRO logo, E-mail + Haslo fields, red "Zaloguj sie" button, light gray background)
- `src/hooks/useAuth.ts` -- Auth context with `onAuthStateChange` listener, session management
- `src/components/AuthProvider.tsx` -- Wraps app, redirects unauthenticated users to /login
- `src/pages/ResetPassword.tsx` -- Password reset page

### Step 3: App Layout (Sidebar + Topbar)

**Files to create:**
- `src/components/layout/AppLayout.tsx` -- Main layout wrapper with sidebar + topbar + content area
- `src/components/layout/AppSidebar.tsx` -- Left navigation panel matching screenshots exactly:
  - EMANAGER.PRO logo at top
  - Sections: GLOWNE, PRACA, KLIENCI, KOMUNIKACJA, ZESPOL, RAPORTY, SYSTEM
  - Each item with correct icon (lucide-react) and Polish label
  - Active state: red text + light red background
  - Version info at bottom (v1.2.0)
  - User profile at very bottom (avatar, name, "BOSS" badge, logout)
  - Collapsible with chevron
- `src/components/layout/Topbar.tsx` -- Top bar with:
  - Page title (dynamic)
  - Search bar with Cmd+K shortcut
  - Action icons (phone, focus mode, theme, notifications with badge)
  - User avatar
- `src/components/layout/AIAssistantButton.tsx` -- Floating red button bottom-right

### Step 4: Dashboard Page

**File:** `src/pages/Dashboard.tsx`

Sections (top to bottom, matching screenshot):
1. **Alert banners** -- Red/orange bars for unassigned tasks, tasks in corrections, awaiting verification, untyped tasks. Each with action button.
2. **Stats cards row** -- 6 cards: Klienci, Wartosc lejka, Zalegle, Zgloszenia, W poprawkach, Do akceptacji klienta
3. **Czeka na akceptacje klienta** -- Table section
4. **Zadania z problemami jakosci** -- Table section
5. **Two-column layout:**
   - Left: Ostatnia aktywnosc (activity timeline with avatars)
   - Right: Lejek sprzedazy (pipeline stages with values)
6. **Two-column layout:**
   - Left: Obciazenie zespolu (team workload table)
   - Right: Jakosc weryfikacji zespolu (verification quality list)

All data fetched from Supabase with react-query. Real-time subscriptions on activity_log and tasks tables.

### Step 5: Routing Setup

Update `src/App.tsx` with routes:
- `/login` -- Login page
- `/` -- redirect to `/dashboard`
- `/dashboard` -- Dashboard (protected)
- `/tasks`, `/projects`, `/clients`, `/pipeline`, `/okr`, `/operational`, `/team-board`, `/team/calendar`, `/reports/time` -- Placeholder pages for future phases
- All protected routes wrapped in AuthProvider

### Step 6: Stub Pages

Create minimal placeholder pages for all sidebar links so navigation works without errors. Each shows page title + "Coming soon" message.

---

## UI/UX Details

- **Language**: All Polish (matching screenshots)
- **Color scheme**: White/light gray background, red accent (#DC2626 for primary buttons/active states), status badges use colored pills (red=PILNY, orange=WYSOKI, yellow=SREDNI, green=NISKI)
- **Typography**: Clean sans-serif, consistent with shadcn/ui defaults
- **Responsive**: Sidebar collapses to sheet on mobile

## What Phase 1 Delivers
A working login flow, the full sidebar navigation, and a data-driven dashboard -- the core shell of the CRM that all future modules plug into.

## Future Phases (not in scope now)
- Phase 2: Tasks module (list + detail view + comments + time tracking)
- Phase 3: Clients + Projects + Pipeline
- Phase 4: Messenger with real-time
- Phase 5: Calendar, OKR, Team boards, Reports
- Phase 6: Automations, settings, advanced features

