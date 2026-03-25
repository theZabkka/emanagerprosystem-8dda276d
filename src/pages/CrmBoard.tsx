import { useState, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Archive, Search, MoreHorizontal, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compareRanks, generateRankBefore, generateRankAfter, generateMidpointRank } from "@/lib/lexoRank";
import {
  useCrmColumns, useCrmDeals, useCrmLabels,
  useCrmRealtime, useCrmMutations,
  type CrmColumn, type CrmDeal,
} from "@/hooks/useCrmData";
import { CrmDealCard } from "@/components/crm/CrmDealCard";
import { CrmDealDetailPanel } from "@/components/crm/CrmDealDetailPanel";
import { CrmArchiveDrawer } from "@/components/crm/CrmArchiveDrawer";

export default function CrmBoard() {
  useCrmRealtime();
  const qc = useQueryClient();
  const { data: columns = [] } = useCrmColumns();
  const { data: deals = [] } = useCrmDeals(false);
  const { data: allLabels = [] } = useCrmLabels();
  const mutations = useCrmMutations();

  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  // New deal form (no priority)
  const [newDeal, setNewDeal] = useState({ title: "", column_id: "", due_date: "" });

  // All labels for each deal
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
    },
    [columns, dealsByColumn, qc, mutations]
  );

  const handleCreateDeal = () => {
    if (!newDeal.title.trim() || !newDeal.column_id) {
      toast.error("Podaj tytuł i wybierz kolumnę");
      return;
    }
    const colDeals = deals.filter((d) => d.column_id === newDeal.column_id);
    const lastRank = colDeals.length > 0 ? colDeals[colDeals.length - 1].lexo_rank : null;
    const rank = lastRank ? generateRankAfter(lastRank) : generateMidpointRank(null, null);

    mutations.createDeal.mutate({
      title: newDeal.title,
      column_id: newDeal.column_id,
      priority: "medium",
      due_date: newDeal.due_date || undefined,
      lexo_rank: rank,
      reminder_active: true,
    });
    setCreateOpen(false);
    setNewDeal({ title: "", column_id: "", due_date: "" });
    toast.success("Karta dodana");
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
    <AppLayout title="Lejek sprzedaży">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
          <h1 className="text-lg font-bold text-foreground">Lejek sprzedaży</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Nowa karta
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

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
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
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />

      {/* Archive drawer */}
      <CrmArchiveDrawer open={archiveOpen} onClose={() => setArchiveOpen(false)} />

      {/* Create deal dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nowa karta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tytuł *</Label>
              <Input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} placeholder="Nazwa karty" />
            </div>
            <div className="space-y-2">
              <Label>Kolumna *</Label>
              <Select value={newDeal.column_id} onValueChange={(v) => setNewDeal({ ...newDeal, column_id: v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz kolumnę..." /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Termin</Label>
              <Input type="date" value={newDeal.due_date} onChange={(e) => setNewDeal({ ...newDeal, due_date: e.target.value })} />
            </div>
            <Button onClick={handleCreateDeal} className="w-full">Dodaj kartę</Button>
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

// Need Select imports
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
