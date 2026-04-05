

# Plan: Scalenie 3 zakładek (Mój dzień + Pulpit + OKR) w jedno "Centrum"

## Problem

Trzy osobne strony — "Mój dzień" (`/my-day`), "Pulpit" (`/dashboard`), "Cele i OKR" (`/okr`) — pokrywają się funkcjonalnie. Każda ma statystyki, zadania i alerty. Użytkownik musi skakać między nimi bez jasnej wartości.

## Rozwiązanie

Jedna strona **"Pulpit"** (`/dashboard`) z systemem zakładek (Tabs) dostosowanych do roli:

```text
┌──────────────────────────────────────────────────────┐
│  PULPIT                                              │
│  ┌──────────┬─────────────┬──────────┐               │
│  │ Mój dzień│  Przegląd   │ Cele OKR │               │
│  └──────────┴─────────────┴──────────┘               │
│                                                      │
│  [Zawartość aktywnej zakładki]                        │
└──────────────────────────────────────────────────────┘
```

### Widoczność zakładek per rola

| Zakładka | superadmin/boss/koordynator | specjalista/praktykant |
|----------|---------------------------|----------------------|
| **Mój dzień** | tak (domyślna) | tak (domyślna) |
| **Przegląd** | tak (pełne statystyki firmy) | tak (uproszczone — tylko moje metryki) |
| **Cele OKR** | tak | ukryta |

### Co zawiera każda zakładka

**Mój dzień** (obecne `MyDay.tsx`):
- Podsumowanie dnia (data, 4 statystyki osobiste)
- Zaległe zadania, w trakcie, lista moich zadań
- Czas zalogowany dziś

**Przegląd** (obecne `StaffDashboard.tsx`):
- Alerty (bugi, nieprzypisane, zaległe, poprawki)
- 6 kart statystyk firmowych
- Listy: akceptacja klienta, poprawki
- Activity feed, pipeline, obciążenie zespołu

**Cele OKR** (obecne `OKR.tsx`):
- Selektor kwartału, progress ogólny
- Lista celów z key results

## Zmiany w plikach

### 1. Nowy `StaffDashboard.tsx` — kontener z Tabs
- Import `Tabs, TabsList, TabsTrigger, TabsContent`
- 3 zakładki, domyślna = "my-day"
- Dla `praktykant`/`specjalista` ukryj tab "Cele OKR"
- Każda `TabsContent` renderuje odpowiedni komponent

### 2. Wydzielenie treści do komponentów
- `src/components/dashboard/MyDayTab.tsx` — przeniesiona logika z `MyDay.tsx` (bez `AppLayout`)
- `src/components/dashboard/OverviewTab.tsx` — przeniesiona treść z obecnego `StaffDashboard` (alerty, statystyki, feed, pipeline, team load)
- `src/components/dashboard/OkrTab.tsx` — przeniesiona logika z `OKR.tsx` (bez `AppLayout`)

### 3. Routing (`App.tsx`)
- Usunąć trasy `/my-day` i `/okr`
- Usunąć lazy importy `MyDay` i `OKR`
- `/dashboard` zostaje (renderuje `Dashboard.tsx` → `StaffDashboard`)

### 4. Sidebar (`AppSidebar.tsx`)
- Sekcja "GŁÓWNE": usunąć "Mój dzień" i "Cele i OKR"
- Zostaje tylko "Pulpit" (`/dashboard`)

### 5. Pliki do usunięcia (opcjonalnie, mogą zostać puste)
- `src/pages/MyDay.tsx` — pusty re-export lub redirect
- `src/pages/OKR.tsx` — pusty re-export lub redirect

## Szczegóły techniczne

- `MyDayTab` i `OverviewTab` zachowują swoje istniejące hooki (`useQuery`, `useDashboardData`) — zero zmian w logice danych
- `OkrTab` zachowuje `useState` z MOCK_OBJECTIVES
- Jedyna zmiana UI: owijka `AppLayout` jest usunięta z komponentów wewnętrznych (bo `StaffDashboard` ma jedną wspólną `AppLayout`)
- Redirecty: `/my-day` i `/okr` → `Navigate to="/dashboard"` aby nie łamać zakładek/bookmarków

