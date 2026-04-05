import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NONE_SENTINEL = "__none__";

export interface NewDealFormData {
  title: string;
  column_id: string;
  due_date: string;
  client_id: string;
  description: string;
  assigned_to: string;
  selectedLabels: string[];
}

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newDeal: NewDealFormData;
  onNewDealChange: (deal: NewDealFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  columns: Array<{ id: string; name: string }>;
  clientsList: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; full_name: string | null }>;
  allLabels: Array<{ id: string; name: string; color: string }>;
}

export function CreateDealDialog({
  open,
  onOpenChange,
  newDeal,
  onNewDealChange,
  onSubmit,
  isPending,
  columns,
  clientsList,
  staff,
  allLabels,
}: CreateDealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nowa karta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Tytuł *</Label>
              <Input value={newDeal.title} onChange={(e) => onNewDealChange({ ...newDeal, title: e.target.value })} placeholder="Nazwa karty" />
            </div>
            <div className="space-y-2">
              <Label>Etap *</Label>
              <Select value={newDeal.column_id} onValueChange={(v) => onNewDealChange({ ...newDeal, column_id: v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz etap..." /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Termin</Label>
              <Input type="datetime-local" value={newDeal.due_date} onChange={(e) => onNewDealChange({ ...newDeal, due_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Klient</Label>
              <Select value={newDeal.client_id || NONE_SENTINEL} onValueChange={(v) => onNewDealChange({ ...newDeal, client_id: v === NONE_SENTINEL ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>Brak</SelectItem>
                  {clientsList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Przypisana osoba</Label>
              <Select value={newDeal.assigned_to || NONE_SENTINEL} onValueChange={(v) => onNewDealChange({ ...newDeal, assigned_to: v === NONE_SENTINEL ? "" : v })}>
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
              onChange={(e) => onNewDealChange({ ...newDeal, description: e.target.value })}
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
                    onClick={() => onNewDealChange({
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
          <Button onClick={onSubmit} className="w-full" disabled={isPending || !newDeal.title.trim() || !newDeal.column_id}>
            {isPending ? "Tworzenie..." : "Dodaj kartę"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
