import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Calendar as CalendarIcon, ArrowRight, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStaffMembers } from "@/hooks/useStaffMembers";

const STAGES = ["potential", "contact", "offer_sent", "negotiations", "won", "lost"] as const;
type Stage = typeof STAGES[number];

const stageLabels: Record<Stage, string> = {
  potential: "POTENCJALNY", contact: "KONTAKT", offer_sent: "OFERTA WYSŁANA",
  negotiations: "NEGOCJACJE", won: "WYGRANE", lost: "PRZEGRANE",
};

const stageHeaderColors: Record<Stage, string> = {
  potential: "border-muted-foreground/30 bg-muted text-foreground",
  contact: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  offer_sent: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  negotiations: "border-primary/30 bg-primary/10 text-primary",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  lost: "border-destructive/30 bg-destructive/10 text-destructive",
};

const AVATAR_COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-teal-600"];

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: Stage;
  client_id: string | null;
  assigned_to: string | null;
  days_in_stage: number | null;
  created_at: string | null;
  probability: number | null;
  expected_close_date: string | null;
  last_contact_date: string | null;
  next_action: string | null;
  status_updated_at: string | null;
  clients?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
}

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const { data: staffMembers } = useStaffMembers();

  const { data: deals = [], refetch } = useQuery({
    queryKey: ["pipeline-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_deals")
        .select("*, clients(name), profiles:assigned_to(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Deal[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("pipeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_deals" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  // DnD mutation
  const moveMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const { error } = await supabase.from("pipeline_deals").update({
        stage: stage as any,
        status_updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast.error("Nie udało się przenieść szansy");
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    },
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId as Stage;
    const dealId = result.draggableId;
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    queryClient.setQueryData(["pipeline-deals"], (old: Deal[] | undefined) =>
      (old || []).map(d => d.id === dealId ? { ...d, stage: newStage, status_updated_at: new Date().toISOString() } : d)
    );
    moveMutation.mutate({ id: dealId, stage: newStage });
  }, [deals, queryClient, moveMutation]);

  // Stats
  const openStages: Stage[] = ["potential", "contact", "offer_sent", "negotiations"];
  const openDeals = deals.filter(d => openStages.includes(d.stage));
  const totalOpenValue = openDeals.reduce((s, d) => s + Number(d.value || 0), 0);
  const totalOpenCount = openDeals.length;

  const formatValue = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)} tys. zł`;
    return `${v.toLocaleString("pl-PL")} zł`;
  };

  const getDaysInStage = (deal: Deal) => {
    if (!deal.status_updated_at) return deal.days_in_stage || 0;
    return differenceInDays(new Date(), new Date(deal.status_updated_at));
  };

  const getDealIndex = (deal: Deal): string => {
    const idx = deals.indexOf(deal) + 1;
    return `#D${idx}`;
  };

  return (
    <AppLayout title="Lejek sprzedaży">
      <div className="space-y-4 max-w-[110rem] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Lejek sprzedaży</h2>
            <p className="text-sm text-muted-foreground">
              {totalOpenCount} szans · {formatValue(totalOpenValue)} w lejku
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nowa szansa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nowa szansa sprzedaży</DialogTitle></DialogHeader>
              <DealForm
                clients={clients}
                staff={staffMembers || []}
                onSubmit={async (data) => {
                  const { error } = await supabase.from("pipeline_deals").insert({
                    title: data.title,
                    value: data.value ? parseFloat(data.value) : 0,
                    stage: data.stage as any,
                    client_id: data.client_id || null,
                    assigned_to: data.assigned_to || null,
                    probability: data.probability ? parseInt(data.probability) : 50,
                    expected_close_date: data.expected_close_date || null,
                    next_action: data.next_action || null,
                    status_updated_at: new Date().toISOString(),
                  } as any);
                  if (error) { toast.error(error.message); return; }
                  toast.success("Szansa dodana");
                  setIsCreateOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editDeal} onOpenChange={(o) => !o && setEditDeal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edytuj szansę</DialogTitle></DialogHeader>
            {editDeal && (
              <DealForm
                clients={clients}
                staff={staffMembers || []}
                initial={editDeal}
                onSubmit={async (data) => {
                  const { error } = await supabase.from("pipeline_deals").update({
                    title: data.title,
                    value: data.value ? parseFloat(data.value) : 0,
                    stage: data.stage as any,
                    client_id: data.client_id || null,
                    assigned_to: data.assigned_to || null,
                    probability: data.probability ? parseInt(data.probability) : 50,
                    expected_close_date: data.expected_close_date || null,
                    next_action: data.next_action || null,
                    last_contact_date: data.last_contact_date || null,
                  } as any).eq("id", editDeal.id);
                  if (error) { toast.error(error.message); return; }
                  toast.success("Zaktualizowano");
                  setEditDeal(null);
                  refetch();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Kanban */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAGES.map((stage) => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
              return (
                <div key={stage} className="min-w-0">
                  {/* Column header */}
                  <div className={`rounded-lg p-3 border mb-3 ${stageHeaderColors[stage]}`}>
                    <h3 className="text-xs font-bold tracking-wide">{stageLabels[stage]}</h3>
                    <p className="text-[11px] mt-1 opacity-80">
                      {stageDeals.length} szans · {formatValue(stageValue)}
                    </p>
                  </div>
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-2 min-h-[100px] rounded-lg p-1 transition-colors",
                          snapshot.isDraggingOver && "bg-accent/50"
                        )}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={cn(snap.isDragging && "opacity-80")}
                              >
                                <DealCard
                                  deal={deal}
                                  index={getDealIndex(deal)}
                                  daysInStage={getDaysInStage(deal)}
                                  onClick={() => setEditDeal(deal)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </AppLayout>
  );
}

/* ───────── Deal Card ───────── */

function DealCard({ deal, index, daysInStage, onClick }: { deal: Deal; index: string; daysInStage: number; onClick: () => void }) {
  const lastContactDays = deal.last_contact_date
    ? differenceInDays(new Date(), new Date(deal.last_contact_date))
    : null;
  const isContactOld = lastContactDays !== null && lastContactDays > 7;
  const assignedName = deal.profiles?.full_name || null;
  const initials = assignedName ? assignedName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : null;
  const colorIdx = assignedName ? assignedName.charCodeAt(0) % AVATAR_COLORS.length : 0;

  const probColor = (deal.probability || 0) >= 70
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : (deal.probability || 0) >= 40
    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : "bg-destructive/10 text-destructive border-destructive/30";

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-border/60"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: ID + Value */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">{index}</span>
          <span className="text-sm font-bold">{formatValueShort(Number(deal.value || 0))}</span>
        </div>

        {/* Title + Client */}
        <div>
          <p className="text-sm font-semibold leading-tight line-clamp-2">{deal.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{deal.clients?.name || "—"}</p>
        </div>

        {/* New fields */}
        <div className="space-y-1.5">
          {/* Probability */}
          {deal.probability != null && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", probColor)}>
              {deal.probability}%
            </Badge>
          )}

          {/* Expected close date */}
          {deal.expected_close_date && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(new Date(deal.expected_close_date), "dd MMM yyyy", { locale: pl })}</span>
            </div>
          )}

          {/* Last contact */}
          {lastContactDays !== null && (
            <div className={cn("flex items-center gap-1 text-[10px]", isContactOld ? "text-destructive" : "text-muted-foreground")}>
              {isContactOld && <AlertCircle className="h-3 w-3" />}
              <span>Kontakt: {lastContactDays === 0 ? "dziś" : `${lastContactDays} dn. temu`}</span>
            </div>
          )}

          {/* Next action */}
          {deal.next_action && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{deal.next_action}</span>
            </div>
          )}
        </div>

        {/* Bottom: days in stage + avatar */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">{daysInStage} dn. na etapie</span>
          {initials ? (
            <Avatar className="h-5 w-5">
              <AvatarFallback className={cn("text-[9px] text-white", AVATAR_COLORS[colorIdx])}>
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatValueShort(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)} tys. zł`;
  return `${v.toLocaleString("pl-PL")} zł`;
}

/* ───────── Deal Form ───────── */

interface DealFormData {
  title: string; value: string; stage: string; client_id: string;
  assigned_to: string; probability: string; expected_close_date: string;
  next_action: string; last_contact_date: string;
}

function DealForm({
  clients, staff, initial, onSubmit,
}: {
  clients: { id: string; name: string }[];
  staff: { id: string; full_name: string | null }[];
  initial?: Deal | null;
  onSubmit: (data: DealFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<DealFormData>({
    title: initial?.title || "",
    value: initial?.value?.toString() || "",
    stage: initial?.stage || "potential",
    client_id: initial?.client_id || "",
    assigned_to: initial?.assigned_to || "",
    probability: initial?.probability?.toString() || "50",
    expected_close_date: initial?.expected_close_date || "",
    next_action: initial?.next_action || "",
    last_contact_date: initial?.last_contact_date?.split("T")[0] || "",
  });
  const [loading, setLoading] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [closeDateOpen, setCloseDateOpen] = useState(false);

  const selectedClient = clients.find(c => c.id === form.client_id);
  const selectedStaff = staff.find(s => s.id === form.assigned_to);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label>Tytuł *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Brand Strategy" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Value */}
        <div className="space-y-2">
          <Label>Wartość (zł)</Label>
          <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
        </div>
        {/* Probability */}
        <div className="space-y-2">
          <Label>Prawdopodobieństwo (%)</Label>
          <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
        </div>
      </div>

      {/* Stage */}
      <div className="space-y-2">
        <Label>Etap</Label>
        <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Client combobox */}
      <div className="space-y-2">
        <Label>Klient</Label>
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              {selectedClient?.name || "Wybierz klienta..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
            <Command>
              <CommandInput placeholder="Szukaj klienta..." />
              <CommandList>
                <CommandEmpty>Nie znaleziono</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__none__" onSelect={() => { setForm({ ...form, client_id: "" }); setClientOpen(false); }}>
                    — Brak —
                  </CommandItem>
                  {clients.map(c => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => { setForm({ ...form, client_id: c.id }); setClientOpen(false); }}>
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Assigned combobox */}
      <div className="space-y-2">
        <Label>Przypisana osoba</Label>
        <Popover open={staffOpen} onOpenChange={setStaffOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              {selectedStaff?.full_name || "Wybierz osobę..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
            <Command>
              <CommandInput placeholder="Szukaj osoby..." />
              <CommandList>
                <CommandEmpty>Nie znaleziono</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__none__" onSelect={() => { setForm({ ...form, assigned_to: "" }); setStaffOpen(false); }}>
                    — Brak —
                  </CommandItem>
                  {staff.map(s => (
                    <CommandItem key={s.id} value={s.full_name || s.id} onSelect={() => { setForm({ ...form, assigned_to: s.id }); setStaffOpen(false); }}>
                      {s.full_name || "Bez nazwy"}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Expected close date */}
      <div className="space-y-2">
        <Label>Oczekiwana data zamknięcia</Label>
        <Popover open={closeDateOpen} onOpenChange={setCloseDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start font-normal", !form.expected_close_date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.expected_close_date ? format(new Date(form.expected_close_date), "PPP", { locale: pl }) : "Wybierz datę"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.expected_close_date ? new Date(form.expected_close_date) : undefined}
              onSelect={(d) => { setForm({ ...form, expected_close_date: d ? format(d, "yyyy-MM-dd") : "" }); setCloseDateOpen(false); }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Next action */}
      <div className="space-y-2">
        <Label>Kolejny krok</Label>
        <Input value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} placeholder="np. Wysłać umowę" />
      </div>

      <Button onClick={handleSubmit} className="w-full" disabled={loading}>
        {initial ? "Zapisz zmiany" : "Dodaj szansę"}
      </Button>
    </div>
  );
}
