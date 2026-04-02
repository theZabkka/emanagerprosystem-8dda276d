
## Plan implementacji "Snooze Weryfikacji"

### 1. Migracja SQL
Dodanie kolumn `verification_snoozed_until` (TIMESTAMPTZ) i `verification_snooze_count` (INTEGER DEFAULT 0) do tabeli `tasks`.

### 2. Hook `useVerificationLock.ts` — modyfikacja
- Zmiana zapytania: pobieranie także `verification_snoozed_until` i `verification_snooze_count` z tabeli `tasks`
- Filtrowanie: zadanie blokuje TYLKO gdy `snoozed_until IS NULL OR snoozed_until < NOW()`
- Dodanie osobnej listy `allReviewTasks` (wszystkie w statusie review, niezależnie od snooze) — do bannera
- Dodanie funkcji `snoozeMutation` do UPDATE snooze na zadaniu
- Refetch co 60s (zamiast 30s) aby wyłapać wygaśnięcie snooze

### 3. `CoordinatorFreezeOverlay.tsx` — przycisk Snooze
- Dodanie przycisku "Odłóż sprawdzenie na 1 godzinę" pod każdym zadaniem w popupie
- Renderowanie TYLKO gdy `snooze_count === 0`
- Po kliknięciu: UPDATE → invalidate queries → przejdź do następnego lub zdejmij blokadę

### 4. `AppLayout.tsx` — żółty banner
- Nowy komponent `VerificationBanner` wyświetlany dla koordynatorów
- Widoczny gdy `allReviewTasks.length > 0`
- Nieblokujący, z przyciskiem "Sprawdź zadanie"
