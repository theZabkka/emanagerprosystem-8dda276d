

# Plan: Globalne alerty krytyczne z animacją i dźwiękiem

## Problem

Alerty o nieprzypisanych zadaniach, weryfikacji i akceptacji klienta są widoczne **tylko na stronie `/tasks`** (komponent `TaskAlertBanners`) i częściowo na dashboardzie (`OverviewTab`). Koordynator na innej stronie nie widzi tych informacji.

## Rozwiązanie

Nowy komponent `GlobalAlertStrip` osadzony w `AppLayout.tsx` (nad `<main>`), widoczny **na każdej stronie** dla ról zarządczych. Banner "Do weryfikacji" pulsuje na żółto. Przy pojawieniu się nowego zadania do weryfikacji odtwarzany jest krótki dźwięk.

```text
┌─────────────────────────────────────────────────┐
│  [Snooze Banner - istniejący]                   │
├─────────────────────────────────────────────────┤
│  Sidebar  │  Topbar                             │
│           ├─────────────────────────────────────┤
│           │  ██ 3 nieprzypisane ██ MIGAJĄCY ██  │  ← GlobalAlertStrip
│           ├─────────────────────────────────────┤
│           │  <main> children                    │
│           │                                     │
└───────────┴─────────────────────────────────────┘
```

## Zmiany w plikach

### 1. Nowy `src/components/layout/GlobalAlertStrip.tsx`

- Hook `useQuery` z kluczem `["global-alert-counts"]` pobiera:
  - Nieprzypisane aktywne zadania (count)
  - Zadania w statusie `review` (count)
  - Zadania w statusie `client_review` (count)
- `refetchInterval: 15000`, subskrypcja Realtime na tabelę `tasks` invaliduje cache
- Widoczny tylko dla ról: `superadmin`, `boss`, `koordynator`
- Trzy paski (renderowane warunkowo):
  - **Nieprzypisane** (czerwony `bg-destructive`): "X zadań nieprzypisanych" + przycisk → `/tasks?unassigned=true`
  - **Do weryfikacji** (żółty z animacją pulse): "X czeka na weryfikację" + przycisk → `/tasks?status=review`. Klasa CSS: `animate-pulse bg-yellow-500`
  - **Akceptacja klienta** (pomarańczowy `bg-warning`): "X czeka na akceptację klienta" + przycisk → `/tasks?status=client_review`
- **Dźwięk**: `useRef` przechowuje poprzednią wartość `reviewCount`. Gdy nowa wartość > poprzednia → `new Audio("/sounds/review-alert.mp3").play()`. Plik audio: krótki "ding" (~0.5s), wygenerowany jako mały MP3 w `/public/sounds/`.

### 2. Edycja `src/components/layout/AppLayout.tsx`

- Import `GlobalAlertStrip`
- Umieszczenie `<GlobalAlertStrip />` między `<Topbar />` a `<main>` (wewnątrz `flex-col`, poza `navLockClasses`)

### 3. Nowy plik dźwięku `public/sounds/review-alert.mp3`

- Krótki dźwięk powiadomienia (wygenerowany programowo jako base64 data URI lub mały plik)

### 4. Animacja CSS w `tailwind.config.ts`

- Dodanie keyframe `alert-pulse` (żółte miganie tła) — bardziej widoczne niż domyślny `animate-pulse`:
```
"alert-pulse": {
  "0%, 100%": { opacity: "1" },
  "50%": { opacity: "0.7", transform: "scale(1.01)" }
}
```

### 5. Bez zmian w istniejących komponentach

`TaskAlertBanners` na stronie `/tasks` pozostaje — daje dodatkowe akcje filtrowania specyficzne dla tej strony. `GlobalAlertStrip` to warstwa informacyjna, nie zastępuje lokalnych bannerów.

## Pliki

| Plik | Akcja |
|------|-------|
| `src/components/layout/GlobalAlertStrip.tsx` | Nowy |
| `src/components/layout/AppLayout.tsx` | Edycja — dodanie GlobalAlertStrip |
| `tailwind.config.ts` | Edycja — nowy keyframe animacji |
| `public/sounds/review-alert.mp3` | Nowy — plik dźwiękowy |

