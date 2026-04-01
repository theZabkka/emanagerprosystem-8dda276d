import { useState, useCallback, useMemo, useRef } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Archive, Search, MoreHorizontal, GripVertical, Pencil, Trash2, Tag, Building2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compareRanks, generateRankBefore, generateRankAfter, generateMidpointRank } from "@/lib/lexoRank";
import {
  useCrmColumns, useCrmDeals, useCrmLabels, useCrmLabelsForDeals,
  useCrmRealtime, useCrmMutations,
  type CrmColumn, type CrmDeal,
} from "@/hooks/useCrmData";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { CrmDealCard } from "@/components/crm/CrmDealCard";
import { CrmDealDetailPanel } from "@/components/crm/CrmDealDetailPanel";
import { CrmArchiveDrawer } from "@/components/crm/CrmArchiveDrawer";
import { CrmLabelManager } from "@/components/crm/CrmLabelManager";

export default function CrmBoard() {
  useCrmRealtime();
  const qc = useQueryClient();
  const { data: columns = [] } = useCrmColumns();
  const { data: deals = [] } = useCrmDeals(false);
  const { data: allLabels = [] } = useCrmLabels();
  const { data: staff = [] } = useStaffMembers();
  const mutations = useCrmMutations();

  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [creating, setCreating] = useState(false);

  // Clients list
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-crm"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  // New deal form
  const [newDeal, setNewDeal] = useState({
    title: "", column_id: "", due_date: "", due_time: "",
    description: "", assigned_to: "", client_id: "",
  });
  const [selectedCreateLabels, setSelectedCreateLabels] = useState<string[]>([]);

  // Labels for all deals
  const { data: allDealLabelsMap } = useCrmLabelsForDeals(deals.map(d => d.id));

  // Filtered deals
  const filteredDeals = useMemo(() => {
    if (!search) return deals;
    const s = search.toLowerCase();
    return deals.filter((d) => d.title.toLowerCase().includes(s));
  }, [deals, search]);

  // Group deals by column
  const dealsByColumn = useMemo(() => {
    const map: Record<string, CrmDeal[]> = {};
    columns.forEach((c) => (map[c.id] = []));
    filteredDeals.forEach((d) => {
      if (map[d.column_id]) map[d.column_id].push(d);
    });
    return map;
  }, [columns, filteredDeals]);

  // Click-and-drag horizontal scroll
  const boardRef = useRef<HTMLDivElement>(null);
  const dragScrollState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const board = boardRef.current;
    if (!board) return;
    // Only activate on the board background, not on cards
    if ((e.target as HTMLElement).closest('[data-rfd-draggable-id]')) return;
    dragScrollState.current = {
      isDown: true,
      startX: e.pageX - board.offsetLeft,
      scrollLeft: board.scrollLeft,
      moved: false,
    };
    board.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = dragScrollState.current;
    if (!state.isDown) return;
    const board = boardRef.current;
    if (!board) return;
    e.preventDefault();
    const x = e.pageX - board.offsetLeft;
    const walk = (x - state.startX) * 1.5;
    if (Math.abs(walk) > 5) state.moved = true;
    board.scrollLeft = state.scrollLeft - walk;
  }, []);

  const handleMouseUp = useCallback(() => {
    dragScrollState.current.isDown = false;
    if (boardRef.current) boardRef.current.style.cursor = "grab";
  }, []);

  // DnD handler
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId, type } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      if (type === "COLUMN") {
        const sorted = [...columns];
        const withoutDragged = sorted.filter((c) => c.id !== draggableId);
        const destIdx = destination.index;

        let newRank: string;
        if (destIdx === 0) {
          newRank = withoutDragged.length > 0 ? generateRankBefore(withoutDragged[0].lexo_rank) : generateMidpointRank(null, null);
        } else if (destIdx >= withoutDragged.length) {
          newRank = generateRankAfter(withoutDragged[withoutDragged.length - 1].lexo_rank);
        } else {
          newRank = generateMidpointRank(withoutDragged[destIdx - 1].lexo_rank, withoutDragged[destIdx].lexo_rank);
        }

        qc.setQueryData(["crm-columns"], (old: CrmColumn[] | undefined) =>
          (old || []).map((c) => (c.id === draggableId ? { ...c, lexo_rank: newRank } : c)).sort((a, b) => compareRanks(a.lexo_rank, b.lexo_rank))
        );
        mutations.updateColumnRank.mutate({ id: draggableId, lexo_rank: newRank });
        return;
      }

      // Card DnD
      const destColumnId = destination.droppableId;
      const srcColumnId = source.droppableId;
      const isSameColumn = srcColumnId === destColumnId;

      const rawDest = dealsByColumn[destColumnId] || [];
      const targetCards = isSameColumn
        ? rawDest.filter((d) => d.id !== draggableId)
        : [...rawDest];

      const destIdx = destination.index;
      let newRank: string;
      if (targetCards.length === 0) {
        newRank = generateMidpointRank(null, null);
      } else if (destIdx === 0) {
        newRank = generateRankBefore(targetCards[0].lexo_rank);
      } else if (destIdx >= targetCards.length) {
        newRank = generateRankAfter(targetCards[targetCards.length - 1].lexo_rank);
      } else {
        newRank = generateMidpointRank(targetCards[destIdx - 1].lexo_rank, targetCards[destIdx].lexo_rank);
      }

      qc.setQueryData(["crm-deals", false], (old: CrmDeal[] | undefined) =>
        (old || [])
          .map((d) =>
            d.id === draggableId
              ? { ...d, lexo_rank: newRank, column_id: destColumnId }
              : d
          )
          .sort((a, b) => compareRanks(a.lexo_rank, b.lexo_rank))
      );
      mutations.updateDealRank.mutate({ id: draggableId, lexo_rank: newRank, column_id: isSameColumn ? undefined : destColumnId });

      // Log stage change
      if (!isSameColumn) {
        supabase
          .from("crm_stage_logs" as any)
          .update({ exited_at: new Date().toISOString() } as any)
          .eq("deal_id", draggableId)
          .eq("column_id", srcColumnId)
          .is("exited_at", null)
          .then(() => {
            supabase.from("crm_stage_logs" as any).insert({ deal_id: draggableId, column_id: destColumnId } as any).then();
          });

        const destCol = columns.find((c) => c.id === destColumnId);
        if (destCol) {
          const colNameLower = destCol.name.toLowerCase();
          const isClosedStage =
            colNameLower.includes("wygran") || colNameLower.includes("sukces") || colNameLower.includes("won") ||
            colNameLower.includes("przegran") || colNameLower.includes("lost") || colNameLower.includes("strat");
          if (isClosedStage) {
            supabase.from("crm_deals" as any).update({ closed_at: new Date().toISOString() } as any).eq("id", draggableId).then();
          } else {
            supabase.from("crm_deals" as any).update({ closed_at: null } as any).eq("id", draggableId).then();
          }
        }
      }
    },
    [columns, dealsByColumn, qc, mutations]
  );

  const handleCreateDeal = async () => {
    if (!newDeal.title.trim() || !newDeal.column_id) {
      toast.error("Podaj tytuł i wybierz kolumnę");
      return;
    }
    setCreating(true);
    try {
      const colDeals = deals.filter((d) => d.column_id === newDeal.column_id);
      const lastRank = colDeals.length > 0 ? colDeals[colDeals.length - 1].lexo_rank : null;
      const rank = lastRank ? generateRankAfter(lastRank) : generateMidpointRank(null, null);

      const dueDateCombined = newDeal.due_date
        ? newDeal.due_time
          ? `${newDeal.due_date}T${newDeal.due_time}:00`
          : `${newDeal.due_date}T23:59:00`
        : undefined;

      // Insert deal
      const { data: insertedData, error } = await supabase
        .from("crm_deals" as any)
        .insert({
          title: newDeal.title.trim(),
          column_id: newDeal.column_id,
          priority: "medium",
          due_date: dueDateCombined || null,
          description: newDeal.description.trim() || null,
          assigned_to: newDeal.assigned_to || null,
          client_id: newDeal.client_id || null,
          lexo_rank: rank,
          reminder_active: true,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Attach labels
      if (selectedCreateLabels.length > 0 && insertedData) {
        const labelInserts = selectedCreateLabels.map((lid) => ({
          deal_id: (insertedData as any).id,
          label_id: lid,
        }));
        await supabase.from("crm_deal_labels" as any).insert(labelInserts as any);
      }

      qc.invalidateQueries({ queryKey: ["crm-deals"] });
      qc.invalidateQueries({ queryKey: ["crm-all-deal-labels"] });
      setCreateOpen(false);
      setNewDeal({ title: "", column_id: "", due_date: "", due_time: "", description: "", assigned_to: "", client_id: "" });
      setSelectedCreateLabels([]);
      toast.success("Karta dodana");
    } catch (err: any) {
      toast.error("Błąd tworzenia karty: " + (err.message || "Nieznany błąd"));
    } finally {
      setCreating(false);
    }
  };

  const handleCreateColumn = () => {
    if (!newColumnName.trim()) return;
    const lastRank = columns.length > 0 ? columns[columns.length - 1].lexo_rank : null;
    const rank = lastRank ? generateRankAfter(lastRank) : generateMidpointRank(null, null);
    mutations.createColumn.mutate({ name: newColumnName.trim(), lexo_rank: rank });
    setCreateColumnOpen(false);
    setNewColumnName("");
    toast.success("Kolumna dodana");
  };

  const handleRenameColumn = (id: string) => {
    if (!editingColumnName.trim()) return;
    mutations.updateColumn.mutate({ id, name: editingColumnName.trim() });
    setEditingColumnId(null);
    toast.success("Nazwa zmieniona");
  };

  // Refresh selected deal when deals change
  const refreshedSelectedDeal = useMemo(() => {
    if (!selectedDeal) return null;
    return deals.find((d) => d.id === selectedDeal.id) || selectedDeal;
  }, [deals, selectedDeal]);

  return (
    <AppLayout title="Lejek sprzedaży">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
          <h1 className="text-lg font-bold text-foreground">Lejek sprzedaży</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Nowa karta
            </Button>
            <Button variant="outline" onClick={() => setLabelManagerOpen(true)}>
              <Tag className="h-4 w-4 mr-1" /> Etykiety
            </Button>
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4 mr-1" /> Archiwum
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/50">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj kart..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-full text-sm" onClick={() => setCreateColumnOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Kolumna
          </Button>
        </div>

        {/* Kanban board with click-and-drag scroll */}
        <div
          ref={boardRef}
          className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" type="COLUMN" direction="horizontal">
              {(boardProvided) => (
                <div
                  ref={boardProvided.innerRef}
                  {...boardProvided.droppableProps}
                  className="flex gap-4 p-4 h-full min-w-max"
                >
                  {columns.map((col, colIdx) => {
                    const colDeals = dealsByColumn[col.id] || [];
                    return (
                      <Draggable key={col.id} draggableId={col.id} index={colIdx}>
                        {(colProv) => (
                          <div
                            ref={colProv.innerRef}
                            {...colProv.draggableProps}
                            className="w-[300px] flex-shrink-0 flex flex-col bg-secondary/50 rounded-xl border border-primary/20"
                          >
                            {/* Column header */}
                            <div
                              {...colProv.dragHandleProps}
                              className="flex items-center justify-between p-3 border-b border-primary/10"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                                {editingColumnId === col.id ? (
                                  <Input
                                    autoFocus
                                    value={editingColumnName}
                                    onChange={(e) => setEditingColumnName(e.target.value)}
                                    onBlur={() => handleRenameColumn(col.id)}
                                    onKeyDown={(e) => e.key === "Enter" && handleRenameColumn(col.id)}
                                    className="h-7 text-xs font-bold"
                                  />
                                ) : (
                                  <div className="min-w-0 flex-1">
                                    <h3 className="text-[10px] font-bold tracking-wide uppercase text-foreground leading-tight line-clamp-2">{col.name}</h3>
                                    <span className="text-[10px] text-muted-foreground">{colDeals.length} kart</span>
                                  </div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingColumnId(col.id); setEditingColumnName(col.name); }}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Zmień nazwę
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      if (colDeals.length > 0) {
                                        toast.error("Przenieś karty przed usunięciem kolumny");
                                        return;
                                      }
                                      mutations.deleteColumn.mutate(col.id);
                                      toast.success("Kolumna usunięta");
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Usuń
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Cards */}
                            <Droppable droppableId={col.id} type="CARD">
                              {(provided, snapshot) => (
                                <ScrollArea className="flex-1">
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={cn(
                                      "p-2 space-y-2.5 min-h-[60px] transition-colors",
                                      snapshot.isDraggingOver && "bg-accent/40"
                                    )}
                                  >
                                    {colDeals.map((deal, idx) => (
                                      <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                                        {(cardProv, cardSnap) => (
                                          <div
                                            ref={cardProv.innerRef}
                                            {...cardProv.draggableProps}
                                            {...cardProv.dragHandleProps}
                                            className={cn(
                                              "transition-transform",
                                              cardSnap.isDragging && "opacity-90 rotate-1"
                                            )}
                                          >
                                            <CrmDealCard
                                              deal={deal}
                                              labels={allDealLabelsMap?.[deal.id]}
                                              onReminderToggle={(id, active) => mutations.toggleReminder.mutate({ id, active })}
                                              onClick={() => setSelectedDeal(deal)}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                </ScrollArea>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {boardProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Detail panel */}
      <CrmDealDetailPanel
        deal={refreshedSelectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />

      {/* Archive drawer */}
      <CrmArchiveDrawer open={archiveOpen} onClose={() => setArchiveOpen(false)} />

      {/* Label manager dialog */}
      <Dialog open={labelManagerOpen} onOpenChange={setLabelManagerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Zarządzanie etykietami</DialogTitle></DialogHeader>
          <CrmLabelManager />
        </DialogContent>
      </Dialog>

      {/* Create deal dialog - expanded */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nowa karta</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Tytuł *</Label>
              <Input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} placeholder="Nazwa karty" />
            </div>
            <div className="space-y-2">
              <Label>Kolumna / etap *</Label>
              <Select value={newDeal.column_id} onValueChange={(v) => setNewDeal({ ...newDeal, column_id: v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz kolumnę..." /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={newDeal.description}
                onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                placeholder="Opis karty..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data terminu</Label>
                <Input type="date" value={newDeal.due_date} onChange={(e) => setNewDeal({ ...newDeal, due_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Godzina</Label>
                <Input type="time" value={newDeal.due_time} onChange={(e) => setNewDeal({ ...newDeal, due_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Przypisana osoba</Label>
              <Select value={newDeal.assigned_to} onValueChange={(v) => setNewDeal({ ...newDeal, assigned_to: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Brak</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || "Bez nazwy"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Klient</Label>
              <Select value={newDeal.client_id} onValueChange={(v) => setNewDeal({ ...newDeal, client_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Brak</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etykiety</Label>
              <div className="flex flex-wrap gap-1.5">
                {allLabels.map((l) => (
                  <Badge
                    key={l.id}
                    className={cn(
                      "text-[10px] cursor-pointer transition-all",
                      selectedCreateLabels.includes(l.id)
                        ? "text-white ring-2 ring-foreground/30"
                        : "opacity-50 hover:opacity-80"
                    )}
                    style={{ backgroundColor: l.color }}
                    onClick={() => {
                      setSelectedCreateLabels((prev) =>
                        prev.includes(l.id) ? prev.filter((id) => id !== l.id) : [...prev, l.id]
                      );
                    }}
                  >
                    {l.name} {selectedCreateLabels.includes(l.id) && "✓"}
                  </Badge>
                ))}
                {allLabels.length === 0 && <span className="text-xs text-muted-foreground">Brak etykiet</span>}
              </div>
            </div>
            <Button onClick={handleCreateDeal} className="w-full" disabled={creating}>
              {creating ? "Tworzenie..." : "Dodaj kartę"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create column dialog */}
      <Dialog open={createColumnOpen} onOpenChange={setCreateColumnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nowa kolumna</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nazwa</Label>
              <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="np. Ukończone"
                onKeyDown={(e) => e.key === "Enter" && handleCreateColumn()} />
            </div>
            <Button onClick={handleCreateColumn} className="w-full">Dodaj kolumnę</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
