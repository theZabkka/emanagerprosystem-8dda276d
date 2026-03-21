# EMANAGER.PRO — Pełna Dokumentacja Projektu

> **Wersja dokumentacji:** 1.0  
> **Data aktualizacji:** 2026-03-21  
> **Wersja aplikacji:** v1.2.0

---

## ⚠️ ZASADY ROZWOJU PROJEKTU (CRITICAL)

**ZŁOTA ZASADA SYSTEMOWA:**

> Od teraz, przy każdej kolejnej modyfikacji kodu, dodaniu nowej funkcji czy zmianie w bazie danych, MAM ABSOLUTNY OBOWIĄZEK zaktualizować ten plik `DOCUMENTATION.md` jako ostatni krok mojego działania, aby zawsze był w 100% zgodny z kodem źródłowym.

**Zasady obowiązujące przy każdej zmianie:**
1. Po dodaniu nowej strony/modułu — dodaj opis w sekcji "Moduły i strony".
2. Po zmianie schematu bazy — zaktualizuj sekcję "Schemat bazy danych".
3. Po zmianie logiki ról/uprawnień — zaktualizuj sekcję "System ról i uprawnień".
4. Po dodaniu Edge Function — dodaj opis w sekcji "Edge Functions".
5. Po zmianie workflow zadań — zaktualizuj sekcję "Workflow zadań".
6. Dokumentacja MUSI odzwierciedlać stan kodu 1:1.

---

## 1. Stos Technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite 6 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State Management | React Context (Auth, Role) + TanStack React Query v5 |
| Routing | React Router DOM v6 (lazy loading) |
| Backend/BaaS | Supabase (Auth, Database PostgreSQL, Realtime, Storage, Edge Functions) |
| Drag & Drop | @hello-pangea/dnd |
| Formularze | React Hook Form + Zod |
| Ikony | Lucide React |
| Wykresy | Recharts |
| Data | date-fns |
| Toasty | Sonner |
| Testy | Vitest + @testing-library/react, Playwright (E2E) |

**Główne założenia architektury:**
- 100% danych z Supabase — brak mock data, brak trybu demo.
- Lazy loading wszystkich stron (React.lazy + Suspense).
- Skeleton loadery dla stanów ładowania.
- Polski język interfejsu.
- Design system oparty na tokenach CSS (HSL) w `index.css` i `tailwind.config.ts`.

---

## 2. Schemat Bazy Danych Supabase

### 2.1 Tabele główne

#### `profiles`
Profil użytkownika tworzony automatycznie przez trigger `handle_new_user` przy rejestracji.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | Powiązany z `auth.users.id` |
| `email` | text | Adres e-mail |
| `full_name` | text | Imię i nazwisko |
| `role` | text | Rola w systemie (superadmin, boss, koordynator, specjalista, praktykant, klient) |
| `department` | text | Dział (np. Marketing, IT, Grafika) |
| `status` | text | Status konta (active/inactive) |
| `client_id` | uuid (FK → clients) | Powiązanie z klientem (tylko dla roli `klient`) |
| `avatar_url` | text | URL avatara |
| `phone` | text | Numer telefonu |
| `position` | text | Stanowisko |
| `website` | text | Strona www |

**RLS:** Wszyscy zalogowani mogą odczytywać. Użytkownik może edytować tylko swój profil.

#### `user_roles`
Tabela ról do autoryzacji (wzorzec bezpieczeństwa — oddzielna od `profiles.role`).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → auth.users) | |
| `role` | enum `app_role` | admin, moderator, user, superadmin |

**RLS:** Tylko SELECT dla zalogowanych. INSERT/UPDATE/DELETE zablokowane (zarządzane przez Edge Functions).

#### `clients`
Klienci agencji.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | Nazwa firmy/klienta |
| `email`, `phone` | text | Dane kontaktowe |
| `contact_person` | text | Osoba kontaktowa |
| `status` | enum `client_status` | active, potential, negotiations, project, inactive |
| `monthly_value` | numeric | Wartość miesięczna |
| `score` | integer | Scoring klienta |
| `tags` | text[] | Tagi |
| `nip` | text | NIP |
| `address`, `city`, `postal_code`, `voivodeship`, `country` | text | Dane adresowe |
| `onboarding_steps` | jsonb | Kroki onboardingu |
| `public_status_token` | text | Token do publicznego widoku statusu |

**RLS:** SELECT dla wszystkich zalogowanych. INSERT/UPDATE tylko dla ról `admin` lub `moderator` (via `has_role()`).

#### `projects`
Projekty powiązane z klientami.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | Nazwa projektu |
| `description` | text | Opis |
| `status` | text | active, completed, paused, planning |
| `client_id` | uuid (FK → clients) | |
| `manager_id` | uuid (FK → profiles) | Kierownik projektu |
| `start_date`, `end_date` | date | Daty projektu |
| `ai_summary` | text | Podsumowanie AI |
| `brief_data` | jsonb | Brief projektu (pytania/odpowiedzi) |

**RLS:** SELECT dla wszystkich. INSERT dla staff. UPDATE dla staff lub managera.

