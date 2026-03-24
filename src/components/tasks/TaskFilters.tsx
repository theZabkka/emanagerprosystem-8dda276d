import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, LayoutGrid, List, Layers, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";

const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

export type SortField = "created_at" | "status_updated_at" | "due_date" | "priority" | "manual";
export type SortDirection = "asc" | "desc";

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
}: TaskFiltersProps) {
  return (
    <div className="[&_svg]:pointer-events-none">
      <div className="relative mb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Szukaj zadań..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-10 h-11 text-sm" />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-[170px] h-9 text-sm"><SelectValue placeholder="Wszystkie priorytety" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie priorytety</SelectItem>
              {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Wszystkie typy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              <SelectItem value="parent">Tylko nadrzędne</SelectItem>
              <SelectItem value="subtask">Tylko podzadania</SelectItem>
              <SelectItem value="standalone">Tylko samodzielne</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sortuj po..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {viewMode === "kanban" && sortField !== "manual" && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 h-9 border border-dashed border-muted-foreground/30 rounded-md bg-muted/30">
                    <GripVertical className="h-3 w-3" />
                    <span>D&D wyłączony</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  Przeciąganie kart jest dostępne tylko w trybie sortowania „Ręczne"
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {sortField !== "manual" && (
            <button
              onClick={onSortDirectionToggle}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 h-9 border rounded-md bg-card transition-colors"
              title={sortDirection === "asc" ? "Rosnąco" : "Malejąco"}
            >
              {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>
          )}

          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 h-9 border rounded-md bg-card">
            <Layers className="h-3.5 w-3.5" />
            Pokaż podzadania
          </button>

          <div className="flex items-center rounded-lg overflow-hidden border">
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              title="Widok listy"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange("kanban")}
              className={`p-2 transition-colors ${viewMode === "kanban" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              title="Widok Kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-9" onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-1" /> Nowe zadanie
        </Button>
      </div>
    </div>
  );
}
