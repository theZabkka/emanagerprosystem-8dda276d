import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, X } from "lucide-react";
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
  { value: "due_date", label: "Termin" },
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

function Section({ title, defaultOpen = true, active = false, children }: { title: string; defaultOpen?: boolean; active?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 group">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
          {title}
        </span>
        <ChevronRight className={`h-3 w-3 text-muted-foreground/25 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className={`px-3 pb-3 pt-0.5 ${active ? "border-l-2 border-destructive/40 ml-3 pl-3" : ""}`}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MiniSearch({ value, onChange, placeholder = "Szukaj..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-7 px-2 mb-1.5 text-xs bg-transparent border-b border-[hsl(var(--foreground)/0.06)] text-foreground/70 placeholder:text-muted-foreground/25 focus:outline-none focus:border-[hsl(var(--foreground)/0.15)] transition-colors"
    />
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
    onFiltersChange({ ...filters, clientIds: [], projectIds: [], assigneeIds: [], priorities: [], types: [] });
  };

  const checkboxCls = "h-3.5 w-3.5 rounded-sm border-[hsl(var(--foreground)/0.12)] data-[state=checked]:bg-destructive data-[state=checked]:border-destructive";
  const optionCls = "flex items-center gap-2.5 px-2 py-1 rounded-md hover:bg-[hsl(var(--foreground)/0.04)] cursor-pointer transition-colors group";
  const labelCls = "truncate flex-1 text-xs text-foreground/60 group-hover:text-foreground/80 transition-colors";

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 shrink-0">
        <span className="text-sm font-medium text-foreground/80">Filtry</span>
        <div className="flex items-center gap-1">
          {hasAnyFilter && (
            <button onClick={clearAll} className="text-[11px] text-destructive/60 hover:text-destructive transition-colors px-1.5">
              Reset
            </button>
          )}
          <button onClick={() => onOpenChange(false)} className="md:hidden p-0.5 rounded hover:bg-[hsl(var(--foreground)/0.05)] text-muted-foreground/40">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-[hsl(var(--foreground)/0.05)] shrink-0" />

      {/* Scrollable filter sections */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {/* Klient */}
        <Section title="Klient" defaultOpen={false} active={filters.clientIds.length > 0}>
          {clients.length > 6 && <MiniSearch value={clientSearch} onChange={setClientSearch} placeholder="Szukaj klienta..." />}
          <div className="max-h-[160px] overflow-y-auto space-y-px">
            {filteredClients.map((c) => (
              <label key={c.id} className={optionCls}>
                <Checkbox checked={filters.clientIds.includes(c.id)} onCheckedChange={() => toggleArrayFilter("clientIds", c.id)} className={checkboxCls} />
                <span className={labelCls}>{c.name}</span>
                {taskCountsByClient[c.id] != null && taskCountsByClient[c.id] > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground/30 bg-[hsl(var(--foreground)/0.04)] px-1.5 py-0.5 rounded">{taskCountsByClient[c.id]}</span>
                )}
              </label>
            ))}
            {filteredClients.length === 0 && <p className="text-[11px] text-muted-foreground/30 px-2 py-1">Brak wyników</p>}
          </div>
        </Section>

        {/* Projekt */}
        <Section title="Projekt" defaultOpen={false} active={filters.projectIds.length > 0}>
          {projects.length > 6 && <MiniSearch value={projectSearch} onChange={setProjectSearch} placeholder="Szukaj projektu..." />}
          <div className="max-h-[180px] overflow-y-auto space-y-px">
            {filteredProjects.map((p) => (
              <label key={p.id} className={optionCls}>
                <Checkbox checked={filters.projectIds.includes(p.id)} onCheckedChange={() => toggleArrayFilter("projectIds", p.id)} className={checkboxCls} />
                <span className={labelCls}>{p.name}</span>
              </label>
            ))}
            {filteredProjects.length === 0 && <p className="text-[11px] text-muted-foreground/30 px-2 py-1">Brak projektów</p>}
          </div>
        </Section>

        {/* Osoby */}
        <Section title="Osoby" defaultOpen={false} active={filters.assigneeIds.length > 0}>
          <div className="max-h-[200px] overflow-y-auto space-y-px">
            {staffMembers.map((s, idx) => (
              <label key={s.id} className={optionCls}>
                <Checkbox checked={filters.assigneeIds.includes(s.id)} onCheckedChange={() => toggleArrayFilter("assigneeIds", s.id)} className={checkboxCls} />
                <Avatar className="h-[18px] w-[18px]">
                  <AvatarFallback className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-[8px] text-white font-medium`}>
                    {(s.full_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={labelCls}>{s.full_name || "—"}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Priorytet */}
        <Section title="Priorytet" defaultOpen={false} active={filters.priorities.length > 0}>
          <div className="space-y-px">
            {PRIORITY_OPTIONS.map((p) => (
              <label key={p.value} className={optionCls}>
                <Checkbox checked={filters.priorities.includes(p.value)} onCheckedChange={() => toggleArrayFilter("priorities", p.value)} className={checkboxCls} />
                <span className={labelCls}>{p.label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Typ */}
        <Section title="Typ zadania" defaultOpen={false} active={filters.types.length > 0}>
          <div className="space-y-px">
            {TYPE_OPTIONS.map((t) => (
              <label key={t.value} className={optionCls}>
                <Checkbox checked={filters.types.includes(t.value)} onCheckedChange={() => toggleArrayFilter("types", t.value)} className={checkboxCls} />
                <span className={labelCls}>{t.label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Sortowanie */}
        <Section title="Sortowanie" defaultOpen={false}>
          <div className="space-y-px">
            {SORT_OPTIONS.map((opt) => {
              const active = filters.sortField === opt.value;
              return (
                <button
                  key={opt.value}
                  className="flex items-center gap-2 w-full px-2 py-1 rounded-md hover:bg-[hsl(var(--foreground)/0.04)] transition-colors text-left"
                  onClick={() => onFiltersChange({ ...filters, sortField: opt.value as SortField })}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${active ? "bg-destructive" : "bg-transparent"}`} />
                  <span className={`text-sm transition-colors ${active ? "text-foreground/90 font-medium" : "text-foreground/40"}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {filters.sortField !== "manual" && (
            <div className="flex items-center justify-between mt-2 px-2">
              <span className="text-[11px] text-muted-foreground/40">Malejąco</span>
              <Switch
                checked={filters.sortDirection === "desc"}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, sortDirection: checked ? "desc" : "asc" })}
                className="scale-80"
              />
            </div>
          )}
        </Section>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-[300px] shrink-0 border-r border-[hsl(var(--foreground)/0.06)] overflow-hidden bg-background">
        {content}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <div className="relative w-[300px] bg-background border-r border-[hsl(var(--foreground)/0.06)] flex flex-col z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
