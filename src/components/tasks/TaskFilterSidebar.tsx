import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, X, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import type { SortField, SortDirection } from "./TaskFilters";

const AVATAR_COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-teal-600"];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Pilny" },
  { value: "high", label: "Wysoki" },
  { value: "medium", label: "Średni" },
  { value: "low", label: "Niski" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "due_date", label: "Termin / Deadline" },
  { value: "created_at", label: "Data utworzenia" },
  { value: "status_updated_at", label: "Czas w statusie" },
  { value: "priority", label: "Priorytet" },
  { value: "manual", label: "Ręczne" },
];

const TYPE_OPTIONS = [
  { value: "parent", label: "Nadrzędne" },
  { value: "subtask", label: "Podzadania" },
  { value: "standalone", label: "Samodzielne" },
];

export interface SidebarFilters {
  clientIds: string[];
  projectIds: string[];
  assigneeIds: string[];
  priorities: string[];
  types: string[];
  sortField: SortField;
  sortDirection: SortDirection;
}

interface TaskFilterSidebarProps {
  filters: SidebarFilters;
  onFiltersChange: (filters: SidebarFilters) => void;
  taskCountsByClient?: Record<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border/50">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-3 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TaskFilterSidebar({ filters, onFiltersChange, taskCountsByClient = {}, open, onOpenChange }: TaskFilterSidebarProps) {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-filter-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-filter-list", filters.clientIds],
    queryFn: async () => {
      let q = supabase.from("projects").select("id, name, client_id").eq("is_archived", false).order("name");
      if (filters.clientIds.length > 0) {
        q = q.in("client_id", filters.clientIds);
      }
      const { data } = await q;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffMembers = [] } = useStaffMembers();

  const toggleArrayFilter = (key: keyof Pick<SidebarFilters, "clientIds" | "projectIds" | "assigneeIds" | "priorities" | "types">, value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const update: Partial<SidebarFilters> = { [key]: next };
    // If client filter changes, clear project filter for removed clients
    if (key === "clientIds" && next.length > 0) {
      update.projectIds = filters.projectIds.filter((pid) => {
        const proj = projects.find((p) => p.id === pid);
        return proj && next.includes(proj.client_id!);
      });
    }
    onFiltersChange({ ...filters, ...update });
  };

  const hasAnyFilter = filters.clientIds.length > 0 || filters.projectIds.length > 0 || filters.assigneeIds.length > 0 || filters.priorities.length > 0 || filters.types.length > 0;

  const clearAll = () => {
    onFiltersChange({
      ...filters,
      clientIds: [],
      projectIds: [],
      assigneeIds: [],
      priorities: [],
      types: [],
    });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filtry</span>
        </div>
        <button onClick={() => onOpenChange(false)} className="md:hidden p-1 rounded hover:bg-muted/50 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Client filter */}
        <CollapsibleSection title="Klient">
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {clients.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.clientIds.includes(c.id)}
                  onCheckedChange={() => toggleArrayFilter("clientIds", c.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate flex-1 text-foreground/90">{c.name}</span>
                {taskCountsByClient[c.id] !== undefined && (
                  <span className="text-xs text-muted-foreground">({taskCountsByClient[c.id]})</span>
                )}
              </label>
            ))}
            {clients.length === 0 && <p className="text-xs text-muted-foreground">Brak klientów</p>}
          </div>
        </CollapsibleSection>

        {/* Project filter */}
        <CollapsibleSection title="Projekt" defaultOpen={false}>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {projects.map((p) => (
              <label key={p.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.projectIds.includes(p.id)}
                  onCheckedChange={() => toggleArrayFilter("projectIds", p.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate flex-1 text-foreground/90">{p.name}</span>
              </label>
            ))}
            {projects.length === 0 && <p className="text-xs text-muted-foreground">Brak projektów</p>}
          </div>
        </CollapsibleSection>

        {/* Assignee filter */}
        <CollapsibleSection title="Przypisane osoby" defaultOpen={false}>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {staffMembers.map((s, idx) => (
              <label key={s.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.assigneeIds.includes(s.id)}
                  onCheckedChange={() => toggleArrayFilter("assigneeIds", s.id)}
                  className="h-3.5 w-3.5"
                />
                <Avatar className="h-5 w-5">
                  <AvatarFallback className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-[10px] text-white`}>
                    {(s.full_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 text-foreground/90">{s.full_name || "—"}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        {/* Priority filter */}
        <CollapsibleSection title="Priorytet">
          <div className="space-y-1">
            {PRIORITY_OPTIONS.map((p) => (
              <label key={p.value} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.priorities.includes(p.value)}
                  onCheckedChange={() => toggleArrayFilter("priorities", p.value)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-foreground/90">{p.label}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        {/* Type filter */}
        <CollapsibleSection title="Typ zadania" defaultOpen={false}>
          <div className="space-y-1">
            {TYPE_OPTIONS.map((t) => (
              <label key={t.value} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.types.includes(t.value)}
                  onCheckedChange={() => toggleArrayFilter("types", t.value)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-foreground/90">{t.label}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        {/* Sort */}
        <CollapsibleSection title="Sortowanie">
          <RadioGroup
            value={filters.sortField}
            onValueChange={(v) => onFiltersChange({ ...filters, sortField: v as SortField })}
            className="space-y-1"
          >
            {SORT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/30 cursor-pointer text-sm">
                <RadioGroupItem value={opt.value} className="h-3.5 w-3.5" />
                <span className="text-foreground/90">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>

          {filters.sortField !== "manual" && (
            <div className="flex items-center justify-between mt-3 px-1">
              <Label className="text-xs text-muted-foreground">Malejąco</Label>
              <Switch
                checked={filters.sortDirection === "desc"}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, sortDirection: checked ? "desc" : "asc" })}
              />
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Clear all button */}
      {hasAnyFilter && (
        <div className="p-4 border-t border-border/50">
          <Button variant="outline" size="sm" className="w-full" onClick={clearAll}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Wyczyść wszystkie filtry
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-card border-r border-border rounded-l-lg overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
          <div className="relative w-[280px] bg-card border-r border-border flex flex-col z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
