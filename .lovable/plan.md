

## Plan: Przebudowa modulu Transkrypcje

### Podsumowanie

Zamiana obecnego widoku (grupy Accordion + boczny drawer) na plaska liste z filtrowaniem i inline-expandable details.

### KROK 1: Nowy System Filtrowania

W `Transcriptions.tsx` zastapic pojedyncze pole wyszukiwania paskiem filtrow:

- **Filtr Klienta**: Select z lista klientow pobrana z `clients` table (+ opcja "Wszyscy")
- **Filtr Kierunku**: Select z opcjami: Wszystkie / Przychodzace / Wychodzace
- **Filtr Numeru**: Input tekstowy filtrujacy po `caller_number` / `callee_number`
- Filtrowanie client-side na juz pobranych danych

### KROK 2: Plaska Lista Polaczen

Usunac grupowanie po klientach (Accordion). Renderowac plaska liste Card-ow:

- Ikona kierunku (zielona = in, niebieska = out, czerwona = missed)
- Nazwa klienta z relacji `client.name` LUB fallback na **pogrubiony numer** (`caller_number` dla in, `callee_number` dla out)
- Tytul AI (`title`)
- Data + czas trwania po prawej

Klikniecie w karte rozwija/zwija sekcje szczegolowa (stan `expandedCallId`).

### KROK 3: Inline Widok Szczegolowy

Zamiast `CallDetailsSheet` (drawer), pod kliknietym wierszem renderowac rozwijana sekcje:

1. **Header**: Tytul, badge kierunku, data, czas trwania
2. **Audio Player**: natywny `<audio>` ze stylami CSS (`accent-color`, border-radius) dopasowanymi do dark theme
3. **AI Grid (2 kolumny)**:
   - Lewa: "Podsumowanie AI" (`ai_summary`)
   - Prawa: "Sugestie i Dzialania" (`suggestions`) - parsowane przez istniejacy `parseSuggestions()`
4. **Transkrypcja**: Collapsible, domyslnie zamkniety

### KROK 4: Logika Danych

- Query: `supabase.from("calls").select("*, client:clients(name)").order("called_at", { ascending: false })`
- Null-safe rendering: jesli `client_id` jest null, wyswietl `caller_number` (inbound) lub `callee_number` (outbound)
- Reuse helpery z `CallDetailsSheet.tsx`: `formatDuration`, `getCallIcon`, `parseSuggestions`

### Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/pages/Transcriptions.tsx` | Pelny rewrite: filtry, plaska lista, inline expand |
| `src/components/calls/CallDetailsSheet.tsx` | Bez zmian (helpery eksportowane nadal uzywane) |

### Szczegoly techniczne

- Stan rozwinietej karty: `const [expandedId, setExpandedId] = useState<string | null>(null)`