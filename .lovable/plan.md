

# Plan: Zwężenie i poprawa sidebara filtrów w zadaniach

## Problem
Sidebar filtrów ma `w-[300px]` — za szeroki, zabiera przestrzeń tablicy Kanban.

## Zmiana

**Plik: `src/components/tasks/TaskFilterSidebar.tsx`**

Zmniejszenie szerokości z `300px` na `240px` w dwóch miejscach:
- Linia 277: desktop aside `w-[300px]` → `w-[240px]`
- Linia 285: mobile overlay `w-[300px]` → `w-[240px]`

Dodatkowo drobne dopracowania wizualne:
- Zmniejszenie paddingu nagłówka sekcji (`px-4` → `px-3`)
- Zmniejszenie paddingu zawartości sekcji (`px-4` → `px-3`)
- Zmniejszenie fontu opcji filtrów z `text-sm` → `text-xs` dla kompaktowości
- Zmniejszenie max-height list (`max-h-[180px]` → `max-h-[160px]`)

Zero zmian w logice — wyłącznie CSS/layout.

