import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { CalendarIcon, ChevronDown, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockClients, mockProjects, mockProfiles } from "@/lib/mockData";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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

export default function CreateTaskDialog({ open, onOpenChange, onCreated }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const { isDemo } = useDataSource();
  const [form, setForm] = useState(initialForm);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [briefOpen, setBriefOpen] = useState(false);

  // Fetch client users (profiles with role 'klient')
  const { data: clients } = useQuery({
    queryKey: ["create-task-clients", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProfiles.filter(p => p.role === "klient");
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, client_id, avatar_url")
        .eq("role", "klient")
        .order("full_name");
      return data || [];
    },
  });

  // Fetch projects
  const { data: allProjects } = useQuery({
    queryKey: ["create-task-projects", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProjects;
      const { data } = await supabase.from("projects").select("id, name, client_id").order("name");
      return data || [];
    },
  });

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ["create-task-profiles", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProfiles;
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").order("full_name");
      return data || [];
    },
  });

  // Filter projects by selected client profile's client_id
  const filteredProjects = useMemo(() => {
    if (!allProjects) return [];
    if (!form.client_id) return allProjects;
    // form.client_id stores the profile's client_id (from clients table)
    return allProjects.filter((p: any) => p.client_id === form.client_id);
  }, [allProjects, form.client_id]);

  // Filter client profiles by selected project
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!form.project_id) return clients;
    const project = (allProjects || []).find((p: any) => p.id === form.project_id);
    if (project?.client_id) return clients.filter((c: any) => c.client_id === project.client_id);
    return clients;
  }, [clients, allProjects, form.project_id]);

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
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Podaj nazwę zadania"); return; }
    if (selectedUsers.length === 0) { toast.error("Musisz przypisać co najmniej jedną osobę do zadania"); return; }

    if (isDemo) {
      toast.info("W trybie demo nie można tworzyć zadań");
      return;
    }

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
    };

    const { data: newTask, error } = await supabase.from("tasks").insert(taskPayload).select("id").single();
    if (error) { toast.error("Błąd", { description: error.message }); return; }

    // Insert assignments
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

  const initials = (name: string) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

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

          {/* Row: Priority + Type */}
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

          {/* Relational: Client + Project */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Klient</Label>
              <Select value={form.client_id} onValueChange={v => {
                update("client_id", v === "__none" ? "" : v);
                if (v === "__none" || v !== form.client_id) update("project_id", "");
              }}>
                <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Brak —</SelectItem>
                  {(filteredClients || []).filter((c: any) => c.client_id).map((c: any) => (
                    <SelectItem key={c.id} value={c.client_id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Projekt</Label>
              <Select value={form.project_id} onValueChange={v => {
                const val = v === "__none" ? "" : v;
                update("project_id", val);
                // Auto-set client from project
                if (val) {
                  const project = (allProjects || []).find((p: any) => p.id === val);
                  if (project?.client_id && !form.client_id) {
                    update("client_id", project.client_id);
                  }
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Wybierz projekt..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Brak —</SelectItem>
                  {filteredProjects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label>Przypisane osoby <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[42px]">
              {selectedUsers.map(uid => {
                const profile = (profiles || []).find((p: any) => p.id === uid);
                const name = (profile as any)?.full_name || uid;
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
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(profiles || []).filter((p: any) => !selectedUsers.includes(p.id)).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => toggleUser(p.id)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs border rounded-full hover:bg-accent transition-colors"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">{initials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  {p.full_name}
                </button>
              ))}
            </div>
          </div>

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

          {/* Brief section (collapsible) */}
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
