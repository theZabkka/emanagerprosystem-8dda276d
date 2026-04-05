

# Plan: Krytyczne poprawki wydajnościowe (N+1, paginacja, limity)

## Podsumowanie zmian

Trzy modyfikacje wyłącznie w warstwie pobierania danych, zero zmian w HTML/CSS.

---

## KROK 1: Lazy Loading Checklist

**Problem**: `TaskKanbanBoard.tsx` linie 91-110 — `useQuery` z kluczem opartym na `.join(",")` wszystkich task IDs pobiera checklisty dla WSZYSTKICH zadań na tablicy. Te dane są używane TYLKO w jednym miejscu: `isChecklistComplete()` (linia 112-126), wywoływane przez `validateAndMove()` przy przejściu `in_progress → review`.

**Rozwiązanie**: Zamiast masowego pre-fetchu, pobrać checklistę on-demand w momencie próby przeniesienia.

### Zmiany w `TaskKanbanBoard.tsx`:
- Usunąć cały blok `useQuery` dla `kanban-checklists` (linie 91-110)
- Zmienić `isChecklistComplete` z synchronicznej (opierającej się na `allChecklists`) na asynchroniczną funkcję, która robi jednorazowe zapytanie `supabase.from("checklists").select("task_id, checklist_items(is_completed, is_na)").eq("task_id", taskId)`
- Zaktualizować `validateAndMove` (linia 213-248), aby obsługiwał `await isChecklistComplete(taskId)` — dodać `async` i obsłużyć wynik
- Wynik zapytania cache'ować przez React Query `queryClient.fetchQuery` z kluczem `['checklists', taskId]` i `staleTime: 60s`, więc ponowne sprawdzenie tego samego zadania nie odpali kolejnego requesta

---

## KROK 2: Infinite Query dla widoku Listy

**Problem**: `Tasks.tsx` linia 103 — `.limit(500)` ładuje wszystkie zadania naraz. Widok listy (`TaskListView`) renderuje je wszystkie bez paginacji.

**Rozwiązanie**: Zostawić istniejące `useQuery` dla trybu Kanban (potrzebuje wszystkich aktywnych zadań). Dodać osobny `useInfiniteQuery` aktywowany TYLKO gdy `viewMode === "list"`.

### Zmiany w `Tasks.tsx`:
- Dodać nowy `useInfiniteQuery` z kluczem `["tasks-list", ...filters]`
- `queryFn` używa `.range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)` z `PAGE_SIZE = 50`
- `getNextPageParam` sprawdza czy zwrócono pełną stronę
- `enabled: viewMode === "list"`
- Istniejący `useQuery` dostaje `enabled: viewMode === "kanban" || viewMode === "kanban"` (aktywny dla obu trybów kanban)

### Zmiany w `TaskListView.tsx`:
- Dodać props: `hasNextPage`, `isFetchingNextPage`, `fetchNextPage`
- Na dole tabeli: przycisk "Załaduj więcej" widoczny gdy `hasNextPage`
- Alternatywnie: `IntersectionObserver` na ostatnim wierszu

---

## KROK 3: Limity kolumnowe Kanbana

**Problem**: Zapytanie Kanbanowe ładuje do 500 zadań bez podziału na statusy. Przy wzroście firmy, jedna kolumna (np. "done") może zdominować limit.

**Rozwiązanie**: Zmienić pojedyncze zapytanie na zapytania per-status z limitem, ponieważ Supabase nie obsługuje `LIMIT per partition`.

### Zmiany w `Tasks.tsx`:
- Zastąpić pojedyncze `.limit(500)` serią równoległych zapytań (jeden per aktywny status): `Promise.all(STATUSES.map(status => supabase.from("tasks").select(...).eq("status", status).eq("is_archived", false).neq("status", "closed").order("lexo_rank").limit(300)))`
- Scalić wyniki w jeden array
- Dodać flagę `truncatedColumns: string[]` — lista statusów, w których zwrócono dokładnie 300 rekordów
- Przekazać tę flagę do `TaskKanbanBoard`

### Zmiany w `TaskKanbanBoard.tsx` (tylko dane, nie UI):
- Przyjąć nowy opcjonalny prop `truncatedColumns?: string[]`

### Zmiany w `KanbanColumn.tsx` (minimalne UI):
- Jeśli `truncatedColumns` zawiera klucz kolumny, wyświetlić mały alert pod licznikiem: `"Wyświetlono maks. 300 zadań"` — jedna linia tekstu w `text-[10px] text-amber-500`

---

## Pliki do modyfikacji

| Plik | Zakres zmian |
|------|-------------|
| `src/components/tasks/TaskKanbanBoard.tsx` | Usunięcie masowego checklist query, async `isChecklistComplete`, nowy prop `truncatedColumns` |
| `src/pages/Tasks.tsx` | Dodanie `useInfiniteQuery` dla listy, zamiana `.limit(500)` na per-status queries z limitem 300 |
| `src/components/tasks/TaskListView.tsx` | Dodanie "Załaduj więcej" na dole tabeli |
| `src/components/tasks/KanbanColumn.tsx` | Wyświetlenie ostrzeżenia o limicie (1 linia tekstu) |

## Szczegóły techniczne

### Async checklist validation pattern:
```typescript
const isChecklistComplete = useCallback(async (taskId: string): Promise<boolean> => {
  const data = await queryClient.fetchQuery({
    queryKey: ['checklists', taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from("checklists")
        .select("task_id, checklist_items(is_completed, is_na)")
        .eq("task_id", taskId);
      return data || [];
    },
    staleTime: 60_000,
  });
  if (data.length === 0) return true;
  return data.every(cl => {
    const items = cl.checklist_items || [];
    return items.length === 0 || items.every(i => i.is_completed || i.is_na);
  });
}, [queryClient]);
```

### Per-status Kanban query pattern:
```typescript
const ACTIVE_STATUSES = ["new","todo","in_progress","waiting_for_client","review","corrections","client_review","client_verified","done","cancelled"];
const PER_STATUS_LIMIT = 300;

const results = await Promise.all(
  ACTIVE_STATUSES.map(status => 
    supabase.from("tasks").select(SELECT_FIELDS)
      .eq("is_archived", false).eq("status", status)
      .order("lexo_rank", { ascending: true }).limit(PER_STATUS_LIMIT)
  )
);
const tasks = results.flatMap(r => r.data ?? []);
const truncated = ACTIVE_STATUSES.filter((s, i) => (results[i].data?.length ?? 0) >= PER_STATUS_LIMIT);
```

