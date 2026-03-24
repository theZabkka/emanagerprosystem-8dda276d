import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { CalendarIcon, ChevronDown, FileText, X, Search, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getAfterRank } from "@/lib/lexoRank";

const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const initialForm = {
  title: "",
  description: "",
  priority: "medium",
  type: "",
  client_id: "",
  project_id: "",
  due_date: undefined as Date | undefined,
  estimated_time: "",
  brief_goal: "",
  brief_deliverable: "",
  brief_format: "",
  brief_inspiration: "",
};

/* ─── Reusable Combobox (single select) ─── */
function ComboboxField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Wyszukaj...",
  emptyText = "Brak wyników",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10 text-sm"
          >
            <span className="truncate">{selected?.label || `Wybierz ${label.toLowerCase()}...`}</span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} className="h-10" />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none"
                  onSelect={() => { onSelect(""); setOpen(false); }}
                  className="text-muted-foreground"
                >
                  — Brak —
                </CommandItem>
                {options.map(opt => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => { onSelect(opt.value); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", value === opt.value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── Multi-select Combobox for Assignees ─── */
function AssigneeCombobox({
  selectedUsers,
  toggleUser,
  profiles,
  loading,
}: {
  selectedUsers: string[];
  toggleUser: (id: string) => void;
  profiles: any[] | undefined;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initials = (name: string) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const available = (profiles || []).filter((p: any) => p.status !== "inactive");

  return (
    <div className="space-y-1.5">
      <Label>Przypisane osoby</Label>
      {/* Selected chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selectedUsers.map(uid => {
            const profile = available.find((p: any) => p.id === uid);
            const name = profile?.full_name || uid;
            return (
              <Badge key={uid} variant="secondary" className="gap-1 pr-1 text-xs">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{initials(name)}</AvatarFallback>
                </Avatar>
                {name}
                <button onClick={() => toggleUser(uid)} className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      {/* Combobox trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-10 text-sm"
          >
            <span className="text-muted-foreground">Wyszukaj pracownika...</span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Wpisz imię lub nazwisko..." className="h-10" />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>
                {loading ? "Ładowanie..." : "Brak wyników"}
              </CommandEmpty>
              <CommandGroup>
                {available.map((p: any) => {
                  const isSelected = selectedUsers.includes(p.id);
                  return (
                    <CommandItem
                      key={p.id}
                      value={p.full_name || p.email || p.id}
                      onSelect={() => toggleUser(p.id)}
                    >
                      <Check className={cn("mr-2 h-3.5 w-3.5", isSelected ? "opacity-100" : "opacity-0")} />
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">{initials(p.full_name || "")}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{p.full_name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{p.role}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── Main Dialog ─── */
export default function CreateTaskDialog({ open, onOpenChange, onCreated }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [briefOpen, setBriefOpen] = useState(false);
  const [nipInput, setNipInput] = useState("");
  const [nipLoading, setNipLoading] = useState(false);

  // Fetch clients (from clients table directly)
  const { data: clients } = useQuery({
    queryKey: ["create-task-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Fetch projects
  const { data: allProjects } = useQuery({
    queryKey: ["create-task-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, client_id").eq("is_archived", false).order("name");
      return data || [];
    },
  });

  // Staff
  const { data: profiles, isLoading: loadingProfiles } = useStaffMembers();

  // Filter projects by selected client
  const filteredProjects = useMemo(() => {
    if (!allProjects) return [];
    if (!form.client_id) return allProjects;
    return allProjects.filter((p: any) => p.client_id === form.client_id);
  }, [allProjects, form.client_id]);

  const clientOptions = useMemo(() =>
    (clients || []).map((c: any) => ({ value: c.id, label: c.name })),
    [clients]
  );

  const projectOptions = useMemo(() =>
    filteredProjects.map((p: any) => ({ value: p.id, label: p.name })),
    [filteredProjects]
  );

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedUsers([]);
    setBriefOpen(false);
    setNipInput("");
  };

  async function handleNipLookup() {
    const nip = nipInput.replace(/[\s-]/g, "");
    if (!/^\d{10}$/.test(nip)) {
      toast.error("Nieprawidłowy NIP. Wprowadź 10 cyfr.");
      return;
    }
    setNipLoading(true);
    try {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id, name")
        .eq("nip", nip)
        .maybeSingle();

      if (existingClient) {
        update("client_id", existingClient.id);
        toast.success(`Znaleziono klienta: ${existingClient.name}`);
        setNipLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("lookup-nip", {
        body: { nip },
      });

      if (fnError || !data || data.error) {
        toast.warning("Nie udało się pobrać danych z bazy. Klient nie został utworzony.");
        setNipLoading(false);
        return;
      }

      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          name: data.name || `Firma NIP: ${nip}`,
          nip,
          contact_person: data.contact_person || null,
          address: data.street || null,
          postal_code: data.postal_code || null,
          city: data.city || null,
          voivodeship: data.voivodeship || null,
          status: "potential" as any,
        })
        .select("id, name")
        .single();

      if (error) {
        toast.error("Błąd tworzenia klienta: " + error.message);
        setNipLoading(false);
        return;
      }

      update("client_id", newClient.id);
      queryClient.invalidateQueries({ queryKey: ["create-task-clients"] });
      toast.success(`Utworzono klienta: ${newClient.name}`);
    } catch {
      toast.warning("Nie udało się pobrać danych z bazy. Klient nie został utworzony.");
    } finally {
      setNipLoading(false);
    }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Podaj nazwę zadania"); return; }

    // Get the last lexo_rank in todo column to place new task at the end
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("lexo_rank")
      .eq("status", "todo" as any)
      .eq("is_archived", false)
      .order("lexo_rank" as any, { ascending: false })
      .limit(1)
      .single();

    const newRank = lastTask?.lexo_rank
      ? getAfterRank(lastTask.lexo_rank as string)
      : 'U';

    const taskPayload: any = {
      title: form.title,
      description: form.description || null,
      priority: form.priority as any,
      status: "todo" as any,
      type: form.type || null,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      due_date: form.due_date ? format(form.due_date, "yyyy-MM-dd") : null,
      estimated_time: form.estimated_time ? parseInt(form.estimated_time) * 60 : null,
      brief_goal: form.brief_goal || null,
      brief_deliverable: form.brief_deliverable || null,
      brief_format: form.brief_format || null,
      brief_inspiration: form.brief_inspiration || null,
      created_by: user?.id,
      lexo_rank: newRank,
    };

    const { data: newTask, error } = await supabase.from("tasks").insert(taskPayload).select("id").single();
    if (error) { toast.error("Błąd", { description: error.message }); return; }

    if (selectedUsers.length > 0 && newTask) {
      const assignments = selectedUsers.map((uid, i) => ({
        task_id: newTask.id,
        user_id: uid,
        role: (i === 0 ? "primary" : "collaborator") as any,
      }));
      await supabase.from("task_assignments").insert(assignments);
    }

    toast.success("Zadanie utworzone");
    resetForm();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowe zadanie</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Nazwa zadania *</Label>
            <Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Wpisz nazwę zadania..." className="h-11 text-base" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Opis</Label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Opisz szczegóły zadania..." className="min-h-[80px]" />
          </div>

          <Separator />

          {/* Priority + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priorytet</Label>
              <Select value={form.priority} onValueChange={v => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Input value={form.type} onChange={e => update("type", e.target.value)} placeholder="np. Grafika, Dev" />
            </div>
          </div>

          <Separator />

          {/* NIP lookup */}
          <div className="space-y-1.5">
            <Label>Klient po NIP (opcjonalnie)</Label>
            <div className="flex gap-2">
              <Input value={nipInput} onChange={e => setNipInput(e.target.value)} placeholder="Wpisz NIP firmy..." className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={handleNipLookup} disabled={nipLoading || !nipInput.trim()} className="shrink-0 h-10 px-3 gap-1.5">
                {nipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Znajdź
              </Button>
            </div>
          </div>

          {/* Client + Project Comboboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComboboxField
              label="Klient"
              value={form.client_id}
              options={clientOptions}
              onSelect={v => {
                update("client_id", v);
                if (v !== form.client_id) update("project_id", "");
              }}
              placeholder="Wpisz nazwę klienta..."
              emptyText="Nie znaleziono klienta"
            />
            <ComboboxField
              label="Projekt"
              value={form.project_id}
              options={projectOptions}
              onSelect={v => {
                update("project_id", v);
                if (v) {
                  const project = (allProjects || []).find((p: any) => p.id === v);
                  if (project?.client_id && !form.client_id) {
                    update("client_id", project.client_id);
                  }
                }
              }}
              placeholder="Wpisz nazwę projektu..."
              emptyText="Nie znaleziono projektu"
            />
          </div>

          {/* Assignees Combobox */}
          <AssigneeCombobox
            selectedUsers={selectedUsers}
            toggleUser={toggleUser}
            profiles={profiles}
            loading={loadingProfiles}
          />

          <Separator />

          {/* Date + Estimated time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Termin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.due_date ? format(form.due_date, "d MMM yyyy", { locale: pl }) : "Wybierz datę"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.due_date}
                    onSelect={d => update("due_date", d)}
                    disabled={{ before: new Date() }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Szacowany czas (godziny)</Label>
              <Input type="number" min={0} value={form.estimated_time} onChange={e => update("estimated_time", e.target.value)} placeholder="np. 8" />
            </div>
          </div>

          {/* Brief section */}
          <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border bg-muted/50 hover:bg-accent transition-colors text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Brief zadania
                <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", briefOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="space-y-1.5">
                <Label>Cel zadania</Label>
                <Textarea value={form.brief_goal} onChange={e => update("brief_goal", e.target.value)} placeholder="Co chcemy osiągnąć?" className="min-h-[60px]" />
              </div>
              <div className="space-y-1.5">
                <Label>Co dostarczyć</Label>
                <Textarea value={form.brief_deliverable} onChange={e => update("brief_deliverable", e.target.value)} placeholder="Jakie materiały mają być efektem?" className="min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Format dostarczenia</Label>
                  <Input value={form.brief_format} onChange={e => update("brief_format", e.target.value)} placeholder="np. Plik Figma, PDF" />
                </div>
                <div className="space-y-1.5">
                  <Label>Wzorzec / inspiracja</Label>
                  <Input value={form.brief_inspiration} onChange={e => update("brief_inspiration", e.target.value)} placeholder="URL lub opis" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={handleCreate} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Utwórz zadanie
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