#### `tasks`
Zadania — główna encja systemu.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | |
| `title` | text | Nazwa zadania |
| `description` | text | Opis |
| `status` | enum `task_status` | new, todo, in_progress, review, corrections, client_review, done, cancelled, client_verified, closed, waiting_for_client |
| `priority` | enum `task_priority` | critical, high, medium, low |
| `client_id` | uuid (FK → clients) | |
| `project_id` | uuid (FK → projects) | |
| `parent_task_id` | uuid (FK → tasks) | Zadanie nadrzędne |
| `created_by` | uuid (FK → profiles) | |
| `due_date` | date | Termin |
| `estimated_time` | integer | Szacowany czas (minuty) |
| `logged_time` | integer | Zalogowany czas (minuty) |
| `type` | text | Typ zadania (Grafika, Dev, itp.) |
| `is_archived` | boolean | Czy zarchiwizowane |
| `is_client_visible` | boolean | Czy widoczne dla klienta |
| `is_video_task` | boolean | Czy zadanie wideo |
| `not_understood` | boolean | Flaga "nie rozumiem" |
| `not_understood_at` | timestamptz | Kiedy zgłoszono |
| `status_updated_at` | timestamptz | Automatycznie ustawiany na `now()` przy każdej zmianie statusu (przez `change_task_status()`) |
| `verification_start_time` | timestamptz | Automatycznie ustawiany na `now()` gdy status → review |
| `accepted_responsibility_by` | uuid | Kto zaakceptował odpowiedzialność |
| `client_review_accepted_by` | text | Kto zaakceptował po stronie klienta |
| `correction_severity` | text | Poziom poprawek (normal/critical) |
| `bug_description`, `bug_reason`, `bug_severity` | text | Dane o błędach |
| `brief_goal`, `brief_deliverable`, `brief_format`, `brief_input_materials`, `brief_dont_do`, `brief_inspiration` | text | Brief zadania |

**RLS:** SELECT dla wszystkich. INSERT (created_by = auth.uid()). UPDATE dla staff, członków zadania lub klientów powiązanych.

#### `task_assignments`
Przypisania osób do zadań.

| Kolumna | Typ | Opis |
|---|---|---|
| `task_id` | uuid (FK → tasks) | |
| `user_id` | uuid (FK → profiles) | |
| `role` | enum `assignment_role` | primary, collaborator, reviewer |

**RLS:** SELECT dla wszystkich. INSERT/DELETE dla staff lub członków zadania.

#### `task_status_history`
Historia zmian statusów — kluczowa dla analizy lead-time.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | |
| `task_id` | uuid (FK → tasks) | |
| `old_status` | text | |
| `new_status` | text | |
| `changed_by` | uuid (FK → profiles) | |
| `status_entered_at` | timestamptz | Czas wejścia w nowy status |
| `status_exited_at` | timestamptz | Czas opuszczenia statusu (NULL = aktualny) |
| `duration_seconds` | integer | Czas spędzony w statusie |
| `note` | text | Opcjonalna notatka |

#### `subtasks`
Podzadania w ramach zadania.

#### `checklists` + `checklist_items`
Listy kontrolne (wymagane do przejścia in_progress → review).

#### `comments`
Komentarze do zadań. Typy: `internal`, `client`. Pole `requires_client_reply` steruje widocznością dla klienta.

#### `time_logs`
Wpisy czasu pracy.

| Kolumna | Typ | Opis |
|---|---|---|
| `task_id` | uuid (FK → tasks) | |
| `user_id` | uuid (FK → profiles) | |
| `duration` | integer | Czas w minutach |
| `phase` | text | Faza pracy |
| `description` | text | Opis |

#### `task_materials`
Materiały/pliki powiązane z zadaniami. Pole `is_visible_to_client` steruje widocznością.

#### `task_corrections`
Zgłoszenia poprawek z informacją o severity.

### 2.2 Tabele klienckie

| Tabela | Opis |
|---|---|
| `client_contracts` | Umowy klientów |
| `client_conversations` | Rozmowy (telefon, spotkanie, e-mail) |
| `client_files` | Pliki klientów (Drive) |
| `client_ideas` | Pomysły zgłaszane przez klientów |
| `client_invoice_data` | Dane do faktury (1:1 z clients) |
| `client_offers` | Oferty handlowe |
| `client_orders` | Zlecenia |
| `client_social_accounts` | Konta social media klientów |

### 2.3 Tabele komunikacji

| Tabela | Opis |
|---|---|
| `channels` | Kanały komunikatora (grupowe + DM) |
| `channel_members` | Członkowie kanałów |
| `messages` | Wiadomości (z załącznikami) |
| `message_reactions` | Reakcje emoji na wiadomości |

### 2.4 Tabele sprzedaży

| Tabela | Opis |
|---|---|
| `pipeline_deals` | Szanse sprzedażowe z etapami (potential → won/lost) |

### 2.5 Tabele systemowe

| Tabela | Opis |
|---|---|
| `role_permissions` | Macierz uprawnień: rola × moduł → can_view |
| `activity_log` | Log aktywności systemu |

