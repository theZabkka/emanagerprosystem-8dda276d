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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, ChevronDown, FileText, Plus, Trash2, ChevronsUpDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStaffMembers } from "@/hooks/useStaffMembers";

const statusOptions = [
  { value: "active", label: "Aktywny" },
  { value: "planning", label: "Oczekujący" },
  { value: "paused", label: "Wstrzymany" },
  { value: "completed", label: "Zakończony" },
];

const defaultBriefQuestions = [
  "Jaki jest główny cel nowej strony?",
  "Kim jest Wasza główna grupa docelowa?",
  "Jakie funkcjonalności są priorytetowe?",
];

interface BriefItem { question: string; answer: string }

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const initialForm = {
  name: "",
  description: "",
  status: "active",
  client_id: "",
  manager_id: "",
  start_date: undefined as Date | undefined,
  end_date: undefined as Date | undefined,
  budget: "",
};

export default function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefItems, setBriefItems] = useState<BriefItem[]>(
    defaultBriefQuestions.map(q => ({ question: q, answer: "" }))
  );
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["create-project-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const { data: staffMembers = [] } = useStaffMembers();

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const initials = (name: string) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const resetForm = () => {
    setForm(initialForm);
    setBriefOpen(false);
    setBriefItems(defaultBriefQuestions.map(q => ({ question: q, answer: "" })));
  };

  const addBriefQuestion = () => {
    setBriefItems(prev => [...prev, { question: "", answer: "" }]);
  };

  const removeBriefQuestion = (index: number) => {
    setBriefItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateBrief = (index: number, field: "question" | "answer", value: string) => {
    setBriefItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const selectedClientName = useMemo(() => {
    if (!form.client_id) return null;
    return (clients || []).find(c => c.id === form.client_id)?.name || null;
  }, [form.client_id, clients]);

  const selectedManagerName = useMemo(() => {
    if (!form.manager_id) return null;
    return staffMembers.find(s => s.id === form.manager_id)?.full_name || null;
  }, [form.manager_id, staffMembers]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Podaj nazwę projektu"); return; }
    const briefData = briefItems.filter(b => b.question.trim());

    const payload: any = {
      name: form.name,
      description: form.description || null,
      status: form.status,
      client_id: form.client_id || null,
      manager_id: form.manager_id || null,
      start_date: form.start_date ? format(form.start_date, "yyyy-MM-dd") : null,
      end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
      brief_data: briefData.length > 0 ? briefData : [],
    };

    const { error } = await supabase.from("projects").insert(payload);
    if (error) { toast.error("Błąd", { description: error.message }); return; }

    toast.success("Projekt utworzony");
    resetForm();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowy projekt</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nazwa projektu *</Label>
            <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Wpisz nazwę projektu..." className="h-11 text-base" />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Opis / cel projektu</Label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Opisz cel i zakres projektu..." className="min-h-[80px]" />
          </div>

          <Separator />

          {/* Client + Manager — Searchable Comboboxes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Klient</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm h-10">
                    {selectedClientName ? (
                      <span className="flex items-center gap-2 truncate">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{initials(selectedClientName)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{selectedClientName}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Wybierz klienta...</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {form.client_id && (
                        <span
                          role="button"
                          className="h-4 w-4 rounded-sm hover:bg-accent flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); update("client_id", ""); }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Szukaj klienta..." />
                    <CommandList>
                      <CommandEmpty>Nie znaleziono klienta.</CommandEmpty>
                      <CommandGroup>
                        {(clients || []).map(c => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              update("client_id", c.id === form.client_id ? "" : c.id);
                              setClientPopoverOpen(false);
                            }}
                          >
                            <Avatar className="h-5 w-5 mr-2 shrink-0">
                              <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{initials(c.name)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{c.name}</span>
                            <Check className={cn("ml-auto h-4 w-4 shrink-0", form.client_id === c.id ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Kierownik projektu</Label>
              <Popover open={managerPopoverOpen} onOpenChange={setManagerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm h-10">
                    {selectedManagerName ? (
                      <span className="flex items-center gap-2 truncate">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{initials(selectedManagerName)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{selectedManagerName}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Wybierz kierownika...</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {form.manager_id && (
                        <span
                          role="button"
                          className="h-4 w-4 rounded-sm hover:bg-accent flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); update("manager_id", ""); }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Szukaj pracownika..." />
                    <CommandList>
                      <CommandEmpty>Nie znaleziono pracownika.</CommandEmpty>
                      <CommandGroup>
                        {staffMembers.map(s => (
                          <CommandItem
                            key={s.id}
                            value={s.full_name || ""}
                            onSelect={() => {
                              update("manager_id", s.id === form.manager_id ? "" : s.id);
                              setManagerPopoverOpen(false);
                            }}
                          >
                            <Avatar className="h-5 w-5 mr-2 shrink-0">
                              <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{initials(s.full_name || "")}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{s.full_name}</span>
                            <Check className={cn("ml-auto h-4 w-4 shrink-0", form.manager_id === s.id ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Dates + Budget */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Data rozpoczęcia</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !form.start_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.start_date ? format(form.start_date, "d MMM yyyy", { locale: pl }) : "Wybierz"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.start_date} onSelect={d => update("start_date", d)} disabled={{ before: new Date() }} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !form.end_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.end_date ? format(form.end_date, "d MMM yyyy", { locale: pl }) : "Wybierz"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.end_date} onSelect={d => update("end_date", d)} disabled={{ before: form.start_date || new Date() }} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Budżet (PLN)</Label>
              <Input type="number" min={0} value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="np. 25000" />
            </div>
          </div>

          {/* Brief (collapsible) */}
          <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border bg-muted/50 hover:bg-accent transition-colors text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Brief projektu ({briefItems.length} pytań)
                <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", briefOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {briefItems.map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.question}
                      onChange={e => updateBrief(i, "question", e.target.value)}
                      placeholder="Pytanie..."
                      className="text-sm font-medium h-8"
                    />
                    <button onClick={() => removeBriefQuestion(i)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Textarea
                    value={item.answer}
                    onChange={e => updateBrief(i, "answer", e.target.value)}
                    placeholder="Odpowiedź (opcjonalna)..."
                    className="min-h-[50px] text-sm"
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1 text-xs w-full" onClick={addBriefQuestion}>
                <Plus className="h-3 w-3" /> Dodaj kolejne pytanie
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={handleCreate} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Utwórz projekt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
