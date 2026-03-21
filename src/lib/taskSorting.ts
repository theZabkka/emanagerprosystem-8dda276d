import type { SortField, SortDirection } from "@/components/tasks/TaskFilters";

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function sortTasks(tasks: any[], field: SortField, direction: SortDirection): any[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0;

    if (field === "priority") {
      const wa = PRIORITY_WEIGHT[a.priority] ?? 0;
      const wb = PRIORITY_WEIGHT[b.priority] ?? 0;
      cmp = wa - wb;
    } else if (field === "due_date") {
      const da = a.due_date ? new Date(a.due_date).getTime() : null;
      const db = b.due_date ? new Date(b.due_date).getTime() : null;
      // Nulls always last
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      cmp = da - db;
    } else {
      // created_at or status_updated_at
      const va = a[field] ? new Date(a[field]).getTime() : 0;
      const vb = b[field] ? new Date(b[field]).getTime() : 0;
      cmp = va - vb;
    }

    return direction === "asc" ? cmp : -cmp;
  });
}