---

## 3. Funkcje Bazodanowe (RPC)

### `change_task_status(_task_id, _new_status, _changed_by, _note)`
**SECURITY DEFINER.** Główna funkcja zmiany statusu zadania:
1. Zamyka poprzedni wpis w `task_status_history` (ustawia `status_exited_at`, oblicza `duration_seconds`).
2. Wstawia nowy wpis z `status_entered_at = now()`.
3. Aktualizuje `tasks.status` i `tasks.verification_start_time` (ustawiany na `now()` tylko gdy nowy status = `review`).

### `has_role(_user_id, _role)`
**SECURITY DEFINER.** Sprawdza czy użytkownik ma daną rolę w tabeli `user_roles`. Używana w politykach RLS.

### `is_staff(_user_id)`
**SECURITY DEFINER.** Sprawdza czy użytkownik jest staffem (role: admin, moderator, superadmin w `user_roles`).

### `is_task_member(_user_id, _task_id)`
**SECURITY DEFINER.** Sprawdza czy użytkownik jest przypisany do zadania lub jest jego twórcą.

### `is_project_member(_user_id, _project_id)`
**SECURITY DEFINER.** Sprawdza czy użytkownik jest managerem projektu lub jest staffem.

---

## 4. Edge Functions

### `create-staff-user`
Tworzy nowego pracownika (konto Auth + profil + user_role). Wymaga roli `superadmin` lub `boss` w `user_roles`. Mapowanie ról:
- boss/koordynator → `moderator` w `user_roles`
- specjalista/praktykant → `user` w `user_roles`
- superadmin → `superadmin` w `user_roles`

### `create-client-user`
Tworzy konto klienta z powiązaniem do `clients.id`.

### `create-superadmin`
Tworzy konto superadmina.

### `seed-database`
Zasila bazę danymi testowymi (klienci, projekty).

---

## 5. System Ról i Uprawnień (RBAC)

### 5.1 Role aplikacyjne

| Rola | Typ | Poziom dostępu |
|---|---|---|
| `superadmin` | Staff | Pełny dostęp, pomija wszystkie blokady operacyjne |
| `boss` | Staff | Pełny dostęp, pomija blokady operacyjne |
| `koordynator` | Staff | Zarządzanie zespołem, podlega blokadzie weryfikacji |
| `specjalista` | Staff | Wykonawca, podlega blokadzie weryfikacji |
| `praktykant` | Staff | Ograniczony, podlega blokadzie weryfikacji |
| `klient` | Klient | Dostęp tylko do Portalu Klienta |

### 5.2 Warstwa autoryzacji

1. **Profiles.role** — rola wyświetlana w UI, steruje logiką frontendu.
2. **user_roles** — tabela bezpieczeństwa używana w RLS (admin/moderator/user/superadmin).
3. **role_permissions** — macierz widoczności modułów sidebar'a (zarządzana z `/settings/permissions`).

### 5.3 Logika widoczności

- **Sidebar:** `canViewModule()` w `useRole()` filtruje pozycje menu na podstawie `role_permissions`.
- **superadmin/boss:** Zawsze `true` dla `canViewModule()`.
- **klient:** Zawsze `false` dla `canViewModule()`, ma osobny `ClientSidebar` z: "Mój Dashboard" i "Zgłoś pomysł".

### 5.4 Portal Klienta

Klient po zalogowaniu widzi:
- **ClientSidebar** z dwoma pozycjami: Mój Dashboard, Zgłoś pomysł.
- **ClientDashboard** (`/dashboard`): projekty klienta, zadania do akceptacji, archiwum.
- **Widoczność danych:** klient widzi tylko materiały z `is_visible_to_client = true` i komentarze z `requires_client_reply = true`.
- **Akceptacja/odrzucenie zadań:** klient może zaakceptować (→ client_verified) lub odrzucić (→ corrections) zadania w statusie `client_review`.
- **Pomysły:** klient zgłasza pomysły z poziomu `/client-ideas`.
- **Projekty:** klient widzi szczegóły swoich projektów (tylko zadania w `client_review`).
- Breadcrumby zamienione na "Wróć do panelu klienta".

### 5.5 Coordinator Freeze Overlay

**Plik:** `src/components/tasks/CoordinatorFreezeOverlay.tsx`

**Logika:** Blokuje UI gdy jakiekolwiek zadanie przebywa w statusie `review` dłużej niż 60 minut (liczone od `status_entered_at` w `task_status_history`).

**Zachowanie wg roli:**
| Rola | Efekt |
|---|---|
| superadmin, boss | Informacyjny banner (nie blokuje) |
| koordynator, specjalista, praktykant | Pełna blokada UI z listą zaległych zadań i przyciskami nawigacji |
| klient | Nie widzi |

**Dane:** Pobiera otwarte wpisy w `task_status_history` gdzie `new_status = 'review'` i `status_exited_at IS NULL`. Odświeża co 30 sekund.

**Znika automatycznie** gdy zadania zmienią status (wyjdą z review).

---

## 6. Moduły i Strony

