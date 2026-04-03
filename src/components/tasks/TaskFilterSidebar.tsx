import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, X, SlidersHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, active = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-3 group transition-colors hover:bg-[hsl(var(--foreground)/0.03)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground group-hover:text-foreground/70 transition-colors">
          {title}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`px-5 pb-5 space-y-1 ${active ? "border-l-2 border-destructive ml-3 pl-4" : ""}`}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function PillBadge({ count }: { count: number }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--foreground)/0.06)] text-[hsl(var(--foreground)/0.35)] tabular-nums">
      {count}
    </span>
  );
}

function FilterSearch({ value, onChange, placeholder = "Szukaj..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative mb-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[hsl(var(--foreground)/0.25)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 pl-7 pr-2 text-[12px] bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.06)] rounded-md text-foreground/80 placeholder:text-[hsl(var(--foreground)/0.2)] focus:outline-none focus:border-[hsl(var(--foreground)/0.12)] transition-colors"
      />
    </div>
  );
}

export function TaskFilterSidebar({ filters, onFiltersChange, taskCountsByClient = {}, open, onOpenChange }: TaskFilterSidebarProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

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

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const s = clientSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(s));
  }, [clients, clientSearch]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const s = projectSearch.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(s));
  }, [projects, projectSearch]);

  const toggleArrayFilter = (key: keyof Pick<SidebarFilters, "clientIds" | "projectIds" | "assigneeIds" | "priorities" | "types">, value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const update: Partial<SidebarFilters> = { [key]: next };
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
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-[13px] font-semibold text-foreground/90">Filtry</span>
        </div>
        <div className="flex items-center gap-1">
          {hasAnyFilter && (
            <button onClick={clearAll} className="text-[11px] text-destructive/70 hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-destructive/5">
              Reset
            </button>
          )}
          <button onClick={() => onOpenChange(false)} className="md:hidden p-1 rounded-md hover:bg-[hsl(var(--foreground)/0.05)] text-muted-foreground/60">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-[hsl(var(--foreground)/0.05)]" />

      <div className="flex-1 overflow-y-auto space-y-1 py-2">
        {/* Client filter */}
        <CollapsibleSection title="Klient" active={filters.clientIds.length > 0}>
          {clients.length > 6 && (
            <FilterSearch value={clientSearch} onChange={setClientSearch} placeholder="Szukaj klienta..." />
          )}
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {filteredClients.map((c) => (
              <label key={c.id} className="flex items-center gap-2.5 px-2 py-[5px] rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-all group">
                <Checkbox
                  checked={filters.clientIds.includes(c.id)}
                  onCheckedChange={() => toggleArrayFilter("clientIds", c.id)}
                  className="h-[14px] w-[14px] rounded-[3px] border-[hsl(var(--foreground)/0.15)] data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <span className="truncate flex-1 text-[13px] text-foreground/75 group-hover:text-foreground/90 transition-colors">{c.name}</span>
                {taskCountsByClient[c.id] != null && taskCountsByClient[c.id] > 0 && (
                  <PillBadge count={taskCountsByClient[c.id]} />
                )}
              </label>
            ))}
            {filteredClients.length === 0 && <p className="text-[11px] text-muted-foreground/50 px-2 py-1">Brak wyników</p>}
          </div>
        </CollapsibleSection>

        {/* Project filter */}
        <CollapsibleSection title="Projekt" defaultOpen={false} active={filters.projectIds.length > 0}>
          {projects.length > 6 && (
            <FilterSearch value={projectSearch} onChange={setProjectSearch} placeholder="Szukaj projektu..." />
          )}
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {filteredProjects.map((p) => (
              <label key={p.id} className="flex items-center gap-2.5 px-2 py-[5px] rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-all group">
                <Checkbox
                  checked={filters.projectIds.includes(p.id)}
                  onCheckedChange={() => toggleArrayFilter("projectIds", p.id)}
                  className="h-[14px] w-[14px] rounded-[3px] border-[hsl(var(--foreground)/0.15)] data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <span className="truncate flex-1 text-[13px] text-foreground/75 group-hover:text-foreground/90 transition-colors">{p.name}</span>
              </label>
            ))}
            {filteredProjects.length === 0 && <p className="text-[11px] text-muted-foreground/50 px-2 py-1">Brak projektów</p>}
          </div>
        </CollapsibleSection>

        {/* Assignee filter */}
        <CollapsibleSection title="Osoby" defaultOpen={false} active={filters.assigneeIds.length > 0}>
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {staffMembers.map((s, idx) => (
              <label key={s.id} className="flex items-center gap-2.5 px-2 py-[5px] rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-all group">
                <Checkbox
                  checked={filters.assigneeIds.includes(s.id)}
                  onCheckedChange={() => toggleArrayFilter("assigneeIds", s.id)}
                  className="h-[14px] w-[14px] rounded-[3px] border-[hsl(var(--foreground)/0.15)] data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <Avatar className="h-5 w-5">
                  <AvatarFallback className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-[9px] text-white font-medium`}>
                    {(s.full_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 text-[13px] text-foreground/75 group-hover:text-foreground/90 transition-colors">{s.full_name || "—"}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        {/* Priority filter */}
        <CollapsibleSection title="Priorytet" active={filters.priorities.length > 0}>
          <div className="space-y-0.5">
            {PRIORITY_OPTIONS.map((p) => (
              <label key={p.value} className="flex items-center gap-2.5 px-2 py-[5px] rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-all group">
                <Checkbox
                  checked={filters.priorities.includes(p.value)}
                  onCheckedChange={() => toggleArrayFilter("priorities", p.value)}
                  className="h-[14px] w-[14px] rounded-[3px] border-[hsl(var(--foreground)/0.15)] data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <span className="text-[13px] text-foreground/75 group-hover:text-foreground/90 transition-colors">{p.label}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        {/* Type filter */}
        <CollapsibleSection title="Typ zadania" defaultOpen={false} active={filters.types.length > 0}>
          <div className="space-y-0.5">
            {TYPE_OPTIONS.map((t) => (
              <label key={t.value} className="flex items-center gap-2.5 px-2 py-[5px] rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-all group">
                <Checkbox
                  checked={filters.types.includes(t.value)}
                  onCheckedChange={() => toggleArrayFilter("types", t.value)}
                  className="h-[14px] w-[14px] rounded-[3px] border-[hsl(var(--foreground)/0.15)] data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <span className="text-[13px] text-foreground/75 group-hover:text-foreground/90 transition-colors">{t.label}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        {/* Sort */}
        <CollapsibleSection title="Sortowanie">
          <RadioGroup
            value={filters.sortField}
            onValueChange={(v) => onFiltersChange({ ...filters, sortField: v as SortField })}
            className="space-y-0.5"
          >
            {SORT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 px-2 py-[5px] rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-all group">
                <RadioGroupItem value={opt.value} className="h-[14px] w-[14px] border-[hsl(var(--foreground)/0.15)] data-[state=checked]:border-destructive data-[state=checked]:text-destructive" />
                <span className="text-[13px] text-foreground/75 group-hover:text-foreground/90 transition-colors">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>

          {filters.sortField !== "manual" && (
            <div className="flex items-center justify-between mt-3 px-2">
              <span className="text-[11px] text-muted-foreground/60">Malejąco</span>
              <Switch
                checked={filters.sortDirection === "desc"}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, sortDirection: checked ? "desc" : "asc" })}
                className="scale-90"
              />
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-[hsl(var(--background))] border-r border-[hsl(var(--foreground)/0.06)] overflow-hidden"
        style={{ background: "hsl(var(--card) / 0.6)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <div className="relative w-[280px] bg-[hsl(var(--card))] border-r border-[hsl(var(--foreground)/0.06)] flex flex-col z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
