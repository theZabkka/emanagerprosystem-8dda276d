import { useState, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Archive, Search, MoreHorizontal, GripVertical, Pencil, Trash2, Tag } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compareRanks, generateRankBefore, generateRankAfter, generateMidpointRank } from "@/lib/lexoRank";
import {
  useCrmColumns, useCrmDeals, useCrmLabels,
  useCrmRealtime, useCrmMutations,
  type CrmColumn, type CrmDeal,
} from "@/hooks/useCrmData";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { CrmDealCard } from "@/components/crm/CrmDealCard";
import { CrmDealDetailPanel } from "@/components/crm/CrmDealDetailPanel";
import { CrmArchiveDrawer } from "@/components/crm/CrmArchiveDrawer";
import { CrmLabelManager } from "@/components/crm/CrmLabelManager";

const NONE_SENTINEL = "__none__";

export default function CrmBoard() {
  useCrmRealtime();
  const qc = useQueryClient();
  const { data: columns = [] } = useCrmColumns();
  const { data: deals = [] } = useCrmDeals(false);
  const { data: allLabels = [] } = useCrmLabels();
  const { data: staff = [] } = useStaffMembers();
  const mutations = useCrmMutations();

  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const emptyDeal = { title: "", column_id: "", due_date: "", client_id: "", description: "", assigned_to: "", selectedLabels: [] as string[] };
  const [newDeal, setNewDeal] = useState(emptyDeal);

  // Quick-add: open create modal with pre-filled column
  const openCreateForColumn = (columnId: string) => {
    setNewDeal({ ...emptyDeal, column_id: columnId });
    setCreateOpen(true);
  };

  // Fetch clients for picker
  const { data: clientsList = [] } = useQuery({
    queryKey: ["clients-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  // All labels for each deal
  const { data: allDealLabelsMap } = useCrmLabelsForDeals(deals.map(d => d.id));

  // Filtered deals
  const filteredDeals = useMemo(() => {
    let result = deals;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(s));
    }
    if (labelFilter && allDealLabelsMap) {
      result = result.filter((d) => {
        const labels = allDealLabelsMap[d.id];
        return labels && labels.some((l) => l.id === labelFilter);
      });
    }
    return result;
  }, [deals, search, labelFilter, allDealLabelsMap]);

  // Group deals by column
  const dealsByColumn = useMemo(() => {
    const map: Record<string, CrmDeal[]> = {};
    columns.forEach((c) => (map[c.id] = []));
    filteredDeals.forEach((d) => {
      if (map[d.column_id]) map[d.column_id].push(d);
    });
    return map;
  }, [columns, filteredDeals]);

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

      // Log stage change to crm_stage_logs when column changes
      if (!isSameColumn) {
        // Close previous stage log
        supabase
          .from("crm_stage_logs" as any)
          .update({ exited_at: new Date().toISOString() } as any)
          .eq("deal_id", draggableId)
          .eq("column_id", srcColumnId)
          .is("exited_at", null)
          .then(() => {
            // Insert new stage log
            supabase
              .from("crm_stage_logs" as any)
              .insert({ deal_id: draggableId, column_id: destColumnId } as any)
              .then();
          });

        // Check if destination column is won/lost → set closed_at
        const destCol = columns.find((c) => c.id === destColumnId);
        if (destCol) {
          const colNameLower = destCol.name.toLowerCase();
          const isClosedStage =
            colNameLower.includes("wygran") || colNameLower.includes("sukces") || colNameLower.includes("won") ||
            colNameLower.includes("przegran") || colNameLower.includes("lost") || colNameLower.includes("strat");
          if (isClosedStage) {
            supabase.from("crm_deals" as any).update({ closed_at: new Date().toISOString() } as any).eq("id", draggableId).then();
          } else {
            // Returning to active stage → clear closed_at
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
    setIsCreating(true);
    try {
      const colDeals = deals.filter((d) => d.column_id === newDeal.column_id);
      const lastRank = colDeals.length > 0 ? colDeals[colDeals.length - 1].lexo_rank : null;
      const rank = lastRank ? generateRankAfter(lastRank) : generateMidpointRank(null, null);

      // Insert deal
      const { data: inserted, error } = await supabase.from("crm_deals" as any).insert({
        title: newDeal.title.trim(),
        column_id: newDeal.column_id,
        priority: "medium",
        due_date: newDeal.due_date ? new Date(newDeal.due_date).toISOString() : null,
        lexo_rank: rank,
        reminder_active: true,
        description: newDeal.description || null,
        assigned_to: newDeal.assigned_to || null,
        client_id: newDeal.client_id || null,
      } as any).select("id").maybeSingle();
      if (error) throw error;

      // Attach labels if any
      if (inserted && newDeal.selectedLabels.length > 0) {
        const rows = newDeal.selectedLabels.map((label_id) => ({ deal_id: (inserted as any).id, label_id }));
        await supabase.from("crm_deal_labels" as any).insert(rows as any);
      }

      qc.invalidateQueries({ queryKey: ["crm-deals"] });
      qc.invalidateQueries({ queryKey: ["crm-all-deal-labels"] });
      setCreateOpen(false);
      setNewDeal(emptyDeal);
      toast.success("Karta dodana");
    } catch (err: any) {
      toast.error("Błąd tworzenia: " + (err?.message || "Nieznany błąd"));
    } finally {
      setIsCreating(false);
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

  return (
    <AppLayout title="">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Consolidated toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Szukaj kart..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 rounded-lg text-xs bg-muted/40 border-border/50"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCreateColumnOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Kolumna
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setNewDeal(emptyDeal); setCreateOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nowa karta
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setLabelManagerOpen(true)}>
              <Tag className="h-3.5 w-3.5 mr-1" /> Etykiety
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setArchiveOpen(true)}>
              <Archive className="h-3.5 w-3.5 mr-1" /> Archiwum
            </Button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
          <DragDropContext onDragEnd={handleDragEnd} autoScrollerOptions={{ startFromPercentage: 0.2, maxScrollAtPercentage: 0.05, maxPixelScroll: 25 }}>
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
                            className="w-[290px] flex-shrink-0 flex flex-col bg-muted/30 rounded-xl border border-border/40"
                          >
                            {/* Column header */}
                            <div
                              {...colProv.dragHandleProps}
                              className="flex items-center justify-between px-3 h-14 border-b border-border/30"
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
                                  <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground truncate pr-1">{col.name}</h3>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreateForColumn(col.id)}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
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
                            </div>

                            {/* Cards */}
                            <Droppable droppableId={col.id} type="CARD">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={cn(
                                    "flex-1 overflow-y-auto p-2 space-y-2.5 min-h-[60px] transition-colors",
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
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />

      {/* Archive drawer */}
      <CrmArchiveDrawer open={archiveOpen} onClose={() => setArchiveOpen(false)} />

      {/* Create deal dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nowa karta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tytuł *</Label>
                <Input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} placeholder="Nazwa karty" />
              </div>
              <div className="space-y-2">
                <Label>Etap *</Label>
                <Select value={newDeal.column_id} onValueChange={(v) => setNewDeal({ ...newDeal, column_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Wybierz etap..." /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Termin</Label>
                <Input type="datetime-local" value={newDeal.due_date} onChange={(e) => setNewDeal({ ...newDeal, due_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Klient</Label>
                <Select value={newDeal.client_id || NONE_SENTINEL} onValueChange={(v) => setNewDeal({ ...newDeal, client_id: v === NONE_SENTINEL ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>Brak</SelectItem>
                    {clientsList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Przypisana osoba</Label>
                <Select value={newDeal.assigned_to || NONE_SENTINEL} onValueChange={(v) => setNewDeal({ ...newDeal, assigned_to: v === NONE_SENTINEL ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Wybierz osobę..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>Brak</SelectItem>
                    {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name || "Bez nazwy"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={newDeal.description}
                onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                placeholder="Opcjonalny opis karty..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Etykiety</Label>
              <div className="flex flex-wrap gap-1.5">
                {allLabels.map((l) => {
                  const isSelected = newDeal.selectedLabels.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setNewDeal({
                        ...newDeal,
                        selectedLabels: isSelected
                          ? newDeal.selectedLabels.filter((id) => id !== l.id)
                          : [...newDeal.selectedLabels, l.id],
                      })}
                      className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all",
                        isSelected ? "text-white border-transparent" : "text-foreground border-border bg-muted/50"
                      )}
                      style={isSelected ? { backgroundColor: l.color } : undefined}
                    >
                      {l.name} {isSelected && "✓"}
                    </button>
                  );
                })}
                {allLabels.length === 0 && <span className="text-xs text-muted-foreground">Brak etykiet — utwórz je przyciskiem "Etykiety"</span>}
              </div>
            </div>
            <Button onClick={handleCreateDeal} className="w-full" disabled={isCreating || !newDeal.title.trim() || !newDeal.column_id}>
              {isCreating ? "Tworzenie..." : "Dodaj kartę"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Label manager dialog */}
      <Dialog open={labelManagerOpen} onOpenChange={setLabelManagerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Zarządzaj etykietami</DialogTitle></DialogHeader>
          <CrmLabelManager />
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



// Helper hook: fetch labels for all visible deals in a single pass
function useCrmLabelsForDeals(dealIds: string[]) {
  return useQuery({
    queryKey: ["crm-all-deal-labels", dealIds.join(",")],
    enabled: dealIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_labels" as any)
        .select("deal_id, crm_labels(id, name, color)")
        .in("deal_id", dealIds);
      if (error) throw error;
      const map: Record<string, Array<{ id: string; name: string; color: string }>> = {};
      (data as any[]).forEach((row: any) => {
        if (!map[row.deal_id]) map[row.deal_id] = [];
        if (row.crm_labels) map[row.deal_id].push(row.crm_labels);
      });
      return map;
    },
  });
}