### 6.1 Routing (`src/App.tsx`)

Wszystkie strony ładowane są leniwie (`React.lazy`). Chronione przez `ProtectedRoute` (wymaga sesji) lub `PublicRoute` (logowanie).

| Ścieżka | Komponent | Opis |
|---|---|---|
| `/login` | Login | Strona logowania (Supabase Auth) |
| `/` | → `/dashboard` | Redirect |
| `/dashboard` | Dashboard | Rozdziela na StaffDashboard / ClientDashboard wg roli |
| `/my-day` | MyDay | Osobisty przegląd dnia |
| `/tasks` | Tasks | Tablica zadań Kanban/Lista |
| `/tasks/archive` | TaskArchive | Archiwum zarchiwizowanych zadań |
| `/tasks/:id` | TaskDetail | Szczegóły zadania (pełny widok) |
| `/clients` | Clients | Lista klientów z filtrowaniem |
| `/clients/:id` | ClientDetail | Szczegóły klienta (10 zakładek) |
| `/projects` | Projects | Lista projektów |
| `/projects/:id` | ProjectDetail | Szczegóły projektu (zadania, budżet, brief) |
| `/pipeline` | Pipeline | Lejek sprzedaży (kanban) |
| `/messenger` | Messenger | Komunikator wewnętrzny |
| `/okr` | OKR | Cele i kluczowe rezultaty |
| `/operational` | OperationalBoard | Tablica operacyjna (kanban read-only) |
| `/team-board` | TeamBoard | Tablica zespołu (drag & drop przypisywanie) |
| `/team/calendar` | TeamCalendar | Kalendarz z widokiem zadań |
| `/reports/time` | TimeReports | Raporty czasu pracy |
| `/team` | Team | Zarządzanie zespołem |
| `/settings` | Settings | Ustawienia systemu |
| `/settings/permissions` | Permissions | Macierz uprawnień ról |
| `/automations` | Automations | Lista automatyzacji |
| `/automation-center` | AutomationCenter | Centrum automatyzacji |
| `/whats-new` | WhatsNew | Changelog |
| `/client-ideas` | ClientIdeas | Pomysły klienta (portal klienta) |
| `/staff-ideas` | StaffIdeas | Pomysły klientów (widok staff) |
| Stub routes | StubPage | ~19 stron placeholder (Rutyny, Umowy, Zlecenia, itd.) |

### 6.2 Opis szczegółowy modułów

#### Dashboard (`/dashboard`)
- **Staff:** 3 alerty (zaległe, poprawki, do akceptacji), 6 stat cards, 2 listy zadań (do akceptacji klienta, problemy jakości), feed aktywności, pipeline overview, obciążenie zespołu.
- **Klient:** Powitanie, 3 karty podsumowujące (projekty, do akceptacji, zakończone), lista zadań do akceptacji, lista projektów, zadania ogólne (bez projektu), archiwum.
- **Źródło danych:** `useDashboardData()` — hook pobierający statystyki z Supabase (count klientów, statusy zadań, pipeline, activity_log). Realtime na `activity_log`.

#### Mój Dzień (`/my-day`)
- Osobisty widok: zadania przypisane do zalogowanego użytkownika.
- Karty: otwarte zadania, na dziś, zaległe, zalogowany czas.
- Dane z: `task_assignments` → `tasks` + `time_logs`.

#### Zadania (`/tasks`)
- **Widok Kanban** (domyślny): 8 kolumn statusów (todo → closed). Drag & drop zmiana statusu. **Kompaktowe karty** — zmniejszony padding i rozmiar czcionek dla lepszej gęstości informacji.
- **Widok Lista:** Tabela zadań.
- **Filtry:** Wyszukiwanie, priorytet, typ (parent/subtask/standalone).
- **Sortowanie w Kanbanie:** Dropdown "Sortuj po" z opcjami: Termin/Deadline (`due_date` — domyślne, ASC), Data utworzenia (`created_at`), Czas w statusie (`status_updated_at`), Priorytet (`priority`), **Ręczne** (`manual`). Przycisk kierunku ASC/DESC ukryty w trybie "Ręczne". Priorytety sortowane logicznie (critical=4, high=3, medium=2, low=1). Zadania bez deadline'u zawsze na końcu listy. Logika w `src/lib/taskSorting.ts`.
- **Sortowanie ręczne (Trello-style):** Opcja "Ręczne" zapisuje unikalną kolejność zadań **per użytkownik** w tabeli `user_task_positions` (kolumny: `user_id`, `task_id`, `position` REAL). Pozycja obliczana jako średnia sąsiadów (fractional indexing) — brak konieczności przeliczania pozycji wszystkich zadań przy każdym przesunięciu. Drag & drop w tej samej kolumnie zmienia pozycję bez zmiany statusu. Drag & drop do innej kolumny zmienia status + ustawia pozycję w docelowej kolumnie. Operacje zapisu pozycji używają upsert z optimistic UI. RLS: użytkownik widzi i edytuje tylko swoje pozycje (`user_id = auth.uid()`). Przy sortowaniu innym niż "Ręczne" swobodne rearanżowanie wewnątrz kolumny jest zablokowane.
- **Optimistic UI Updates:** Operacje Drag & Drop (zmiana statusu w Kanbanie, przypisywanie w TeamBoard) używają wzorca "Optimistic UI Updates" — lokalny stan Reacta (TanStack Query cache) jest aktualizowany natychmiast po upuszczeniu karty, **bez czekania na odpowiedź serwera**. Zapytanie do Supabase (`change_task_status` RPC) wykonuje się w tle. W razie błędu (brak internetu, RLS) następuje automatyczny rollback do poprzedniego stanu + czerwony toast "Nie udało się zapisać zmiany statusu." Eliminuje to migotanie (flickering) kart przy operacjach drag & drop.
- **Alerty:** Nieprzypisane, do weryfikacji, do akceptacji klienta, niezrozumiałe.
- **Tworzenie:** Dialog z polami: tytuł, opis, priorytet, typ, klient, projekt, data, czas, brief, przypisane osoby. **Tworzenie klienta po NIP:** pole NIP z przyciskiem "Znajdź" — wyszukuje klienta w bazie po NIP, a jeśli nie istnieje, pobiera dane z API MF (Biała Lista VAT) i automatycznie tworzy nowego klienta w tabeli `clients`.
- **Walidacja workflow (Kanban):**
  - Nieprzypisane → nie mogą zmienić statusu.
  - `in_progress → review`: wymaga 100% checklisty.
  - `review/corrections → client_review`: wymaga potwierdzenia odpowiedzialności (modal).
  - `client_review`: dostępne tylko z review lub corrections.
