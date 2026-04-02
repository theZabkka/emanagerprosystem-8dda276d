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

  return (
    <div className="flex items-center gap-2 flex-wrap [&_svg]:pointer-events-none">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Szukaj zadań..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Filters */}
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Priorytet" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie priorytety</SelectItem>
          {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      {onAssigneeChange && (
        <div className="relative">
          <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
            <SelectTrigger className={`w-[170px] h-9 text-sm ${assigneeFilter !== "all" ? "border-primary ring-1 ring-primary/30" : ""}`}>
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
        <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Typ" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie typy</SelectItem>
          <SelectItem value="parent">Nadrzędne</SelectItem>
          <SelectItem value="subtask">Podzadania</SelectItem>
          <SelectItem value="standalone">Samodzielne</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
        <SelectTrigger className="w-[155px] h-9 text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
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
          className="flex items-center justify-center h-9 w-9 border rounded-md bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={sortDirection === "asc" ? "Rosnąco" : "Malejąco"}
        >
          {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* View switchers */}
      {viewMode === "kanban" && onKanbanModeChange && (
        <div className="flex items-center rounded-lg overflow-hidden border shrink-0">
          <button
            onClick={() => onKanbanModeChange("status")}
            className={`p-2 transition-colors ${kanbanMode === "status" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            title="Grupuj wg statusów"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onKanbanModeChange("team")}
            className={`p-2 transition-colors ${kanbanMode === "team" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            title="Grupuj wg osób"
          >
            <Users2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center rounded-lg overflow-hidden border shrink-0">
        <button
          onClick={() => onViewModeChange("kanban")}
          className={`p-2 transition-colors ${viewMode === "kanban" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          title="Widok Kanban"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-2 transition-colors ${viewMode === "list" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          title="Widok listy"
        >
          <List className="h-4 w-4" />
        </button>
      </div>

      {/* Create button */}
      <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-9 shrink-0" onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-1" /> Nowe zadanie
      </Button>
    </div>
  );
}
