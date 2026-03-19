import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, LayoutGrid, List, Layers } from "lucide-react";

const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  viewMode: "kanban" | "list";
  onViewModeChange: (mode: "kanban" | "list") => void;
  onCreateClick: () => void;
}

export function TaskFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  priorityFilter, onPriorityChange,
  typeFilter, onTypeChange,
  viewMode, onViewModeChange,
  onCreateClick,
}: TaskFiltersProps) {
  return (
    <>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Szukaj zadań..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-10 h-11 text-sm" />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[170px] h-9 text-sm"><SelectValue placeholder="Wszystkie statusy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              <SelectItem value="new">Nowe</SelectItem>
              <SelectItem value="todo">Do zrobienia</SelectItem>
              <SelectItem value="in_progress">W realizacji</SelectItem>
              <SelectItem value="review">Weryfikacja</SelectItem>
              <SelectItem value="corrections">Poprawki</SelectItem>
              <SelectItem value="client_review">Akceptacja klienta</SelectItem>
              <SelectItem value="client_verified">Zweryfikowane przez klienta</SelectItem>
              <SelectItem value="waiting_for_client">W oczekiwaniu na klienta</SelectItem>
              <SelectItem value="done">Gotowe</SelectItem>
              <SelectItem value="closed">Zamknięte</SelectItem>
              <SelectItem value="cancelled">Anulowane</SelectItem>
            </SelectContent>
          </Select>

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
    </>
  );
}
