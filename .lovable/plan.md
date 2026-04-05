

# Audyt Uprawnień i Błędów — Plan Naprawczy

## DIAGNOZA KRYTYCZNA: Dwa rozjechane systemy ról

Aplikacja ma **dwa niezależne, niespójne systemy ról**, które nie komunikują się poprawnie:

```text
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (profiles.role)  │  BAZA (user_roles.role)    │
│  ─────────────────────────  │  ────────────────────────  │
│  superadmin                │  superadmin                │
│  boss                      │  moderator  ← NIEZGODNE   │
│  koordynator               │  moderator  ← NIEZGODNE   │
│  specjalista               │  user / moderator ← CHAOS │
│  praktykant                │  user                      │
│  klient                    │  user       ← KLIENT=USER! │
└─────────────────────────────────────────────────────────┘
  app_role ENUM: {admin, moderator, user, superadmin}
  Frontend role: {superadmin, boss, koordynator, specjalista, praktykant, klient}
```

**Skutek**: RLS sprawdza `user_roles` (4 wartości enum), frontend sprawdza `profiles.role` (6 wartości string). Te systemy nie mapują się 1:1, co prowadzi do luk bezpieczeństwa.

---

## LISTA ZNALEZIONYCH PROBLEMÓW

### P1 — KRYTYCZNE (Bezpieczeństwo)

| # | Problem | Lokalizacja | Ryzyko |
|---|---------|-------------|--------|
| 1 | **Klient = "user" w RLS** — klient w `user_roles` ma rolę `user`, identyczną jak `praktykant`. RLS nie rozróżnia klientów od pracowników. | `user_roles` tabela | Klient może mieć dostęp do zasobów "staff-only" jeśli RLS polegnie na `is_staff()` — ale `is_staff()` ratuje sytuację sprawdzając TAKŻE `profiles.role`. Krytyczne natomiast jest to, że `has_role()` sprawdza TYLKO `user_roles` i nie zna ról frontendowych. |
| 2 | **Policy `clients.UPDATE = true`** — każdy zalogowany użytkownik może edytować DOWOLNEGO klienta (brak RLS). | `pg_policies: clients UPDATE` | Klient może zmodyfikować dane innej firmy. |
| 3 | **Policy na `tasks` z `roles: {public}`** — polityka "Kontakty widzą zadania swojej firmy" jest ustawiona dla roli `public` (niezalogowani!). Wprawdzie `auth.uid()` zwróci NULL więc query nie zwróci danych, ale to zła praktyka i potencjalna luka. | `tasks SELECT` | Niezalogowany użytkownik może odpytywać tabelę `tasks`. |
| 4 | **`profiles.role` to zwykły `text`** — nie enum, nie walidowany. Ktoś z dostępem do Supabase może wpisać "superadmin" w profiles i frontend da mu pełen dostęp (bo `useRole` czyta z `profiles`). | `useRole.tsx` linia 46 | Privilege escalation via profile update. |
| 5 | **Brak polityki RLS na profiles.UPDATE check dla `role`** — użytkownik może `UPDATE` swój profil (`auth.uid() = id`), w tym pole `role`. | `profiles UPDATE policy` | Każdy user może zmienić sobie rolę na "superadmin" w profiles! |

### P2 — POWAŻNE (Logika)

| # | Problem | Lokalizacja |
|---|---------|-------------|
| 6 | **`"admin"` ghost role** — w `ClientNotesTimeline.tsx` (linia 78) kod sprawdza `"admin"` w liście ról, ale taka rola nie istnieje w frontend (`AppRoleName`). | `ClientNotesTimeline.tsx:78` |
| 7 | **`as any` plague** — 156 wystąpień `from("table" as any)` w 12 plikach. Tabele `ticket_comments`, `client_notes`, `customer_contacts`, `response_templates`, `crm_labels`, `crm_deal_labels`, `ticket_attachments` nie mają prawidłowego typowania mimo że istnieją w `types.ts`. | 12 plików |
| 8 | **AdminBugs bez AdminRoute** — trasa `/admin/bugs` używa `ProtectedRoute` zamiast `AdminRoute`. Wewnątrz komponentu jest ręczny guard, ale rola `specjalista` i `praktykant` mogą chwilowo zobaczyć stronę zanim redirect zadziała. | `App.tsx:403` |
| 9 | **Permissions.tsx UPDATE** — `handleToggle` robi `.update()` ale jeśli wiersz nie istnieje (brak domyślnych rekordów dla nowej roli/modułu), update nie trafi w nic. Powinien być `.upsert()`. | `Permissions.tsx:44` |
| 10 | **`setPermissions` wystawiony publicznie** — hook `useRole` eksportuje `setPermissions` co pozwala dowolnemu komponentowi manipulować cache uprawnień lokalnie. | `useRole.tsx:30` |

### P3 — ŚREDNIE (Jakość kodu / UX)

