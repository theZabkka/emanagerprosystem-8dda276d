

# Plan: E2E Smoke Tests z Playwright (Safety Net)

## Kontekst

Projekt ma już `@playwright/test` w devDependencies i plik `playwright.config.ts` (wrapper Lovable). Brak folderu `e2e/`, brak husky/lint-staged. Testy będą używać **mock API** (`page.route()`) zamiast prawdziwego Supabase, co eliminuje ryzyko zanieczyszczenia bazy.

## Ograniczenie platformy

Lovable nie obsługuje `husky` ani git hooks (git state jest zarządzany wewnętrznie). Zamiast tego skonfigurujemy skrypt `lint-check` w `package.json`, który można uruchomić ręcznie lub w CI.

---

## ETAP 1: Konfiguracja

### 1a. Nowy `playwright.config.ts`
Zastąpić obecny wrapper własną konfiguracją:
- Projekt: Chromium only
- BaseURL: `http://localhost:5173`
- WebServer: `npm run dev` z automatycznym startem
- Folder testów: `e2e/`
- Timeout: 30s per test

### 1b. Skrypty w `package.json`
Dodać:
- `"e2e"`: `playwright test`
- `"e2e:ui"`: `playwright test --ui`
- `"lint-check"`: `tsc --noEmit && eslint .`

### 1c. Plik `e2e/helpers/mock-auth.ts`
Wspólny helper do mockowania Supabase Auth i API:
- `mockSupabaseAuth(page, role)` -- przechwytuje `page.route('**/auth/v1/**')` i zwraca sesję z wybraną rolą (klient/specjalista/superadmin)
- `mockSupabaseQuery(page, table, data)` -- przechwytuje `page.route('**/rest/v1/{table}**')` i zwraca podane dane
- Przygotowane fixture'y profili dla ról: klient, specjalista, superadmin

---

## ETAP 2: Scenariusze testowe

### Test 1: `e2e/auth-routing.spec.ts`
**Cel**: Weryfikacja izolacji tras klient vs admin.

1. Mock sesji z rolą `klient` + profil z `client_id`
2. Nawigacja do `/dashboard` → asercja: widoczny `ClientDashboard` (np. tekst "Projekty" lub specyficzny element klienta)
3. Nawigacja do `/crm` → asercja: redirect do `/dashboard` (AdminRoute blokuje) lub brak treści CRM
4. Nawigacja do `/settings/permissions` → asercja: redirect (AdminRoute)
5. Bonus: niezalogowany user → `/tasks` → redirect do `/login`

### Test 2: `e2e/tickets-lifecycle.spec.ts`
**Cel**: Cykl życia zgłoszenia klienta.

1. Mock sesji klienta + mock `customer_contacts` (zwraca contactId)
2. Nawigacja do `/client/tickets/new`
3. Wypełnienie formularza:
   - Input `title` (label "Temat")
   - Select `department` (pierwszy z listy)
   - Opis via RichTextEditor (klik + wpisanie tekstu w `[contenteditable]`)
4. Mock POST do `rest/v1/tickets` -- przechwycenie i weryfikacja payloadu
5. Mock GET `/rest/v1/tickets` po submicie -- zwrócenie nowego ticketu
6. Asercja: po submicie redirect do `/client/tickets` i widoczny tytuł testowego zgłoszenia

### Test 3: `e2e/kanban-dnd.spec.ts`
**Cel**: Drag & Drop na tablicy Kanban.

1. Mock sesji specjalisty
2. Mock `tasks` query -- zwrócenie 2-3 zadań w kolumnie "NOWE" (`status: "new"`)
3. Mock `task_assignments`, `profiles`, `clients` queries
4. Nawigacja do `/tasks`
5. Lokalizacja karty zadania w kolumnie "NOWE"
6. `page.locator('[data-rfd-draggable-id="task-xyz"]').dragTo(page.locator('[data-rfd-droppable-id="todo"]'))`
7. Przechwycenie PATCH do `rest/v1/tasks` -- asercja że payload zawiera `status: "todo"`
8. Fallback: jeśli DnD zawodzi (hello-pangea/dnd bywa problematyczne z Playwright), test weryfikuje przynajmniej renderowanie kolumn i kart

---

## Struktura plików

```text
e2e/
  helpers/
    mock-auth.ts          # Mockowanie sesji Supabase
    fixtures.ts           # Dane testowe (profile, zadania, tickety)
  auth-routing.spec.ts
  tickets-lifecycle.spec.ts
  kanban-dnd.spec.ts
playwright.config.ts      # Nadpisany
package.json              # Nowe skrypty
```

## Szczegóły techniczne mockowania

Każdy test używa `page.route()` do przechwycenia żądań fetch do Supabase URL (`wdsgtbdqgtwnywvkquhd.supabase.co`). Mockujemy:
- `POST /auth/v1/token` → sesja z tokenem
- `GET /auth/v1/user` → profil użytkownika
- `GET /rest/v1/profiles` → dane profilu z rolą
- `GET /rest/v1/role_permissions` → uprawnienia
- Tabele specyficzne per test (tasks, tickets, customer_contacts, crm_deals)

To zapewnia pełną izolację od bazy produkcyjnej -- żadne dane nie są modyfikowane.

