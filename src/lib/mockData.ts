// Demo / Mock data for unverified users or demo mode

export const mockProfiles = [
  { id: "demo-user-1", email: "jan.kowalski@demo.pl", full_name: "Jan Kowalski", role: "admin", avatar_url: null, department: "Zarząd", status: "active" },
  { id: "demo-user-2", email: "anna.nowak@demo.pl", full_name: "Anna Nowak", role: "user", avatar_url: null, department: "Marketing", status: "active" },
  { id: "demo-user-3", email: "piotr.wisniewski@demo.pl", full_name: "Piotr Wiśniewski", role: "user", avatar_url: null, department: "Design", status: "active" },
  { id: "demo-user-4", email: "katarzyna.zielinska@demo.pl", full_name: "Katarzyna Zielińska", role: "moderator", avatar_url: null, department: "Development", status: "active" },
  { id: "demo-user-5", email: "tomasz.lewandowski@demo.pl", full_name: "Tomasz Lewandowski", role: "user", avatar_url: null, department: "Sprzedaż", status: "active" },
];

export const mockClients = [
  { id: "demo-client-1", name: "TechCorp Sp. z o.o.", contact_person: "Marek Jankowski", email: "marek@techcorp.pl", phone: "+48 500 100 200", status: "active" as const, monthly_value: 15000, score: 85, tags: ["IT", "premium"], created_at: "2025-09-15T10:00:00Z", public_status_token: "tc-abc123xyz", onboarding_steps: [{ name: "Brief zebrany", completed: true }, { name: "Dostępy skonfigurowane", completed: true }, { name: "Kanały komunikacji ustalone", completed: true }, { name: "Kick-off meeting", completed: false }] },
  { id: "demo-client-2", name: "Creative Studio", contact_person: "Ewa Kowalczyk", email: "ewa@creativestudio.pl", phone: "+48 600 300 400", status: "active" as const, monthly_value: 8500, score: 72, tags: ["design", "branding"], created_at: "2025-11-02T10:00:00Z", public_status_token: "cs-def456uvw", onboarding_steps: [{ name: "Brief zebrany", completed: true }, { name: "Dostępy skonfigurowane", completed: false }] },
  { id: "demo-client-3", name: "FoodDelivery24", contact_person: "Adam Szymański", email: "adam@fooddelivery24.pl", phone: "+48 700 500 600", status: "potential" as const, monthly_value: 5000, score: 45, tags: ["e-commerce", "startup"], created_at: "2026-01-10T10:00:00Z", public_status_token: null, onboarding_steps: [] },
  { id: "demo-client-4", name: "AutoParts Pro", contact_person: "Monika Dąbrowska", email: "monika@autoparts.pl", phone: "+48 800 700 800", status: "negotiations" as const, monthly_value: 15000, score: 60, tags: ["motoryzacja", "B2B"], created_at: "2026-02-05T10:00:00Z", public_status_token: null, onboarding_steps: [] },
  { id: "demo-client-5", name: "EduLearn Platform", contact_person: "Rafał Mazur", email: "rafal@edulearn.pl", phone: "+48 900 800 900", status: "active" as const, monthly_value: 6500, score: 90, tags: ["edukacja", "SaaS"], created_at: "2025-06-20T10:00:00Z", public_status_token: "el-ghi789rst", onboarding_steps: [{ name: "Brief zebrany", completed: true }, { name: "Dostępy skonfigurowane", completed: true }] },
  { id: "demo-client-6", name: "GreenEnergy Solutions", contact_person: "Natalia Wójcik", email: "natalia@greenenergy.pl", phone: "+48 510 220 330", status: "project" as const, monthly_value: 22000, score: 78, tags: ["energia", "enterprise"], created_at: "2025-08-12T10:00:00Z", public_status_token: null, onboarding_steps: [] },
  { id: "demo-client-7", name: "SportMax", contact_person: "Jakub Kamiński", email: "jakub@sportmax.pl", phone: "+48 620 440 550", status: "inactive" as const, monthly_value: 0, score: 30, tags: ["sport", "retail"], created_at: "2025-03-18T10:00:00Z", public_status_token: null, onboarding_steps: [] },
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
const daysAgoFull = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();

export const mockTasks = [
  { id: "demo-task-1", title: "Zaprojektuj nowe hero section", project_id: "demo-proj-1", client_id: "demo-client-1", status: "in_progress" as const, priority: "high" as const, due_date: daysFromNow(3), estimated_time: 480, logged_time: 240, created_by: "demo-user-3", description: "Nowy hero section z animacjami i efektami parallax. Powinien przyciągać uwagę i jasno komunikować wartość produktu.", type: "design", created_at: daysAgo(5) + "T10:00:00Z", updated_at: daysAgo(1) + "T14:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, parent_task_id: null, brief_goal: "Przyciągnąć uwagę odwiedzających i zwiększyć konwersję o 20%", brief_deliverable: "Gotowy design hero section w Figma + assets", brief_format: "Plik Figma + eksport PNG/SVG", brief_input_materials: "Brand guidelines TechCorp, zdjęcia produktowe", brief_dont_do: "Nie używać stock photos, nie kopiować konkurencji", brief_inspiration: "https://stripe.com, https://linear.app" },
  { id: "demo-task-2", title: "Napisz copy na landing page", project_id: "demo-proj-1", client_id: "demo-client-1", status: "review" as const, priority: "medium" as const, due_date: daysFromNow(1), estimated_time: 240, logged_time: 200, created_by: "demo-user-2", description: "Teksty reklamowe na stronę główną", type: "copywriting", created_at: daysAgo(7) + "T10:00:00Z", updated_at: daysAgo(0) + "T10:00:00Z", is_client_visible: true, bug_severity: null, bug_reason: null, bug_description: null, parent_task_id: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-3", title: "Przygotuj posty na Instagrama (marzec)", project_id: "demo-proj-2", client_id: "demo-client-2", status: "in_progress" as const, priority: "high" as const, due_date: daysFromNow(5), estimated_time: 600, logged_time: 300, created_by: "demo-user-2", description: "12 postów na Instagram na marzec", type: "social_media", created_at: daysAgo(10) + "T10:00:00Z", updated_at: daysAgo(1) + "T16:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-4", title: "Wireframes ekranów głównych", project_id: "demo-proj-3", client_id: "demo-client-3", status: "client_review" as const, priority: "critical" as const, due_date: daysAgo(1), estimated_time: 960, logged_time: 900, created_by: "demo-user-3", description: "Wireframes 8 głównych ekranów aplikacji mobilnej. Klient oczekuje interaktywnego prototypu do testów z użytkownikami.", type: "ux", created_at: daysAgo(14) + "T10:00:00Z", updated_at: daysAgo(5) + "T10:00:00Z", is_client_visible: true, bug_severity: "critical", bug_reason: "Klient uważa że ten błąd blokuje dalsze prace nad projektem i wymaga natychmiastowej poprawki", bug_description: "Nawigacja dolna nachodzi na treść na urządzeniach z małym ekranem (iPhone SE). Przyciski CTA nie są klikalne.", brief_goal: "Przygotować pełny zestaw wireframes dla 8 kluczowych ekranów", brief_deliverable: "Wireframes + klikalny prototyp", brief_format: "Figma z interaktywnymi linkami", brief_input_materials: "User stories, mapa funkcjonalności, analiza konkurencji", brief_dont_do: "Nie projektować wersji desktopowej na tym etapie", brief_inspiration: "Uber Eats, Glovo, Bolt Food" },
  { id: "demo-task-5", title: "Logo i księga znaku", project_id: "demo-proj-4", client_id: "demo-client-4", status: "corrections" as const, priority: "high" as const, due_date: daysFromNow(2), estimated_time: 720, logged_time: 600, created_by: "demo-user-3", description: "Projekt logo + brand book", type: "branding", created_at: daysAgo(20) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-6", title: "Audyt SEO strony", project_id: "demo-proj-5", client_id: "demo-client-5", status: "done" as const, priority: "medium" as const, due_date: daysAgo(5), estimated_time: 480, logged_time: 420, created_by: "demo-user-5", description: "Pełny audyt techniczny i treściowy", type: "seo", created_at: daysAgo(15) + "T10:00:00Z", updated_at: daysAgo(5) + "T10:00:00Z", is_client_visible: true, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-7", title: "Implementacja responsywności", project_id: "demo-proj-1", client_id: "demo-client-1", status: "todo" as const, priority: "medium" as const, due_date: daysFromNow(7), estimated_time: 600, logged_time: 0, created_by: "demo-user-4", description: "Responsywność na mobile i tablet", type: "development", created_at: daysAgo(3) + "T10:00:00Z", updated_at: daysAgo(3) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-8", title: "Raport kampanii FB - luty", project_id: "demo-proj-2", client_id: "demo-client-2", status: "done" as const, priority: "low" as const, due_date: daysAgo(10), estimated_time: 180, logged_time: 150, created_by: "demo-user-2", description: "Miesięczny raport z kampanii Facebook Ads", type: "reporting", created_at: daysAgo(12) + "T10:00:00Z", updated_at: daysAgo(10) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-9", title: "Prototyp interaktywny w Figma", project_id: "demo-proj-3", client_id: "demo-client-3", status: "todo" as const, priority: "high" as const, due_date: daysFromNow(10), estimated_time: 960, logged_time: 0, created_by: "demo-user-3", description: "Klikalny prototyp z flow użytkownika", type: "ux", created_at: daysAgo(1) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-10", title: "Wizytówki i papier firmowy", project_id: "demo-proj-4", client_id: "demo-client-4", status: "in_progress" as const, priority: "medium" as const, due_date: daysFromNow(4), estimated_time: 360, logged_time: 120, created_by: "demo-user-3", description: "Projekt wizytówek i papieru firmowego", type: "print", created_at: daysAgo(6) + "T10:00:00Z", updated_at: daysAgo(2) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-11", title: "Artykuły blogowe (5 szt.)", project_id: "demo-proj-5", client_id: "demo-client-5", status: "in_progress" as const, priority: "medium" as const, due_date: daysFromNow(14), estimated_time: 1200, logged_time: 480, created_by: "demo-user-5", description: "5 artykułów SEO na blog EduLearn", type: "content", created_at: daysAgo(8) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-12", title: "Konfiguracja Google Analytics 4", project_id: "demo-proj-1", client_id: "demo-client-1", status: "todo" as const, priority: "low" as const, due_date: daysFromNow(12), estimated_time: 240, logged_time: 0, created_by: "demo-user-4", description: "Setup GA4 z eventami custom", type: "analytics", created_at: daysAgo(2) + "T10:00:00Z", updated_at: daysAgo(2) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-13", title: "Bannery reklamowe Google Ads", project_id: "demo-proj-2", client_id: "demo-client-2", status: "todo" as const, priority: "high" as const, due_date: daysFromNow(6), estimated_time: 360, logged_time: 0, created_by: "demo-user-3", description: "Zestaw bannerów w różnych formatach", type: "design", created_at: daysAgo(1) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-14", title: "Optymalizacja bazy danych", project_id: "demo-proj-3", client_id: "demo-client-3", status: "review" as const, priority: "medium" as const, due_date: daysFromNow(2), estimated_time: 480, logged_time: 450, created_by: "demo-user-4", description: "Indeksy i optymalizacja zapytań", type: "development", created_at: daysAgo(6) + "T10:00:00Z", updated_at: daysAgo(0) + "T08:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-15", title: "Newsletter marcowy", project_id: "demo-proj-5", client_id: "demo-client-5", status: "corrections" as const, priority: "medium" as const, due_date: daysFromNow(1), estimated_time: 180, logged_time: 120, created_by: "demo-user-2", description: "Mailing z nowościami na platformie", type: "email", created_at: daysAgo(4) + "T10:00:00Z", updated_at: daysAgo(0) + "T12:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-16", title: "Animacje CSS strony głównej", project_id: "demo-proj-1", client_id: "demo-client-1", status: "todo" as const, priority: "low" as const, due_date: daysFromNow(15), estimated_time: 300, logged_time: 0, created_by: "demo-user-4", description: "Subtelne animacje wejścia elementów", type: "development", created_at: daysAgo(1) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-17", title: "Prezentacja dla zarządu GreenEnergy", project_id: null, client_id: "demo-client-6", status: "client_review" as const, priority: "high" as const, due_date: daysAgo(2), estimated_time: 480, logged_time: 450, created_by: "demo-user-1", description: "Pitch deck z wynikami Q1", type: "presentation", created_at: daysAgo(7) + "T10:00:00Z", updated_at: daysAgo(3) + "T10:00:00Z", is_client_visible: true, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-18", title: "Aktualizacja certyfikatu SSL", project_id: "demo-proj-1", client_id: "demo-client-1", status: "todo" as const, priority: "critical" as const, due_date: daysFromNow(1), estimated_time: 60, logged_time: 0, created_by: "demo-user-1", description: "Certyfikat wygasa za 2 dni", type: "devops", created_at: daysAgo(0) + "T08:00:00Z", updated_at: daysAgo(0) + "T08:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
  { id: "demo-task-19", title: "Korekta tłumaczeń EN", project_id: "demo-proj-3", client_id: "demo-client-3", status: "in_progress" as const, priority: "low" as const, due_date: daysFromNow(8), estimated_time: 240, logged_time: 60, created_by: "demo-user-2", description: "Proofreading angielskiej wersji apki", type: "content", created_at: daysAgo(3) + "T10:00:00Z", updated_at: daysAgo(1) + "T10:00:00Z", is_client_visible: false, bug_severity: null, bug_reason: null, bug_description: null, brief_goal: null, brief_deliverable: null, brief_format: null, brief_input_materials: null, brief_dont_do: null, brief_inspiration: null },
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
  { id: "demo-tl-1", task_id: "demo-task-1", user_id: "demo-user-3", duration: 120, description: "Szkice koncepcyjne hero", phase: "design", created_at: daysAgoFull(3) },
  { id: "demo-tl-2", task_id: "demo-task-1", user_id: "demo-user-3", duration: 120, description: "Iteracja po feedbacku", phase: "design", created_at: daysAgoFull(2) },
  { id: "demo-tl-3", task_id: "demo-task-2", user_id: "demo-user-2", duration: 200, description: "Pisanie copy", phase: "copywriting", created_at: daysAgoFull(4) },
  { id: "demo-tl-4", task_id: "demo-task-3", user_id: "demo-user-2", duration: 180, description: "Grafiki postów 1-6", phase: "design", created_at: daysAgoFull(5) },
  { id: "demo-tl-5", task_id: "demo-task-3", user_id: "demo-user-2", duration: 120, description: "Grafiki postów 7-12", phase: "design", created_at: daysAgoFull(2) },
  { id: "demo-tl-6", task_id: "demo-task-4", user_id: "demo-user-3", duration: 480, description: "Wireframes ekranów 1-4", phase: "ux", created_at: daysAgoFull(10) },
  { id: "demo-tl-7", task_id: "demo-task-4", user_id: "demo-user-3", duration: 420, description: "Wireframes ekranów 5-8", phase: "ux", created_at: daysAgoFull(7) },
  { id: "demo-tl-8", task_id: "demo-task-5", user_id: "demo-user-3", duration: 360, description: "Koncepcje logo", phase: "branding", created_at: daysAgoFull(15) },
  { id: "demo-tl-9", task_id: "demo-task-5", user_id: "demo-user-3", duration: 240, description: "Księga znaku", phase: "branding", created_at: daysAgoFull(8) },
  { id: "demo-tl-10", task_id: "demo-task-6", user_id: "demo-user-5", duration: 420, description: "Audyt SEO kompletny", phase: "seo", created_at: daysAgoFull(6) },
  { id: "demo-tl-11", task_id: "demo-task-10", user_id: "demo-user-3", duration: 120, description: "Projekt wizytówek", phase: "print", created_at: daysAgoFull(3) },
  { id: "demo-tl-12", task_id: "demo-task-11", user_id: "demo-user-5", duration: 480, description: "Artykuły 1-3", phase: "content", created_at: daysAgoFull(4) },
];

export const mockActivityLog = [
  { id: "demo-act-1", user_id: "demo-user-3", action: "utworzył zadanie", entity_type: "task", entity_name: "Zaprojektuj nowe hero section", entity_id: "demo-task-1", created_at: daysAgoFull(5), details: null, profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-act-2", user_id: "demo-user-2", action: "zaktualizował status na", entity_type: "task", entity_name: "Napisz copy na landing page → Review", entity_id: "demo-task-2", created_at: daysAgoFull(1), details: null, profiles: { full_name: "Anna Nowak" } },
  { id: "demo-act-3", user_id: "demo-user-1", action: "dodał klienta", entity_type: "client", entity_name: "AutoParts Pro", entity_id: "demo-client-4", created_at: daysAgoFull(2), details: null, profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-act-4", user_id: "demo-user-4", action: "skomentował", entity_type: "task", entity_name: "Wireframes ekranów głównych", entity_id: "demo-task-4", created_at: daysAgoFull(0), details: null, profiles: { full_name: "Katarzyna Zielińska" } },
  { id: "demo-act-5", user_id: "demo-user-5", action: "zamknął zadanie", entity_type: "task", entity_name: "Audyt SEO strony", entity_id: "demo-task-6", created_at: daysAgoFull(5), details: null, profiles: { full_name: "Tomasz Lewandowski" } },
  { id: "demo-act-6", user_id: "demo-user-3", action: "przesłał materiał", entity_type: "task", entity_name: "Logo i księga znaku", entity_id: "demo-task-5", created_at: daysAgoFull(1), details: null, profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-act-7", user_id: "demo-user-1", action: "wygrał deal", entity_type: "pipeline", entity_name: "Platforma e-learning EduLearn v2", entity_id: "demo-deal-5", created_at: daysAgoFull(3), details: null, profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-act-8", user_id: "demo-user-2", action: "zalogował czas", entity_type: "task", entity_name: "Posty na Instagrama (marzec)", entity_id: "demo-task-3", created_at: daysAgoFull(0), details: null, profiles: { full_name: "Anna Nowak" } },
];

export const mockTaskAssignments = [
  { task_id: "demo-task-1", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-1", user_id: "demo-user-1", role: "reviewer" as const },
  { task_id: "demo-task-2", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-3", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-3", user_id: "demo-user-3", role: "collaborator" as const },
  { task_id: "demo-task-4", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-4", user_id: "demo-user-4", role: "collaborator" as const },
  { task_id: "demo-task-4", user_id: "demo-user-1", role: "reviewer" as const },
  { task_id: "demo-task-5", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-6", user_id: "demo-user-5", role: "primary" as const },
  { task_id: "demo-task-7", user_id: "demo-user-4", role: "primary" as const },
  { task_id: "demo-task-8", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-9", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-10", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-11", user_id: "demo-user-5", role: "primary" as const },
  { task_id: "demo-task-12", user_id: "demo-user-4", role: "primary" as const },
  { task_id: "demo-task-13", user_id: "demo-user-3", role: "primary" as const },
  { task_id: "demo-task-14", user_id: "demo-user-4", role: "primary" as const },
  { task_id: "demo-task-15", user_id: "demo-user-2", role: "primary" as const },
  { task_id: "demo-task-16", user_id: "demo-user-4", role: "primary" as const },
  { task_id: "demo-task-17", user_id: "demo-user-1", role: "primary" as const },
  // demo-task-18 and demo-task-19 intentionally have NO assignments (unassigned)
];

// ─── Task Detail Mock Data ──────────────────────────────────────────────

export const mockSubtasks = [
  { id: "demo-sub-1", task_id: "demo-task-4", title: "Ekran główny - wireframe", is_completed: true, assigned_to: "demo-user-3", created_at: daysAgoFull(12) },
  { id: "demo-sub-2", task_id: "demo-task-4", title: "Ekran listy restauracji", is_completed: true, assigned_to: "demo-user-3", created_at: daysAgoFull(12) },
  { id: "demo-sub-3", task_id: "demo-task-4", title: "Ekran szczegółów restauracji", is_completed: true, assigned_to: "demo-user-3", created_at: daysAgoFull(11) },
  { id: "demo-sub-4", task_id: "demo-task-4", title: "Ekran koszyka", is_completed: false, assigned_to: "demo-user-3", created_at: daysAgoFull(10) },
  { id: "demo-sub-5", task_id: "demo-task-4", title: "Ekran płatności", is_completed: false, assigned_to: "demo-user-4", created_at: daysAgoFull(10) },
  { id: "demo-sub-6", task_id: "demo-task-4", title: "Ekran profilu użytkownika", is_completed: false, assigned_to: "demo-user-3", created_at: daysAgoFull(9) },
  { id: "demo-sub-7", task_id: "demo-task-1", title: "Szkic koncepcyjny v1", is_completed: true, assigned_to: "demo-user-3", created_at: daysAgoFull(4) },
  { id: "demo-sub-8", task_id: "demo-task-1", title: "Implementacja animacji parallax", is_completed: false, assigned_to: "demo-user-3", created_at: daysAgoFull(3) },
  { id: "demo-sub-9", task_id: "demo-task-1", title: "Responsywność mobile", is_completed: false, assigned_to: "demo-user-4", created_at: daysAgoFull(2) },
];

export const mockComments = [
  { id: "demo-com-1", task_id: "demo-task-4", user_id: "demo-user-3", content: "Wireframes ekranów 1-4 gotowe, proszę o review.", type: "internal", created_at: daysAgoFull(8), profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-com-2", task_id: "demo-task-4", user_id: "demo-user-1", content: "Świetna robota! Mam kilka uwag do nawigacji dolnej - za mało miejsca na iPhone SE.", type: "internal", created_at: daysAgoFull(7), profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-com-3", task_id: "demo-task-4", user_id: "demo-user-4", content: "Zgadzam się z Janem. Dodam testy na mniejszych urządzeniach.", type: "internal", created_at: daysAgoFull(6), profiles: { full_name: "Katarzyna Zielińska" } },
  { id: "demo-com-4", task_id: "demo-task-4", user_id: "demo-user-3", content: "Panie Adamie, przesyłam wireframes do wglądu. Proszę o feedback do piątku.", type: "client", created_at: daysAgoFull(5), profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-com-5", task_id: "demo-task-1", user_id: "demo-user-3", content: "Pierwsza wersja hero section gotowa, animacje do dopracowania.", type: "internal", created_at: daysAgoFull(3), profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-com-6", task_id: "demo-task-1", user_id: "demo-user-1", content: "Wygląda super! Może dodajmy subtelny gradient w tle?", type: "internal", created_at: daysAgoFull(2), profiles: { full_name: "Jan Kowalski" } },
];

export const mockChecklists = [
  { id: "demo-cl-1", task_id: "demo-task-4", title: "Checklist UX Review", created_at: daysAgoFull(10) },
  { id: "demo-cl-2", task_id: "demo-task-1", title: "Checklist Design Review", created_at: daysAgoFull(4) },
];

export const mockChecklistItems = [
  { id: "demo-cli-1", checklist_id: "demo-cl-1", title: "Nawigacja intuicyjna", is_completed: true, is_na: false, evidence_url: null, created_at: daysAgoFull(10) },
  { id: "demo-cli-2", checklist_id: "demo-cl-1", title: "Dostępność WCAG 2.1 AA", is_completed: false, is_na: false, evidence_url: null, created_at: daysAgoFull(10) },
  { id: "demo-cli-3", checklist_id: "demo-cl-1", title: "Responsywność przetestowana", is_completed: false, is_na: false, evidence_url: null, created_at: daysAgoFull(10) },
  { id: "demo-cli-4", checklist_id: "demo-cl-1", title: "Performance audit Lighthouse > 90", is_completed: false, is_na: true, evidence_url: null, created_at: daysAgoFull(10) },
  { id: "demo-cli-5", checklist_id: "demo-cl-2", title: "Kolory zgodne z brand guidelines", is_completed: true, is_na: false, evidence_url: null, created_at: daysAgoFull(4) },
  { id: "demo-cli-6", checklist_id: "demo-cl-2", title: "Typografia spójna", is_completed: true, is_na: false, evidence_url: null, created_at: daysAgoFull(4) },
];

export const mockTaskMaterials = [
  { id: "demo-mat-1", task_id: "demo-task-4", name: "Wireframe-ekran-glowny.fig", type: "file", url: null, is_visible_to_client: true, uploaded_by: "demo-user-3", created_at: daysAgoFull(9) },
  { id: "demo-mat-2", task_id: "demo-task-4", name: "User-stories-v2.pdf", type: "file", url: null, is_visible_to_client: false, uploaded_by: "demo-user-1", created_at: daysAgoFull(13) },
  { id: "demo-mat-3", task_id: "demo-task-4", name: "Analiza konkurencji", type: "link", url: "https://docs.google.com/spreadsheets/example", is_visible_to_client: false, uploaded_by: "demo-user-2", created_at: daysAgoFull(14) },
  { id: "demo-mat-4", task_id: "demo-task-1", name: "Brand-Guidelines-TechCorp.pdf", type: "file", url: null, is_visible_to_client: false, uploaded_by: "demo-user-1", created_at: daysAgoFull(5) },
  { id: "demo-mat-5", task_id: "demo-task-1", name: "Inspiracje hero sections", type: "link", url: "https://dribbble.com/search/hero-section", is_visible_to_client: false, uploaded_by: "demo-user-3", created_at: daysAgoFull(4) },
];

export const mockStatusHistory = [
  { id: "demo-sh-1", task_id: "demo-task-4", old_status: "new", new_status: "todo", changed_by: "demo-user-1", created_at: daysAgoFull(14), profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-sh-2", task_id: "demo-task-4", old_status: "todo", new_status: "in_progress", changed_by: "demo-user-3", created_at: daysAgoFull(13), profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-sh-3", task_id: "demo-task-4", old_status: "in_progress", new_status: "review", changed_by: "demo-user-3", created_at: daysAgoFull(7), profiles: { full_name: "Piotr Wiśniewski" } },
  { id: "demo-sh-4", task_id: "demo-task-4", old_status: "review", new_status: "client_review", changed_by: "demo-user-1", created_at: daysAgoFull(5), profiles: { full_name: "Jan Kowalski" } },
  { id: "demo-sh-5", task_id: "demo-task-1", old_status: "new", new_status: "in_progress", changed_by: "demo-user-3", created_at: daysAgoFull(4), profiles: { full_name: "Piotr Wiśniewski" } },
];

// ─── Messenger Mock Data ────────────────────────────────────────────────

export const mockChannels = [
  { id: "demo-ch-1", name: "Ogólny", type: "public", is_direct: false, created_at: "2026-01-01T10:00:00Z" },
  { id: "demo-ch-2", name: "Marketing", type: "public", is_direct: false, created_at: "2026-01-05T10:00:00Z" },
  { id: "demo-ch-3", name: "Development", type: "public", is_direct: false, created_at: "2026-01-10T10:00:00Z" },
  { id: "demo-dm-1", name: "DM", type: "direct", is_direct: true, created_at: "2026-02-01T10:00:00Z" },
  { id: "demo-dm-2", name: "DM", type: "direct", is_direct: true, created_at: "2026-02-10T10:00:00Z" },
  { id: "demo-dm-3", name: "DM", type: "direct", is_direct: true, created_at: "2026-03-01T10:00:00Z" },
];

export const mockChannelMembers = [
  { channel_id: "demo-ch-1", user_id: "demo-user-1" },
  { channel_id: "demo-ch-1", user_id: "demo-user-2" },
  { channel_id: "demo-ch-1", user_id: "demo-user-3" },
  { channel_id: "demo-ch-1", user_id: "demo-user-4" },
  { channel_id: "demo-ch-1", user_id: "demo-user-5" },
  { channel_id: "demo-ch-2", user_id: "demo-user-1" },
  { channel_id: "demo-ch-2", user_id: "demo-user-2" },
  { channel_id: "demo-ch-3", user_id: "demo-user-1" },
  { channel_id: "demo-ch-3", user_id: "demo-user-4" },
  { channel_id: "demo-dm-1", user_id: "demo-user-1" },
  { channel_id: "demo-dm-1", user_id: "demo-user-2" },
  { channel_id: "demo-dm-2", user_id: "demo-user-1" },
  { channel_id: "demo-dm-2", user_id: "demo-user-3" },
  { channel_id: "demo-dm-3", user_id: "demo-user-2" },
  { channel_id: "demo-dm-3", user_id: "demo-user-4" },
];

export const mockMessages = [
  { id: "demo-msg-1", channel_id: "demo-ch-1", sender_id: "demo-user-1", content: "Cześć wszystkim! 👋 Witam na kanale ogólnym.", created_at: daysAgoFull(5), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-2", channel_id: "demo-ch-1", sender_id: "demo-user-2", content: "Hej Jan! Jak tam nowy projekt dla TechCorp?", created_at: daysAgoFull(5), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-3", channel_id: "demo-ch-1", sender_id: "demo-user-1", content: "Idzie świetnie, mamy już wireframes gotowe. Piotr robi rewelacyjną robotę.", created_at: daysAgoFull(5), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-4", channel_id: "demo-ch-1", sender_id: "demo-user-3", content: "Dzięki! Właśnie skończyłem hero section, tutaj podgląd:", created_at: daysAgoFull(4), attachment_url: "https://placehold.co/800x400/2563eb/ffffff?text=Hero+Section+Preview", attachment_type: "image", attachment_name: "hero-section-v2.png" },
  { id: "demo-msg-5", channel_id: "demo-ch-1", sender_id: "demo-user-4", content: "Super wygląda! 🔥 Dodam to do kodu jutro.", created_at: daysAgoFull(4), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-6", channel_id: "demo-ch-1", sender_id: "demo-user-5", content: "Przypominam o spotkaniu zespołowym w piątek o 10:00", created_at: daysAgoFull(2), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-7", channel_id: "demo-ch-2", sender_id: "demo-user-2", content: "Nowa strategia content marketingu na Q2 — dokument w załączniku", created_at: daysAgoFull(3), attachment_url: "https://example.com/docs/strategy-q2.pdf", attachment_type: "file", attachment_name: "Strategia-Content-Q2-2026.pdf" },
  { id: "demo-msg-8", channel_id: "demo-ch-2", sender_id: "demo-user-1", content: "Przejrzałem, wygląda solidnie. Mam kilka uwag do sekcji o LinkedInie.", created_at: daysAgoFull(3), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-9", channel_id: "demo-ch-3", sender_id: "demo-user-4", content: "Deploy na staging poszedł pomyślnie ✅", created_at: daysAgoFull(1), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-10", channel_id: "demo-ch-3", sender_id: "demo-user-1", content: "Świetnie, testujemy od jutra.", created_at: daysAgoFull(1), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-11", channel_id: "demo-dm-1", sender_id: "demo-user-1", content: "Anna, możesz przygotować raport z kampanii do czwartku?", created_at: daysAgoFull(2), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-12", channel_id: "demo-dm-1", sender_id: "demo-user-2", content: "Jasne! Mam już większość danych, wyślę do środy.", created_at: daysAgoFull(2), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-13", channel_id: "demo-dm-1", sender_id: "demo-user-2", content: "Gotowy raport w załączniku 📊", created_at: daysAgoFull(1), attachment_url: "https://example.com/reports/campaign-feb.xlsx", attachment_type: "file", attachment_name: "Raport-Kampania-Luty-2026.xlsx" },
  { id: "demo-msg-14", channel_id: "demo-dm-1", sender_id: "demo-user-1", content: "Dzięki Anna, super robota! 👍", created_at: daysAgoFull(1), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-15", channel_id: "demo-dm-2", sender_id: "demo-user-3", content: "Jan, mam pytanie odnośnie kolorystyki dla AutoParts Pro", created_at: daysAgoFull(3), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-16", channel_id: "demo-dm-2", sender_id: "demo-user-1", content: "Dawaj, słucham", created_at: daysAgoFull(3), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-17", channel_id: "demo-dm-2", sender_id: "demo-user-3", content: "Zrobiłem dwa warianty, który lepszy?", created_at: daysAgoFull(3), attachment_url: "https://placehold.co/600x400/dc2626/ffffff?text=Wariant+A", attachment_type: "image", attachment_name: "wariant-a.png" },
  { id: "demo-msg-18", channel_id: "demo-dm-2", sender_id: "demo-user-1", content: "Wariant A zdecydowanie! Bardziej pasuje do branży.", created_at: daysAgoFull(3), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-19", channel_id: "demo-dm-3", sender_id: "demo-user-2", content: "Kasia, widziałaś nowe endpointy API?", created_at: daysAgoFull(1), attachment_url: null, attachment_type: null, attachment_name: null },
  { id: "demo-msg-20", channel_id: "demo-dm-3", sender_id: "demo-user-4", content: "Tak, wyglądają dobrze. Zintegruję je dziś po południu.", created_at: daysAgoFull(1), attachment_url: null, attachment_type: null, attachment_name: null },
];

export const mockMessageReactions = [
  { id: "demo-react-1", message_id: "demo-msg-4", user_id: "demo-user-1", emoji: "🔥" },
  { id: "demo-react-2", message_id: "demo-msg-4", user_id: "demo-user-2", emoji: "🔥" },
  { id: "demo-react-3", message_id: "demo-msg-4", user_id: "demo-user-4", emoji: "👍" },
  { id: "demo-react-4", message_id: "demo-msg-6", user_id: "demo-user-1", emoji: "✅" },
  { id: "demo-react-5", message_id: "demo-msg-9", user_id: "demo-user-1", emoji: "🎉" },
  { id: "demo-react-6", message_id: "demo-msg-13", user_id: "demo-user-1", emoji: "👍" },
  { id: "demo-react-7", message_id: "demo-msg-14", user_id: "demo-user-2", emoji: "❤️" },
];