- **Przypisywanie:** Popover z listą pracowników (z `useStaffMembers()`).
- **Archiwizacja:** Przycisk w kolumnie "Zamknięte".

#### Szczegóły Zadania (`/tasks/:id`)
Najbardziej rozbudowany widok w systemie. Sekcje:

1. **Nagłówek:** Tytuł, status (z możliwością zmiany), priorytet (inline edytowalny — dropdown), klient, projekt, termin/deadline (inline edytowalny — Date Picker z możliwością wyczyszczenia). **Edycja priorytetu i terminu jest zablokowana dla roli `klient` oraz w trybie podglądu klienta (`isPreviewMode`)** — wyświetlane jako statyczny tekst.
2. **Overlay nieprzypisanego zadania:** Jeśli zadanie nie ma przypisanej osoby, na górze widoku wyświetla się sticky banner z listą pracowników do szybkiego przypisania. Blokuje pełną edycję do momentu przypisania.
3. **Auto-stop timera:** Przy zamknięciu/anulowaniu zadania timer jest automatycznie zatrzymywany, a zalogowany czas zapisywany.
4. **Brief:** 6 pól (cel, deliverable, format, materiały, czego nie robić, inspiracja). Edytowalny dialog.
5. **Przypisania:** Lista osób (primary/collaborator/reviewer). Dodawanie/usuwanie.
6. **Podzadania:** Dodawanie, oznaczanie jako ukończone.
7. **Listy kontrolne:** Wiele checklist, każda z wieloma pozycjami. Oznaczanie jako completed/N/A.
8. **Komentarze:** Typy: internal, client. Filtrowanie. Pole `requires_client_reply`. **Rola użytkownika** wyświetlana jako osobny badge obok nazwy autora (pobierana z `profiles.role`), oddzielona od badge'a typu komentarza.
9. **Logowanie czasu:** Timer start/stop + ręczne wpisy (minuty). Wyświetlanie logów.
10. **Materiały:** Upload plików do Supabase Storage (`task_materials`). Linki. Przełącznik widoczności dla klienta (ikona oka).
11. **Poprawki (corrections):** Lista zgłoszonych poprawek z severity.
12. **Historia statusów:** Timeline zmian statusów z czasami trwania. **Widoczna również dla klientów.**
13. **Flaga "Nie rozumiem":** Modal zgłoszenia niezrozumienia + komentarz.
14. **Podgląd jako klient:** Toggle `isPreviewMode` — ukrywa sekcje niedostępne dla klienta.
15. **Widok klienta:** Klient widzi pełne szczegóły zadania — materiały `is_visible_to_client`, komentarze, poprawki, historię statusów, read-only brief/checklists/subtasks. Przycisk "Szczegóły" w dashboardzie klienta prowadzi do `/tasks/:id`. Przyciski akceptacji/odrzucenia.

**Realtime:** Subskrypcja na 8 tabelach jednocześnie (subtasks, comments, time_logs, status_history, assignments, checklists, materials, corrections).

#### Archiwum Zadań (`/tasks/archive`)
- Tabela zarchiwizowanych zadań (`is_archived = true`).
- Filtry: klient, projekt.
- Linki do szczegółów zadania.

