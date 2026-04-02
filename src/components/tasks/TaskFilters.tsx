import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, Users2, X } from "lucide-react";
import { useStaffMembers } from "@/hooks/useStaffMembers";

const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

export type SortField = "created_at" | "status_updated_at" | "due_date" | "priority" | "manual";
export type SortDirection = "asc" | "desc";
export type KanbanMode = "status" | "team";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  viewMode: "kanban" | "list";
  onViewModeChange: (mode: "kanban" | "list") => void;
  onCreateClick: () => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionToggle: () => void;
  kanbanMode?: KanbanMode;
  onKanbanModeChange?: (mode: KanbanMode) => void;
  assigneeFilter?: string;
  onAssigneeChange?: (value: string) => void;
}

const sortOptions: { value: SortField; label: string }[] = [
  { value: "due_date", label: "Termin / Deadline" },
  { value: "created_at", label: "Data utworzenia" },
  { value: "status_updated_at", label: "Czas w statusie" },
  { value: "priority", label: "Priorytet" },
  { value: "manual", label: "Ręczne" },
];

export function TaskFilters({
  search, onSearchChange,
  priorityFilter, onPriorityChange,
  typeFilter, onTypeChange,
  viewMode, onViewModeChange,
  onCreateClick,
  sortField, onSortFieldChange,
  sortDirection, onSortDirectionToggle,
  kanbanMode = "status", onKanbanModeChange,
  assigneeFilter = "all", onAssigneeChange,
}: TaskFiltersProps) {
  const { data: staffMembers = [] } = useStaffMembers();

  const h = "h-10";

  return (
    <div className="flex items-center gap-2 [&_svg]:pointer-events-none">
      {/* Left: Search + Filters */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="relative min-w-[160px] max-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Szukaj..." value={search} onChange={(e) => onSearchChange(e.target.value)} className={`pl-9 ${h} text-sm rounded-lg`} />
        </div>

        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className={`w-[135px] ${h} text-sm rounded-lg`}><SelectValue placeholder="Priorytet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie priorytety</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        {onAssigneeChange && (
          <div className="relative">
            <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
              <SelectTrigger className={`w-[155px] ${h} text-sm rounded-lg ${assigneeFilter !== "all" ? "border-primary ring-1 ring-primary/30" : ""}`}>
                <SelectValue placeholder="Osoby" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie osoby</SelectItem>
                {staffMembers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assigneeFilter !== "all" && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAssigneeChange("all"); }}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors pointer-events-auto z-10"
                title="Wyczyść filtr"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className={`w-[130px] ${h} text-sm rounded-lg`}><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="parent">Nadrzędne</SelectItem>
            <SelectItem value="subtask">Podzadania</SelectItem>
            <SelectItem value="standalone">Samodzielne</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
          <SelectTrigger className={`w-[145px] ${h} text-sm rounded-lg`}>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Sortuj" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {sortField !== "manual" && (
          <button
            onClick={onSortDirectionToggle}
            className={`flex items-center justify-center ${h} w-10 border rounded-lg bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0`}
            title={sortDirection === "asc" ? "Rosnąco" : "Malejąco"}
          >
            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Right: View switchers + Create */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Segmented control: all view modes in one group */}
        <div className={`flex items-center rounded-lg overflow-hidden border ${h}`}>
          <button
            onClick={() => { onViewModeChange("kanban"); onKanbanModeChange?.("status"); }}
            className={`px-2.5 ${h} flex items-center justify-center transition-colors ${viewMode === "kanban" && kanbanMode === "status" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            title="Kanban — Statusy"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => { onViewModeChange("kanban"); onKanbanModeChange?.("team"); }}
            className={`px-2.5 ${h} flex items-center justify-center transition-colors ${viewMode === "kanban" && kanbanMode === "team" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            title="Kanban — Zespół"
          >
            <Users2 className="h-4 w-4" />
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => onViewModeChange("list")}
            className={`px-2.5 ${h} flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            title="Widok listy"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Button className={`bg-destructive hover:bg-destructive/90 text-destructive-foreground ${h} rounded-lg px-4`} onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-1.5" /> Nowe zadanie
        </Button>
      </div>
    </div>
  );
}
