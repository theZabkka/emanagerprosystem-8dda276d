// Demo / Mock data for unverified users or demo mode

export const mockProfiles = [
  { id: "demo-user-1", email: "jan.kowalski@demo.pl", full_name: "Jan Kowalski", role: "admin", avatar_url: null, department: "Zarząd", status: "active" },
  { id: "demo-user-2", email: "anna.nowak@demo.pl", full_name: "Anna Nowak", role: "user", avatar_url: null, department: "Marketing", status: "active" },
  { id: "demo-user-3", email: "piotr.wisniewski@demo.pl", full_name: "Piotr Wiśniewski", role: "user", avatar_url: null, department: "Design", status: "active" },
  { id: "demo-user-4", email: "katarzyna.zielinska@demo.pl", full_name: "Katarzyna Zielińska", role: "moderator", avatar_url: null, department: "Development", status: "active" },
  { id: "demo-user-5", email: "tomasz.lewandowski@demo.pl", full_name: "Tomasz Lewandowski", role: "user", avatar_url: null, department: "Sprzedaż", status: "active" },
];

export const mockClients = [
  { id: "demo-client-1", name: "TechCorp Sp. z o.o.", contact_person: "Marek Jankowski", email: "marek@techcorp.pl", phone: "+48 500 100 200", status: "active" as const, monthly_value: 12000, score: 85, tags: ["IT", "premium"], created_at: "2025-09-15T10:00:00Z" },
  { id: "demo-client-2", name: "Creative Studio", contact_person: "Ewa Kowalczyk", email: "ewa@creativestudio.pl", phone: "+48 600 300 400", status: "active" as const, monthly_value: 8500, score: 72, tags: ["design", "branding"], created_at: "2025-11-02T10:00:00Z" },
  { id: "demo-client-3", name: "FoodDelivery24", contact_person: "Adam Szymański", email: "adam@fooddelivery24.pl", phone: "+48 700 500 600", status: "potential" as const, monthly_value: 5000, score: 45, tags: ["e-commerce", "startup"], created_at: "2026-01-10T10:00:00Z" },
  { id: "demo-client-4", name: "AutoParts Pro", contact_person: "Monika Dąbrowska", email: "monika@autoparts.pl", phone: "+48 800 700 800", status: "negotiations" as const, monthly_value: 15000, score: 60, tags: ["motoryzacja", "B2B"], created_at: "2026-02-05T10:00:00Z" },
  { id: "demo-client-5", name: "EduLearn Platform", contact_person: "Rafał Mazur", email: "rafal@edulearn.pl", phone: "+48 900 800 900", status: "active" as const, monthly_value: 6500, score: 90, tags: ["edukacja", "SaaS"], created_at: "2025-06-20T10:00:00Z" },
  { id: "demo-client-6", name: "GreenEnergy Solutions", contact_person: "Natalia Wójcik", email: "natalia@greenenergy.pl", phone: "+48 510 220 330", status: "project" as const, monthly_value: 22000, score: 78, tags: ["energia", "enterprise"], created_at: "2025-08-12T10:00:00Z" },
  { id: "demo-client-7", name: "SportMax", contact_person: "Jakub Kamiński", email: "jakub@sportmax.pl", phone: "+48 620 440 550", status: "inactive" as const, monthly_value: 0, score: 30, tags: ["sport", "retail"], created_at: "2025-03-18T10:00:00Z" },
];

export const mockProjects = [
  { id: "demo-proj-1", name: "Redesign strony TechCorp", client_id: "demo-client-1", manager_id: "demo-user-1", status: "active", description: "Kompleksowy redesign strony internetowej klienta", start_date: "2026-01-15", end_date: "2026-04-15", created_at: "2026-01-10T10:00:00Z" },
  { id: "demo-proj-2", name: "Kampania Social Media - Creative Studio", client_id: "demo-client-2", manager_id: "demo-user-2", status: "active", description: "Prowadzenie kampanii na FB, IG, LinkedIn", start_date: "2026-02-01", end_date: "2026-05-31", created_at: "2026-01-28T10:00:00Z" },
  { id: "demo-proj-3", name: "Aplikacja mobilna FoodDelivery24", client_id: "demo-client-3", manager_id: "demo-user-4", status: "active", description: "MVP aplikacji do zamawiania jedzenia", start_date: "2026-03-01", end_date: "2026-08-31", created_at: "2026-02-20T10:00:00Z" },
  { id: "demo-proj-4", name: "Branding AutoParts Pro", client_id: "demo-client-4", manager_id: "demo-user-3", status: "active", description: "Identyfikacja wizualna i materiały marketingowe", start_date: "2026-02-15", end_date: "2026-04-30", created_at: "2026-02-10T10:00:00Z" },
  { id: "demo-proj-5", name: "SEO & Content - EduLearn", client_id: "demo-client-5", manager_id: "demo-user-5", status: "active", description: "Strategia SEO i tworzenie treści edukacyjnych", start_date: "2025-12-01", end_date: "2026-06-30", created_at: "2025-11-25T10:00:00Z" },
];

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().split("T")[0];
const daysFromNow = (n: number) => new Date(today.getTime() + n * 86400000).toISOString().split("T")[0];