#### Klienci (`/clients`)
- Tabela z wyszukiwaniem i filtrem statusu.
- Dialog tworzenia nowego klienta (Insert do `clients`).
- **Auto-uzupełnianie z NIP:** Obok pola NIP znajduje się przycisk "Pobierz z bazy", który odpytuje publiczne API Ministerstwa Finansów (Biała Lista VAT): `GET https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={YYYY-MM-DD}`. Walidacja: NIP musi mieć dokładnie 10 cyfr (usuwane spacje i myślniki). Po pozytywnej odpowiedzi automatycznie wypełnia pola "Pełna nazwa firmy" (`name`) oraz "Adres" (`workingAddress`/`residenceAddress`). W przypadku błędu wyświetla żółty toast i pozwala na ręczne uzupełnienie.

#### Szczegóły Klienta (`/clients/:id`)
10 zakładek:

| Zakładka | Opis |
|---|---|
| Zadania | Kanban/lista zadań klienta. Filtrowanie po statusie, priorytecie. Zmiana statusów. |
| Rozmowy | Lista rozmów (telefon/spotkanie/email) z `client_conversations` |
| Oferty | Lista ofert z `client_offers` |
| Pomysły | Pomysły klienta z `client_ideas`. Głosowanie. |
| Umowy | Lista umów z `client_contracts` |
| Zlecenia | Lista zleceń z `client_orders` |
| Pliki (Drive) | Upload plików do Storage, linki z `client_files` |
| Social Media | Konta social z `client_social_accounts` |
| Dane do faktury | Formularz NIP/adres z `client_invoice_data` |
| Historia | Log aktywności z `activity_log` |

Nagłówek: karta z danymi klienta, onboarding progress, publiczny link statusu, timer, statystyki.

#### Projekty (`/projects`)
- Tabela projektów z klientem, statusem, managerem, datą.
- Dialog tworzenia nowego projektu.

#### Szczegóły Projektu (`/projects/:id`)
- Nagłówek: nazwa, status, badge briefu, klient, manager.
- Progress bar (ukończone/wszystkie zadania).
- Zespół projektu (z `task_assignments`).
- 3 zakładki: Zadania (lista z linkami), Budżet (placeholder), Brief (edytowalny Q&A + AI summary).
- **Klient:** widzi tylko zadania w `client_review`.

#### Lejek Sprzedaży (`/pipeline`)
- Kanban z 6 etapami: Potencjalny → Kontakt → Oferta wysłana → Negocjacje → Wygrane → Przegrane.
- Sumy wartości per etap.
- Dialog tworzenia nowej szansy (tytuł, wartość, etap, klient).
- Realtime na `pipeline_deals`.

#### Komunikator (`/messenger`)
- **Kanały grupowe:** Tworzenie kanałów, lista z ikonami #.
- **DM (wiadomości bezpośrednie):** Tworzenie nowych DM, automatyczne wykrywanie istniejących.
- **Wiadomości:** Tekst + załączniki (upload do Storage `chat_attachments`). Obrazki renderowane inline.
- **Reakcje emoji:** 8 emoji, toggle per wiadomość.
- **Realtime:** Supabase Realtime na messages + reactions.
- **Presence:** Supabase Presence — lista online, ikony statusu.
- **Typing indicator:** Broadcast typing events.

#### Tablica Operacyjna (`/operational`)
- Read-only Kanban: 8 kolumn statusów.
- Karty zadań z priorytetem, klientem, terminem.

#### Tablica Zespołu (`/team-board`)
- Kolumny per osoba + kolumna "Nieprzypisane".
- Drag & drop między osobami (zmiana primary assignment).
- Filtry: wyszukiwanie, priorytet.

#### Kalendarz (`/team/calendar`)
- Widok miesięczny (grid).
- Zadania na podstawie `due_date`.
- Nawigacja miesiąc ← →, przycisk "Dzisiaj".
- Kolory priorytetów.

#### Raporty Czasu (`/reports/time`)
- Okres: ten miesiąc / poprzedni.
- 4 karty: łącznie zalogowano, wpisów, aktywnych osób, zadań z logami.
- Tabele: czas wg osoby (z udziałem %), czas wg zadania (z klientem).

#### Zespół (`/team`)
- 4 karty statystyk: członkowie, otwarte zadania, w trakcie, zaległe.
- Tabela pracowników: osoba, email, rola, dział, status, liczba zadań, w trakcie, zaległe.
- **Dodawanie pracowników:** Dialog → Edge Function `create-staff-user`.
- **Filtrowanie:** Tylko role staff (superadmin, boss, koordynator, specjalista, praktykant), bez inactive.

#### Cele i OKR (`/okr`)
- Lokalne dane demo (MOCK_OBJECTIVES) — nie z Supabase.
- Cele z kluczowymi rezultatami (key results).
- Pasek postępu per cel i ogólny.
- Selector kwartału.

#### Ustawienia (`/settings`)
Sekcje (lokalne — nie persystowane w DB):
- Wygląd (motyw, sidebar, animacje, gęstość tabel, strona startowa)
- Powiadomienia (email, push, @, deadline, dźwięki, digest)
- Zadania i czas pracy (domyślny widok, priorytet, podzadania, time log)
- Zespół i gamifikacja (gamifikacja, streaki, leaderboard, briefing, godziny pracy)
- Portal klienta (chat, permisje, pliki, feedback, auto-notyfikacje, raport)
- AI i automatyzacja (sugestie, transkrypcja, smart digest, podsumowania spotkań)
- Bezpieczeństwo (timeout, zmiana hasła, historia logowań)