| # | Problem | Lokalizacja |
|---|---------|-------------|
| 11 | **`(profile as any).client_id`** w `useRole.tsx:48` — brak typowania. | `useRole.tsx` |
| 12 | **`canViewModule` zwraca `false` dla klientów** — klient nie widzi ŻADNEGO modułu w sidebar (ale klient używa `ClientSidebar`, więc to jest OK tylko jeśli routing jest poprawny). Problem: klient może wpisać URL `/clients` ręcznie i zobaczyć stronę bo `ProtectedRoute` nie sprawdza roli. | Routing w `App.tsx` |
| 13 | **Permissions `.update()` z `as any`** — linia 46 w `Permissions.tsx`. | `Permissions.tsx:46` |

---

## PLAN NAPRAWCZY

### Faza 1: Krytyczne łatki bezpieczeństwa (Migracje SQL)

**1.1** Zablokuj self-escalation na `profiles.role`:
```sql
-- Dodaj policy, która blokuje zmianę pola role przez użytkownika
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );
```
(Wymaga `SECURITY DEFINER` helper aby uniknąć rekursji.)

**1.2** Napraw policy `clients.UPDATE`:
```sql
DROP POLICY "Allow authenticated users to update clients" ON clients;
CREATE POLICY "Staff can update clients" ON clients
  FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Klient może edytować TYLKO swoją firmę
CREATE POLICY "Client can update own company" ON clients
  FOR UPDATE TO authenticated
  USING (id = get_client_id_for_user(auth.uid()))
  WITH CHECK (id = get_client_id_for_user(auth.uid()));
```

**1.3** Napraw policy `tasks` z `roles: {public}`:
```sql
DROP POLICY "Kontakty widzą zadania swojej firmy" ON tasks;
-- Odtworzyć z roles: {authenticated}
```

### Faza 2: Naprawy w kodzie frontendowym

**2.1** `AdminBugs` — zmień routing z `ProtectedRoute` na `AdminRoute`.

**2.2** Usuń ghost rolę `"admin"` z `ClientNotesTimeline.tsx:78`.

**2.3** Permissions — zamień `.update()` na `.upsert()` z `onConflict`.

**2.4** Usuń `setPermissions` z publicznego API `useRole`.

**2.5** Napraw `(profile as any).client_id` w `useRole.tsx` — dodaj `client_id` do `ProfileData` interface w `useAuth.tsx`.

### Faza 3: Eliminacja `as any` w zapytaniach Supabase

Dotyczy 12 plików z ~156 wystąpieniami. Tabele istnieją w `types.ts`, więc wystarczy usunąć cast. Pliki:
- `CrmLabelManager.tsx` (5x)
- `ResponseTemplates.tsx` (5x)
- `ClientNotesCard.tsx` (4x)
- `ClientContactsTab.tsx` (3x)
- `TicketComments.tsx` (2x)
- `AdminTicketDetails.tsx`, `ClientTicketDetails.tsx`, `ClientDetail.tsx` (po 1-2x)
- `AdminBugs.tsx` (2x)
- `Permissions.tsx` (1x)
- `AdminTicketForm.tsx` (2x)
- `AnalyticsTasksTab.tsx` (RPC calls — zostawić)

### Faza 4: Dokumentacja rozbieżności enum

Udokumentować mapowanie `profiles.role` ↔ `user_roles.role`:
```text
superadmin ↔ superadmin
boss       ↔ moderator (w user_roles, admin w przyszłości)
koordynator ↔ moderator
specjalista ↔ user
praktykant  ↔ user
klient     ↔ user
```

Docelowo (poza tym planem): rozszerzyć `app_role` enum o polskie role lub zmienić `is_staff()` aby polegał wyłącznie na `profiles.role`.

---

## PLIKI DO MODYFIKACJI

| Plik | Typ zmiany |
|------|-----------|
| **Migracja SQL** | 3 nowe polityki RLS (profiles UPDATE, clients UPDATE, tasks SELECT) |
| `src/App.tsx` | Zmiana `ProtectedRoute` → `AdminRoute` dla `/admin/bugs` |
| `src/hooks/useRole.tsx` | Usunąć `setPermissions` z eksportu, naprawić `as any` |
| `src/hooks/useAuth.tsx` | Dodać `client_id` do `ProfileData` |
| `src/components/clients/ClientNotesTimeline.tsx` | Usunąć `"admin"` z listy ról |
| `src/pages/Permissions.tsx` | `.update()` → `.upsert()`, usunąć `as any` |
| 12 plików z `as any` | Usunąć casty na tabele Supabase |

## Priorytet

**Natychmiastowo**: P1 (1-5) — luki bezpieczeństwa, szczególnie `profiles.role` self-escalation i `clients.UPDATE = true`.

**Następnie**: P2 (6-10) — błędy logiki i typowania.

**Na koniec**: P3 (11-13) — jakość kodu.