export const mockTasks = [
  { id: "demo-task-1", title: "Zaprojektuj nowe hero section", project_id: "demo-proj-1", client_id: "demo-client-1", status: "in_progress" as const, priority: "high" as const, due_date: daysFromNow(3), estimated_time: 480, logged_time: 240, created_by: "demo-user-3", description: "Nowy hero section z animacjami", type: "design", created_at: daysAgo(5) + "T10:00:00Z", updated_at: daysAgo(1) + "T14:00:00Z" },
  { id: "demo-task-2", title: "Napisz copy na landing page", project_id: "demo-proj-1", client_id: "demo-client-1", status: "review" as const, priority: "medium" as const, due_date: daysFromNow(1), estimated_time: 240, logged_time: 200, created_by: "demo-user-2", description: "Teksty reklamowe na stronę główną", type: "copywriting", created_at: daysAgo(7) + "T10:00:00Z", updated_at: daysAgo(0) + "T10:00:00Z" },
  { id: "demo-task-3", title: "Przygotuj posty na Instagrama (marzec)", project_id: "demo-proj-2", client_id: "demo-client-2", status: "in_progress" as const, priority: "high" as const, due_date: daysFromNow(5), estimated_time: 600, logged_time: 300, created_by: "demo-user-2", description: "12 postów na Instagram na marzec", type: "social_media", created_at: daysAgo(10) + "T10:00:00Z", updated_at: daysAgo(1) + "T16:00:00Z" },
  { id: "demo-task-4", title: "Wireframes ekranów głównych", project_id: "demo-proj-3", client_id: "demo-client-3", status: "client_review" as const, priority: "critical" as const, due_date: daysAgo(1), estimated_time: 960, logged_time: 900, created_by: "demo-user-3", description: "Wireframes 8 głównych ekranów aplikacji", type: "ux", created_at: daysAgo(14) + "T10:00:00Z", updated_at: daysAgo(2) + "T10:00:00Z" },
  { id: "demo-task-5", title: "Logo i księga znaku", project_id: "demo-proj-4", client_id: "demo-client-4", status: "corrections" as const, priority: "high" as const, due_date: daysFromNow(2), estimated_time: 720, logged_time: 600, created_by: "demo-user-3", description: "Projekt logo + brand book", type: "branding", created_at: daysAgo(20) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z" },
  { id: "demo-task-6", title: "Audyt SEO strony", project_id: "demo-proj-5", client_id: "demo-client-5", status: "done" as const, priority: "medium" as const, due_date: daysAgo(5), estimated_time: 480, logged_time: 420, created_by: "demo-user-5", description: "Pełny audyt techniczny i treściowy", type: "seo", created_at: daysAgo(15) + "T10:00:00Z", updated_at: daysAgo(5) + "T10:00:00Z" },
  { id: "demo-task-7", title: "Implementacja responsywności", project_id: "demo-proj-1", client_id: "demo-client-1", status: "todo" as const, priority: "medium" as const, due_date: daysFromNow(7), estimated_time: 600, logged_time: 0, created_by: "demo-user-4", description: "Responsywność na mobile i tablet", type: "development", created_at: daysAgo(3) + "T10:00:00Z", updated_at: daysAgo(3) + "T10:00:00Z" },
  { id: "demo-task-8", title: "Raport kampanii FB - luty", project_id: "demo-proj-2", client_id: "demo-client-2", status: "done" as const, priority: "low" as const, due_date: daysAgo(10), estimated_time: 180, logged_time: 150, created_by: "demo-user-2", description: "Miesięczny raport z kampanii Facebook Ads", type: "reporting", created_at: daysAgo(12) + "T10:00:00Z", updated_at: daysAgo(10) + "T10:00:00Z" },
  { id: "demo-task-9", title: "Prototyp interaktywny w Figma", project_id: "demo-proj-3", client_id: "demo-client-3", status: "new" as const, priority: "high" as const, due_date: daysFromNow(10), estimated_time: 960, logged_time: 0, created_by: "demo-user-3", description: "Klikalny prototyp z flow użytkownika", type: "ux", created_at: daysAgo(1) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z" },
  { id: "demo-task-10", title: "Wizytówki i papier firmowy", project_id: "demo-proj-4", client_id: "demo-client-4", status: "in_progress" as const, priority: "medium" as const, due_date: daysFromNow(4), estimated_time: 360, logged_time: 120, created_by: "demo-user-3", description: "Projekt wizytówek i papieru firmowego", type: "print", created_at: daysAgo(6) + "T10:00:00Z", updated_at: daysAgo(2) + "T10:00:00Z" },
  { id: "demo-task-11", title: "Artykuły blogowe (5 szt.)", project_id: "demo-proj-5", client_id: "demo-client-5", status: "in_progress" as const, priority: "medium" as const, due_date: daysFromNow(14), estimated_time: 1200, logged_time: 480, created_by: "demo-user-5", description: "5 artykułów SEO na blog EduLearn", type: "content", created_at: daysAgo(8) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z" },
  { id: "demo-task-12", title: "Konfiguracja Google Analytics 4", project_id: "demo-proj-1", client_id: "demo-client-1", status: "todo" as const, priority: "low" as const, due_date: daysFromNow(12), estimated_time: 240, logged_time: 0, created_by: "demo-user-4", description: "Setup GA4 z eventami custom", type: "analytics", created_at: daysAgo(2) + "T10:00:00Z", updated_at: daysAgo(2) + "T10:00:00Z" },
];

export const mockPipelineDeals = [
  { id: "demo-deal-1", title: "Redesign e-commerce SportMax", client_id: "demo-client-7", stage: "potential" as const, value: 35000, assigned_to: "demo-user-5", days_in_stage: 12, created_at: "2026-03-06T10:00:00Z" },
  { id: "demo-deal-2", title: "Kampania Google Ads - AutoParts", client_id: "demo-client-4", stage: "contact" as const, value: 18000, assigned_to: "demo-user-2", days_in_stage: 5, created_at: "2026-03-13T10:00:00Z" },
  { id: "demo-deal-3", title: "System CRM dla GreenEnergy", client_id: "demo-client-6", stage: "offer_sent" as const, value: 65000, assigned_to: "demo-user-1", days_in_stage: 8, created_at: "2026-03-10T10:00:00Z" },
  { id: "demo-deal-4", title: "Aplikacja HR - TechCorp", client_id: "demo-client-1", stage: "negotiations" as const, value: 95000, assigned_to: "demo-user-4", days_in_stage: 3, created_at: "2026-03-15T10:00:00Z" },
  { id: "demo-deal-5", title: "Platforma e-learning EduLearn v2", client_id: "demo-client-5", stage: "won" as const, value: 45000, assigned_to: "demo-user-1", days_in_stage: 0, created_at: "2026-02-20T10:00:00Z" },
  { id: "demo-deal-6", title: "Strona www FoodDelivery24", client_id: "demo-client-3", stage: "lost" as const, value: 12000, assigned_to: "demo-user-5", days_in_stage: 0, created_at: "2026-01-15T10:00:00Z" },
];

export const mockTimeLogs = [
  { id: "demo-tl-1", task_id: "demo-task-1", user_id: "demo-user-3", duration: 120, description: "Szkice koncepcyjne hero", phase: "design", created_at: daysAgo(3) + "T10:00:00Z" },
  { id: "demo-tl-2", task_id: "demo-task-1", user_id: "demo-user-3", duration: 120, description: "Iteracja po feedbacku", phase: "design", created_at: daysAgo(2) + "T14:00:00Z" },
  { id: "demo-tl-3", task_id: "demo-task-2", user_id: "demo-user-2", duration: 200, description: "Pisanie copy", phase: "copywriting", created_at: daysAgo(4) + "T09:00:00Z" },
  { id: "demo-tl-4", task_id: "demo-task-3", user_id: "demo-user-2", duration: 180, description: "Grafiki postów 1-6", phase: "design", created_at: daysAgo(5) + "T10:00:00Z" },
  { id: "demo-tl-5", task_id: "demo-task-3", user_id: "demo-user-2", duration: 120, description: "Grafiki postów 7-12", phase: "design", created_at: daysAgo(2) + "T10:00:00Z" },
  { id: "demo-tl-6", task_id: "demo-task-4", user_id: "demo-user-3", duration: 480, description: "Wireframes ekranów 1-4", phase: "ux", created_at: daysAgo(10) + "T08:00:00Z" },
  { id: "demo-tl-7", task_id: "demo-task-4", user_id: "demo-user-3", duration: 420, description: "Wireframes ekranów 5-8", phase: "ux", created_at: daysAgo(7) + "T08:00:00Z" },
  { id: "demo-tl-8", task_id: "demo-task-5", user_id: "demo-user-3", duration: 360, description: "Koncepcje logo", phase: "branding", created_at: daysAgo(15) + "T10:00:00Z" },
  { id: "demo-tl-9", task_id: "demo-task-5", user_id: "demo-user-3", duration: 240, description: "Księga znaku", phase: "branding", created_at: daysAgo(8) + "T10:00:00Z" },
  { id: "demo-tl-10", task_id: "demo-task-6", user_id: "demo-user-5", duration: 420, description: "Audyt SEO kompletny", phase: "seo", created_at: daysAgo(6) + "T09:00:00Z" },
  { id: "demo-tl-11", task_id: "demo-task-10", user_id: "demo-user-3", duration: 120, description: "Projekt wizytówek", phase: "print", created_at: daysAgo(3) + "T11:00:00Z" },
  { id: "demo-tl-12", task_id: "demo-task-11", user_id: "demo-user-5", duration: 480, description: "Artykuły 1-3", phase: "content", created_at: daysAgo(4) + "T08:00:00Z" },
];

export const mockActivityLog = [
  { id: "demo-act-1", user_id: "demo-user-3", action: "utworzył zadanie", entity_type: "task", entity_name: "Zaprojektuj nowe hero section", entity_id: "demo-task-1", created_at: daysAgo(5) + "T10:00:00Z", details: null, profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-act-2", user_id: "demo-user-2", action: "zaktualizował status na", entity_type: "task", entity_name: "Napisz copy na landing page → Review", entity_id: "demo-task-2", created_at: daysAgo(1) + "T11:00:00Z", details: null, profiles: { full_name: "Anna Nowak" } },
  { id: "demo-act-3", user_id: "demo-user-1", action: "dodał klienta", entity_type: "client", entity_name: "AutoParts Pro", entity_id: "demo-client-4", created_at: daysAgo(2) + "T09:00:00Z", details: null, profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-act-4", user_id: "demo-user-4", action: "skomentował", entity_type: "task", entity_name: "Wireframes ekranów głównych", entity_id: "demo-task-4", created_at: daysAgo(0) + "T08:30:00Z", details: null, profiles: { full_name: "Katarzyna Zielińska" } },
  { id: "demo-act-5", user_id: "demo-user-5", action: "zamknął zadanie", entity_type: "task", entity_name: "Audyt SEO strony", entity_id: "demo-task-6", created_at: daysAgo(5) + "T16:00:00Z", details: null, profiles: { full_name: "Tomasz Lewandowski" } },
  { id: "demo-act-6", user_id: "demo-user-3", action: "przesłał materiał", entity_type: "task", entity_name: "Logo i księga znaku", entity_id: "demo-task-5", created_at: daysAgo(1) + "T14:00:00Z", details: null, profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-act-7", user_id: "demo-user-1", action: "wygrał deal", entity_type: "pipeline", entity_name: "Platforma e-learning EduLearn v2", entity_id: "demo-deal-5", created_at: daysAgo(3) + "T12:00:00Z", details: null, profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-act-8", user_id: "demo-user-2", action: "zalogował czas", entity_type: "task", entity_name: "Posty na Instagrama (marzec)", entity_id: "demo-task-3", created_at: daysAgo(0) + "T10:00:00Z", details: null, profiles: { full_name: "Anna Nowak" } },
];

export const mockTaskAssignments = [
  { task_id: "demo-task-1", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-2", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-3", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-3", user_id: "demo-user-3", role: "collaborator" as const },
  { task_id: "demo-task-4", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-5", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-6", user_id: "demo-user-5", role: "primary" as const },
  { task_id: "demo-task-7", user_id: "demo-user-4", role: "primary" as const },
  { task_id: "demo-task-8", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-9", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-10", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-11", user_id: "demo-user-5", role: "primary" as const },
  { task_id: "demo-task-12", user_id: "demo-user-4", role: "primary" as const },
];