#### Uprawnienia (`/settings/permissions`)
- Macierz: moduły (wiersze) × role staff (kolumny).
- Checkboxy widoczności. superadmin/boss zawsze włączone (disabled).
- Persystowane w `role_permissions` (Supabase).

#### Automatyzacje (`/automations`)
- Lista predefiniowanych automatyzacji (lokalnie, nie z DB).
- Karty z: nazwa, opis, wyzwalacz, akcja, switch aktywności, licznik wykonań.

#### Pomysły Klientów — widok staff (`/staff-ideas`)
- Tabela wszystkich pomysłów ze wszystkich klientów.
- Zmiana statusu inline (new → reviewed → accepted → rejected).

#### Pomysły Klientów — portal klienta (`/client-ideas`)
- Klient widzi tylko swoje pomysły.
- Dialog zgłaszania nowego pomysłu.

#### Co nowego (`/whats-new`)
- Changelog z wersjami, datami i listą zmian.
- Lokalne dane (nie z DB).

#### Stub Pages
19 stron placeholder dla przyszłych modułów (Rutyny, Umowy, Zlecenia, Rozmowy, itd.).

---

## 7. Workflow Zadań — Reguły Biznesowe

### 7.1 Statusy zadań

```
new → todo → in_progress → review → client_review → client_verified → closed
                  ↓                      ↓
              waiting_for_client    corrections → (powrót do review)
                                        ↓
                                    cancelled
```

### 7.2 Walidacje przejść statusów

| Przejście | Walidacja |
|---|---|
| Dowolna zmiana statusu | Zadanie musi mieć ≥1 przypisaną osobę |
| `in_progress → review` | 100% pozycji checklisty musi być completed lub N/A |
| `review → client_review` | Wymagane potwierdzenie odpowiedzialności (modal `ResponsibilityModal`) |
| `corrections → client_review` | Wymagane potwierdzenie odpowiedzialności |
| `→ client_review` | Możliwe tylko z `review` lub `corrections` |

### 7.3 Modalne okna workflow

| Modal | Cel | Plik |
|---|---|---|
| `ChecklistBlockModal` | Blokuje przejście do review bez checklisty | WorkflowModals.tsx |
| `ResponsibilityModal` | Potwierdzenie odpowiedzialności przed wysłaniem do klienta | WorkflowModals.tsx |
| `NotUnderstoodModal` | Zgłoszenie niezrozumienia zadania | WorkflowModals.tsx |
| `ClientReviewModal` | Akceptacja/odrzucenie zadania przez klienta | WorkflowModals.tsx |

### 7.4 Flaga "Nie rozumiem"

- Specjalista może kliknąć "Nie rozumiem" → ustawia `not_understood = true`, dodaje komentarz.
- Na Kanbanach: pulsujący badge "❓ NIEJASNE".
- Alert w TaskAlertBanners z licznikiem.
- Koordynator widzi i może oznaczyć jako wyjaśnione (`clearNotUnderstood`).

---

## 8. Kluczowe Hooki

| Hook | Plik | Opis |
|---|---|---|
| `useAuth` | `src/hooks/useAuth.tsx` | Context: session, user, profile, signIn, signOut |
| `useRole` | `src/hooks/useRole.tsx` | Context: currentRole, isClient, clientId, permissions, canViewModule |
| `useStaffMembers` | `src/hooks/useStaffMembers.ts` | Query: lista aktywnych pracowników (filtr po rolach staff) |
| `useDashboardData` | `src/components/dashboard/useDashboardData.ts` | Agregacja statystyk dashboardu |
| `useRoutePrefetch` | `src/hooks/useRoutePrefetch.ts` | Prefetch danych dla nawigacji |

---

## 9. Storage (Supabase)

| Bucket | Publiczny | Użycie |
|---|---|---|
| `chat_attachments` | Nie | Załączniki wiadomości komunikatora |
| `task_materials` | Tak | Materiały/pliki zadań |

---

## 10. Layout i Nawigacja

### `AppLayout`
Wrapper: `SidebarProvider` + (AppSidebar lub ClientSidebar) + Topbar + main content + AIAssistantButton + CoordinatorFreezeOverlay.

### `AppSidebar`
7 sekcji: GŁÓWNE (3), PRACA (6), KLIENCI (7), KOMUNIKACJA (3), ZESPÓŁ (5), ANALITYKA (6), INNE (9).
Pozycje filtrowane przez `canViewModule()`.
Collapsible (ikony w trybie zwiniętym). Logo, avatar użytkownika, wersja, przycisk wylogowania.

### `ClientSidebar`
2 pozycje: Mój Dashboard, Zgłoś pomysł. Tytuł "PORTAL KLIENTA".

### `Topbar`
Tytuł strony, wyszukiwarka (staff only), przycisk zasilania bazy testowymi danymi, toggle theme (dark/light), bell z badge, avatar.

---

## 11. Bezpieczeństwo

