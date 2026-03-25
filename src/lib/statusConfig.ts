// Unified status color palette used across the entire application
// 5-tier professional color scale:
// Gray: Waiting/Queue | Blue: Active work | Yellow/Orange: Action required | Green: Success | Red: Problem

export const statusLabels: Record<string, string> = {
  new: "NOWE",
  todo: "DO ZROBIENIA",
  in_progress: "W REALIZACJI",
  review: "WERYFIKACJA",
  corrections: "POPRAWKI",
  client_review: "DO AKCEPTACJI KLIENTA",
  client_verified: "ZWERYFIKOWANE PRZEZ KLIENTA",
  waiting_for_client: "W OCZEKIWANIU NA KLIENTA",
  done: "GOTOWE",
  closed: "ZAMKNIĘTE",
  cancelled: "ANULOWANE",
};

export const statusColors: Record<string, string> = {
  // Gray — Waiting / Queue
  new: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  todo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  waiting_for_client: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",

  // Blue — Active work
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  corrections: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",

  // Yellow/Orange — Action required
  review: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  client_review: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

  // Green — Success
  client_verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

  // Red — Problem
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export const TERMINAL_STATUSES = new Set(["closed", "done", "cancelled"]);
