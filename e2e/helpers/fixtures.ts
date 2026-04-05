/** Shared test data fixtures for E2E smoke tests */

export const SUPABASE_URL = "https://wdsgtbdqgtwnywvkquhd.supabase.co";

// --------------- Users & profiles ---------------

const BASE_USER = {
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2025-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  factors: [],
};

export const USERS = {
  klient: {
    ...BASE_USER,
    id: "aaaa-1111-klient",
    email: "klient@test.pl",
  },
  specjalista: {
    ...BASE_USER,
    id: "bbbb-2222-specjalista",
    email: "specjalista@test.pl",
  },
  superadmin: {
    ...BASE_USER,
    id: "cccc-3333-superadmin",
    email: "superadmin@local.test",
  },
} as const;

export const PROFILES = {
  klient: {
    id: USERS.klient.id,
    email: USERS.klient.email,
    full_name: "Test Klient",
    role: "klient",
    avatar_url: null,
    department: null,
    client_id: "client-0001",
    zadarma_sip_login: null,
  },
  specjalista: {
    id: USERS.specjalista.id,
    email: USERS.specjalista.email,
    full_name: "Test Specjalista",
    role: "specjalista",
    avatar_url: null,
    department: "marketing",
    client_id: null,
    zadarma_sip_login: null,
  },
  superadmin: {
    id: USERS.superadmin.id,
    email: USERS.superadmin.email,
    full_name: "Test SuperAdmin",
    role: "superadmin",
    avatar_url: null,
    department: null,
    client_id: null,
    zadarma_sip_login: null,
  },
} as const;

export const CONTACT_DATA = {
  id: "contact-0001",
  customer_id: "client-0001",
  user_id: USERS.klient.id,
  first_name: "Test",
  last_name: "Klient",
  email: USERS.klient.email,
  phone: null,
  position: null,
  is_primary: true,
  permissions: { support: true, invoices: true, projects: true, contracts: true, estimates: true },
  can_view_all_tickets: true,
  created_at: "2025-01-01T00:00:00Z",
};

// --------------- Role permissions ---------------

export const ROLE_PERMISSIONS = {
  klient: [
    { id: "rp-1", role_name: "klient", module_name: "dashboard", can_view: true },
    { id: "rp-2", role_name: "klient", module_name: "tickets", can_view: true },
    { id: "rp-3", role_name: "klient", module_name: "ideas", can_view: true },
  ],
  specjalista: [
    { id: "rp-10", role_name: "specjalista", module_name: "dashboard", can_view: true },
    { id: "rp-11", role_name: "specjalista", module_name: "tasks", can_view: true },
    { id: "rp-12", role_name: "specjalista", module_name: "clients", can_view: true },
    { id: "rp-13", role_name: "specjalista", module_name: "crm", can_view: true },
  ],
  superadmin: [
    { id: "rp-20", role_name: "superadmin", module_name: "dashboard", can_view: true },
    { id: "rp-21", role_name: "superadmin", module_name: "tasks", can_view: true },
    { id: "rp-22", role_name: "superadmin", module_name: "crm", can_view: true },
    { id: "rp-23", role_name: "superadmin", module_name: "settings", can_view: true },
  ],
};

// --------------- Tasks (Kanban) ---------------

export const TASKS = [
  {
    id: "task-001",
    title: "Zaprojektuj banner",
    status: "new",
    priority: "medium",
    type: "task",
    client_id: "client-0001",
    project_id: null,
    created_by: USERS.specjalista.id,
    created_at: "2025-06-01T10:00:00Z",
    updated_at: "2025-06-01T10:00:00Z",
    due_date: null,
    estimated_time: null,
    logged_time: null,
    lexo_rank: "aaa",
    is_archived: false,
    is_client_visible: true,
    is_misunderstood: false,
    is_video_task: false,
    description: null,
    archived_at: null,
    status_updated_at: "2025-06-01T10:00:00Z",
    parent_task_id: null,
    not_understood: false,
    not_understood_at: null,
    misunderstood_by: null,
    misunderstood_reason: null,
    accepted_responsibility_by: null,
    client_review_accepted_by: null,
    verification_start_time: null,
    correction_severity: null,
    bug_description: null,
    bug_reason: null,
    bug_severity: null,
    brief_goal: null,
    brief_deliverable: null,
    brief_format: null,
    brief_dont_do: null,
    brief_input_materials: null,
    brief_inspiration: null,
  },
  {
    id: "task-002",
    title: "Napisz post na social media",
    status: "new",
    priority: "high",
    type: "task",
    client_id: "client-0001",
    project_id: null,
    created_by: USERS.specjalista.id,
    created_at: "2025-06-02T10:00:00Z",
    updated_at: "2025-06-02T10:00:00Z",
    due_date: null,
    estimated_time: null,
    logged_time: null,
    lexo_rank: "bbb",
    is_archived: false,
    is_client_visible: true,
    is_misunderstood: false,
    is_video_task: false,
    description: null,
    archived_at: null,
    status_updated_at: "2025-06-02T10:00:00Z",
    parent_task_id: null,
    not_understood: false,
    not_understood_at: null,
    misunderstood_by: null,
    misunderstood_reason: null,
    accepted_responsibility_by: null,
    client_review_accepted_by: null,
    verification_start_time: null,
    correction_severity: null,
    bug_description: null,
    bug_reason: null,
    bug_severity: null,
    brief_goal: null,
    brief_deliverable: null,
    brief_format: null,
    brief_dont_do: null,
    brief_input_materials: null,
    brief_inspiration: null,
  },
];

export const TASK_ASSIGNMENTS = [
  { task_id: "task-001", user_id: USERS.specjalista.id, role: "assignee" },
  { task_id: "task-002", user_id: USERS.specjalista.id, role: "assignee" },
];

// --------------- Tickets ---------------

export const TICKET_NEW = {
  id: "ticket-new-001",
  ticket_number: 999,
  title: "E2E-SMOKE-TEST-TICKET",
  description: "Automatyczny test E2E",
  status: "open",
  priority: "medium",
  department: "marketing",
  client_id: "client-0001",
  contact_id: "contact-0001",
  created_by: USERS.klient.id,
  assigned_to: null,
  created_at: "2025-06-10T10:00:00Z",
};

// --------------- Clients ---------------

export const CLIENTS = [
  {
    id: "client-0001",
    name: "Testowa Firma Sp. z o.o.",
    email: "firma@test.pl",
    phone: "123456789",
    status: "active",
    has_retainer: true,
    is_auto_created: false,
    created_at: "2025-01-01T00:00:00Z",
    nip: null,
    address: null,
    city: null,
    postal_code: null,
    country: null,
    voivodeship: null,
    contact_person: null,
    monthly_value: null,
    score: null,
    tags: null,
    onboarding_steps: null,
    public_status_token: null,
  },
];