### Row Level Security (RLS)
Wszystkie tabele mają włączone RLS. Kluczowe wzorce:
- **SELECT:** Większość tabel: `true` dla authenticated (wszyscy zalogowani widzą).
- **INSERT/UPDATE/DELETE:** Ograniczone przez `is_staff()`, `has_role()`, `is_task_member()`, `is_project_member()`.
- **Klienci:** Mogą aktualizować zadania powiązane z ich `client_id` (via JOIN profiles → clients).
- **Komentarze z odpowiedzią klienta:** Osobna polityka UPDATE dla klientów.

### Security Definer Functions
Funkcje `is_staff`, `has_role`, `is_task_member`, `is_project_member` działają z uprawnieniami SECURITY DEFINER, omijając RLS by uniknąć rekursji.

### Edge Functions
Wymagają `SUPABASE_SERVICE_ROLE_KEY` do operacji na `auth.admin`.

---

## 12. Realtime

Subskrypcje Supabase Realtime używane w:
- **TaskDetail:** 8 tabel (subtasks, comments, time_logs, status_history, assignments, checklists, materials, corrections).
- **Messenger:** messages, message_reactions + Presence + Broadcast (typing).
- **Pipeline:** pipeline_deals.
- **Dashboard:** activity_log (INSERT).
- **CoordinatorFreezeOverlay:** Polling co 30s (refetchInterval).

---

## 13. Struktura Plików

```
src/
├── App.tsx                    # Routing, providery
├── main.tsx                   # Entry point
├── index.css                  # Tokeny CSS, dark mode
├── hooks/
│   ├── useAuth.tsx            # Context autentykacji
│   ├── useRole.tsx            # Context ról i uprawnień
│   ├── useStaffMembers.ts     # Hook listy pracowników
│   └── useRoutePrefetch.ts    # Prefetch nawigacji
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx          # Router Staff/Client
│   ├── StaffDashboard.tsx
│   ├── ClientDashboard.tsx
│   ├── Tasks.tsx
│   ├── TaskDetail.tsx         # (~1274 linii)
│   ├── TaskArchive.tsx
│   ├── Clients.tsx
│   ├── ClientDetail.tsx       # (~1060 linii, 10 zakładek)
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Pipeline.tsx
│   ├── Messenger.tsx          # (~622 linii)
│   ├── OKR.tsx
│   ├── OperationalBoard.tsx
│   ├── TeamBoard.tsx
│   ├── TeamCalendar.tsx
│   ├── TimeReports.tsx
│   ├── MyDay.tsx
│   ├── Team.tsx
│   ├── Settings.tsx
│   ├── Permissions.tsx
│   ├── Automations.tsx
│   ├── AutomationCenter.tsx
│   ├── WhatsNew.tsx
│   ├── ClientIdeas.tsx
│   ├── StaffIdeas.tsx
│   └── StubPage.tsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── ClientSidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── AIAssistantButton.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── PageLoader.tsx
│   ├── tasks/
│   │   ├── TaskKanbanBoard.tsx
│   │   ├── TaskListView.tsx
│   │   ├── TaskFilters.tsx
│   │   ├── TaskAlertBanners.tsx
│   │   ├── CreateTaskDialog.tsx
│   │   ├── CoordinatorFreezeOverlay.tsx
│   │   ├── WorkflowModals.tsx
│   │   └── StatusTimeline.tsx
│   ├── clients/
│   │   ├── ClientsTable.tsx
│   │   └── CreateClientDialog.tsx
│   ├── projects/
│   │   └── CreateProjectDialog.tsx
│   ├── dashboard/
│   │   ├── AlertBanner.tsx
│   │   ├── StatCard.tsx
│   │   ├── TaskListCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── PipelineOverview.tsx
│   │   ├── TeamLoadCard.tsx
│   │   └── useDashboardData.ts
│   ├── team/
│   │   └── CreateStaffDialog.tsx
│   ├── skeletons/
│   │   ├── DashboardSkeleton.tsx
│   │   ├── KanbanSkeleton.tsx
│   │   └── TableSkeleton.tsx
│   └── ui/                    # shadcn/ui components (~50 plików)
├── integrations/supabase/
│   ├── client.ts              # Supabase client init
│   └── types.ts               # Auto-generated types (READ-ONLY)
├── lib/
│   ├── utils.ts               # cn() helper
│   └── seedDatabase.ts        # Seed helper
└── assets/
    └── logo-dark.png

supabase/
├── config.toml
├── functions/
│   ├── create-staff-user/index.ts
│   ├── create-client-user/index.ts
│   ├── create-superadmin/index.ts
│   └── seed-database/index.ts
└── migrations/                # READ-ONLY
```

---

## 14. Zmienne Środowiskowe

| Zmienna | Typ | Opis |
|---|---|---|
| `VITE_SUPABASE_URL` | Publiczna | URL projektu Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publiczna | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Klucz serwisowy (Edge Functions) |

---

*Koniec dokumentacji. Pamiętaj o ZŁOTEJ ZASADZIE — aktualizuj ten plik po każdej zmianie kodu!*
