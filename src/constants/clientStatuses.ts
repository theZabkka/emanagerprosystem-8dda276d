// Client Lifecycle Status Configuration
// 15 statuses grouped by lifecycle phase

export interface ClientStatusConfig {
  value: string;
  label: string;
  group: string;
  colorClass: string; // Badge styling
}

export const CLIENT_STATUSES: ClientStatusConfig[] = [
  // Blue/Purple — New / Qualification
  { value: "Lead", label: "Lead", group: "Nowe", colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800" },
  { value: "Nowy kontakt", label: "Nowy kontakt", group: "Nowe", colorClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800" },
  { value: "W trakcie kwalifikacji", label: "W trakcie kwalifikacji", group: "Nowe", colorClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-800" },

  // Yellow/Orange — Process
  { value: "Skontaktowano się", label: "Skontaktowano się", group: "Proces", colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
  { value: "Oferta przygotowywana", label: "Oferta przygotowywana", group: "Proces", colorClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800" },
  { value: "Oferta wysłana", label: "Oferta wysłana", group: "Proces", colorClass: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-800" },
  { value: "W negocjacjach", label: "W negocjacjach", group: "Proces", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-400 dark:border-amber-700" },
  { value: "Oczekuje na decyzję", label: "Oczekuje na decyzję", group: "Proces", colorClass: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-400 dark:border-orange-700" },

  // Green — Success
  { value: "Aktywny klient", label: "Aktywny klient", group: "Sukces", colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
  { value: "Stały klient", label: "Stały klient", group: "Sukces", colorClass: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-300 dark:border-green-800" },

  // Gray — On hold
  { value: "Wstrzymany", label: "Wstrzymany", group: "Oczekujące", colorClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
  { value: "Archiwalny", label: "Archiwalny", group: "Oczekujące", colorClass: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700" },

  // Red — Failure
  { value: "Nieaktywny", label: "Nieaktywny", group: "Porażka", colorClass: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 border-red-300 dark:border-red-800" },
  { value: "Utracony klient", label: "Utracony klient", group: "Porażka", colorClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800" },
  { value: "Odrzucony", label: "Odrzucony", group: "Porażka", colorClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-400 dark:border-red-700" },
];

export const CLIENT_STATUS_MAP = Object.fromEntries(
  CLIENT_STATUSES.map((s) => [s.value, s])
);

export const CLIENT_STATUS_GROUPS = [
  { name: "Nowe", statuses: CLIENT_STATUSES.filter((s) => s.group === "Nowe") },
  { name: "Proces", statuses: CLIENT_STATUSES.filter((s) => s.group === "Proces") },
  { name: "Sukces", statuses: CLIENT_STATUSES.filter((s) => s.group === "Sukces") },
  { name: "Oczekujące", statuses: CLIENT_STATUSES.filter((s) => s.group === "Oczekujące") },
  { name: "Porażka", statuses: CLIENT_STATUSES.filter((s) => s.group === "Porażka") },
];

export function getClientStatusColor(status: string | null | undefined): string {
  return CLIENT_STATUS_MAP[status || ""]?.colorClass || "bg-muted text-muted-foreground border-border";
}

export function getClientStatusLabel(status: string | null | undefined): string {
  return CLIENT_STATUS_MAP[status || ""]?.label || status || "Nieznany";
}
