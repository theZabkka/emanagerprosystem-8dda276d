

# Plan: Rozbudowa Raportów Czasu

## Obecny stan

`TimeReports.tsx` — minimalna strona z 2 okresami (ten/poprzedni miesiąc), brak filtrów po pracowniku/kliencie, brak eksportu CSV, brak zakładek. Tabela `time_logs` ma: `id, task_id, user_id, duration, phase, description, created_at`. Joiny do `profiles` i `tasks→clients` już działają.

## Rozwiązanie

Przepisanie strony na system zakładkowy z zaawansowanymi filtrami i eksportem CSV.

```text
┌──────────────────────────────────────────────────────────┐
│  RAPORTY CZASU                                           │
│  [Zakres dat ▾] [Pracownik ▾] [Klient ▾]  [Eksport CSV] │
│  ┌─────────────┬──────────────┬──────────────┐           │
│  │ Pracownicy  │  Klienci     │  Szczegóły   │           │
│  └─────────────┴──────────────┴──────────────┘           │
│  [4x KPI] + [Tabela aktywnej zakładki]                   │
└──────────────────────────────────────────────────────────┘
```

## Zmiany w plikach

### 1. Przepisanie `src/pages/TimeReports.tsx`

**Filtry globalne**:
- **Zakres dat**: Select z presetami — Ten tydzień, Ten miesiąc, Poprzedni miesiąc, Ostatnie 90 dni, Własny zakres (2x input date)
- **Pracownik**: Select z `useStaffMembers()`, opcja "Wszyscy"
- **Klient**: Select z query `clients`, opcja "Wszyscy"

**KPI Cards** (4 karty, reagują na filtry):
- Łącznie godzin, Wpisów czasu, Aktywnych osób, Śr. dzienna

**Tabs (3 zakładki)**:

**"Pracownicy"** — tabela per pracownik:
- Kolumny: Avatar+Imię, Dni aktywne, Wpisy, Łączny czas, Śr./dzień, Udział %
- Sortowanie po czasie malejąco

**"Klienci"** — tabela per klient:
- Kolumny: Firma, Zadań, Wpisy, Łączny czas, Udział %
- Grupowanie po `tasks.client_id → clients.name`

**"Szczegóły"** — pełna lista logów:
- Kolumny: Data, Pracownik, Zadanie, Klient, Opis, Czas
- Paginacja kliencka (50/strona)

**Przycisk "Eksportuj CSV"** — generuje plik z przefiltrowanych danych via `Blob` + `URL.createObjectURL`

### 2. Zapytanie do bazy

Jedno query (bez zmian w schemacie DB):
```ts
supabase.from("time_logs")
  .select("id, created_at, duration, description, phase, user_id, task_id,
    profiles:user_id(full_name, avatar_url),
    tasks:task_id(title, client_id, clients:client_id(name))")
  .gte("created_at", rangeStart)
  .lte("created_at", rangeEnd)
  .order("created_at", { ascending: false })
  .limit(5000)
```
Filtrowanie po `userId` i `clientId` w `useMemo` na kliencie.

### 3. Agregacje (useMemo)

- `byUser`: grupuj po `user_id` → suma minut, count wpisów, count unikalnych dni (`Set` z dat)
- `byClient`: grupuj po `tasks.client_id` → suma minut, count unikalnych zadań, count wpisów
- `filteredLogs`: zastosuj filtry userId/clientId
- KPI wyliczane z `filteredLogs`

## Pliki

| Plik | Akcja |
|------|-------|
| `src/pages/TimeReports.tsx` | Przepisanie — Tabs + filtry + 3 widoki + eksport CSV |

Brak zmian w bazie danych, routingu ani sidebarze.

