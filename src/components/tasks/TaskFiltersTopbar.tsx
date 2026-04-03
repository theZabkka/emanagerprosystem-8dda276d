import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, LayoutGrid, List, Users2, Filter } from "lucide-react";
import type { KanbanMode } from "./TaskFilters";

interface TaskFiltersTopbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: "kanban" | "list";
  onViewModeChange: (mode: "kanban" | "list") => void;
  onCreateClick: () => void;
  kanbanMode?: KanbanMode;
  onKanbanModeChange?: (mode: KanbanMode) => void;
  onToggleSidebar: () => void;
  activeFilterCount: number;
}

export function TaskFiltersTopbar({
  search, onSearchChange,
  viewMode, onViewModeChange,
  onCreateClick,
  kanbanMode = "status", onKanbanModeChange,
  onToggleSidebar,
  activeFilterCount,
}: TaskFiltersTopbarProps) {
  const h = "h-10";

  return (
    <div className="flex items-center gap-2 [&_svg]:pointer-events-none">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Mobile filter toggle */}
        <Button variant="outline" size="sm" className={`md:hidden ${h} px-3`} onClick={onToggleSidebar}>
          <Filter className="h-4 w-4 mr-1" />
          Filtry
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <div className="relative min-w-[160px] max-w-[280px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Szukaj zadań..." value={search} onChange={(e) => onSearchChange(e.target.value)} className={`pl-9 ${h} text-sm rounded-lg`} />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
