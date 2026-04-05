

# Plan: Przeprojektowanie widoku Transkrypcji — tabela z panelem bocznym

## Problem

Obecny widok to lista kart z rozwijaniem (accordion). Użytkownik musi klikać w każdą kartę osobno, traci kontekst listy, nie widzi wszystkich danych naraz. Brak szybkiego dostępu do odtwarzacza, AI podsumowania i tworzenia zadań.

## Rozwiązanie

Zamiana na **tabelę** z wiecznym widokiem listy + **panel boczny (Sheet)** do szczegółów. Wszystko widoczne bez rozwijania.

```text
┌──────────────────────────────────────────────────────────────────┐
│  TRANSKRYPCJE                                                    │
│  [Klient ▾] [Wszystkie|Przych.|Wych.] [🔍 Szukaj numeru]        │
├──┬───────────┬──────────┬─────────────┬────┬──────┬──────┬──────┤
│⬤│ Firma/Nr  │ Numer    │ Temat       │Data│ Czas │ ▶️   │ AI 💬│
├──┼───────────┼──────────┼─────────────┼────┼──────┼──────┼──────┤
│📞│ Acme Sp.  │+48 500.. │ Wycena proj │2.04│ 3:42 │[▶]   │[AI] [T]│
│📞│ +48 600.. │+48 600.. │ Bez tytułu  │1.04│ 1:15 │[▶]   │[AI] [T]│
└──┴───────────┴──────────┴─────────────┴────┴──────┴──────┴──────┘
                                                          ↓ klik [AI]
                                              ┌────────────────────┐
                                              │ PANEL BOCZNY       │
                                              │ Podsumowanie AI    │
                                              │ Sugestie + [Zadanie]│
                                              │ Transkrypcja       │
                                              │ Odtwarzacz audio   │
                                              └────────────────────┘
```

## Zmiany w plikach

### 1. Przepisanie `src/pages/Transcriptions.tsx`

**Usunięcie**: accordion/Collapsible logika, expandedId state.

**Dodanie**: stan `selectedCall` + `panelTab` ("ai" | "transcript").

**Wiersz tabeli** — każdy call wyświetla w jednym rzędzie:
- Ikona kierunku (kolorowa: zielona/niebieska/czerwona)
- **Firma** (z joina `clients.name`) lub sformatowany numer jeśli brak klienta
- **Numer telefonu** (font-mono, zawsze widoczny)
- **Temat** (`call.title` lub "Bez tytułu", truncate)
- **Data i godzina** (format: `DD.MM.YYYY, HH:mm`)
- **Czas trwania** (font-mono)
- **Przycisk ▶** — mini play/pause bezpośrednio w wierszu (inline `<audio>` ukryty, sterowany ref). Klik odtwarza/pauzuje nagranie bez otwierania panelu
- **Przycisk AI** (ikona Zap) — otwiera Sheet z podsumowaniem, sugestiami i akcjami
- **Przycisk Transkrypcja** (ikona FileText) — otwiera Sheet na zakładce transkrypcji

**Panel boczny** — `CallDetailsSheet.tsx` (istniejący, rozbudowany):
- Dodanie props `defaultTab?: "ai" | "transcript"`
- Tabs: "Analiza AI" | "Transkrypcja"
- W zakładce AI: podsumowanie + sugestie z przyciskami "Utwórz zadanie" (placeholder toast)
- W zakładce Transkrypcja: pełny tekst
- Odtwarzacz audio na górze (zawsze widoczny w panelu)

### 2. Edycja `src/components/calls/CallDetailsSheet.tsx`

- Dodanie prop `defaultTab`
- Wewnętrzne Tabs (Analiza AI / Transkrypcja)
- Przyciski akcji przy sugestiach (już istniejące, zachować)

### 3. Inline audio w wierszu

Mały `useRef<HTMLAudioElement>` per wiersz z ukrytym `<audio>`. Przycisk ▶/⏸ toggle play/pause. Tylko jeden wiersz gra naraz (state `playingId`).

## Pliki

| Plik | Akcja |
|------|-------|
| `src/pages/Transcriptions.tsx` | Przepisanie — tabela + inline play + otwieranie panelu |
| `src/components/calls/CallDetailsSheet.tsx` | Rozbudowa — dodanie tabs AI/Transkrypcja, prop defaultTab |

Zero zmian w bazie danych, routingu ani sidebarze.

