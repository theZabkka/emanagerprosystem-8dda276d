import { useState } from "react";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCrmLabels, useCrmMutations, type CrmLabel } from "@/hooks/useCrmData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6",
];

interface CrmLabelManagerProps {
  onFilterByLabel?: (labelId: string | null) => void;
  activeLabelFilter?: string | null;
}

export function CrmLabelManager({ onFilterByLabel, activeLabelFilter }: CrmLabelManagerProps) {
  const { data: labels = [] } = useCrmLabels();
  const { createLabel } = useCrmMutations();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<CrmLabel | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  // Fetch label usage counts
  const { data: labelCounts = {} } = useQuery({
    queryKey: ["crm-label-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_labels" as any)
        .select("label_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data as any[]).forEach((row: any) => {
        counts[row.label_id] = (counts[row.label_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60 * 1000,
  });

  const openCreate = () => {
    setEditingLabel(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setDialogOpen(true);
  };

  const openEdit = (label: CrmLabel) => {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Podaj nazwę etykiety");
      return;
    }

    if (editingLabel) {
      const { error } = await supabase
        .from("crm_labels" as any)
        .update({ name: name.trim(), color } as any)
        .eq("id", editingLabel.id);
      if (error) {
        toast.error("Błąd zapisu");
        return;
      }
      toast.success("Etykieta zaktualizowana");
    } else {
      createLabel.mutate({ name: name.trim(), color });
      toast.success("Etykieta utworzona");
    }

    qc.invalidateQueries({ queryKey: ["crm-labels"] });
    qc.invalidateQueries({ queryKey: ["crm-label-counts"] });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("crm_deal_labels" as any).delete().eq("label_id", id);
    const { error } = await supabase.from("crm_labels" as any).delete().eq("id", id);
    if (error) {
      toast.error("Błąd usuwania");
      return;
    }
    qc.invalidateQueries({ queryKey: ["crm-labels"] });
    qc.invalidateQueries({ queryKey: ["crm-all-deal-labels"] });
    qc.invalidateQueries({ queryKey: ["crm-label-counts"] });
    if (activeLabelFilter === id) onFilterByLabel?.(null);
    toast.success("Etykieta usunięta");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Zarządzaj etykietami używanymi w lejku sprzedażowym</p>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nowa etykieta
        </Button>
      </div>

      {activeLabelFilter && (
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => onFilterByLabel?.(null)}>
          ✕ Wyczyść filtr etykiety
        </Button>
      )}

      {labels.length === 0 && (
        <p className="text-xs text-muted-foreground py-4">Brak etykiet. Kliknij "Nowa etykieta" aby utworzyć.</p>
      )}

      <div className="space-y-2">
        {labels.map((label) => {
          const count = labelCounts[label.id] || 0;
          const isActive = activeLabelFilter === label.id;
          return (
            <div
              key={label.id}
              className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${
                isActive ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <span className="text-sm font-medium text-foreground truncate">{label.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">({count})</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onFilterByLabel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isActive ? "text-primary" : ""}`}
                    onClick={() => onFilterByLabel(isActive ? null : label.id)}
                    title="Filtruj tablicę po tej etykiecie"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(label)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(label.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLabel ? "Edytuj etykietę" : "Nowa etykieta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nazwa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Pilne" />
            </div>
            <div className="space-y-2">
              <Label>Kolor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#hex" className="mt-2" />
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingLabel ? "Zapisz zmiany" : "Utwórz etykietę"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
