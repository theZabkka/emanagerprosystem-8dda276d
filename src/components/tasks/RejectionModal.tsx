import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

const REJECTION_CATEGORIES = [
  { value: "Niekompletne/niejasne wytyczne (wina zlecającego)", label: "Niekompletne wytyczne (zlecający)" },
  { value: "Błąd w wykonaniu (wina wykonawcy)", label: "Błąd w wykonaniu (wykonawca)" },
  { value: "Zmiana wymagań klienta", label: "Zmiana wymagań klienta" },
  { value: "Inne", label: "Inne" },
];

interface RejectionModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (category: string, comment: string) => void;
}

export function RejectionModal({ open, onOpenChange, onConfirm }: RejectionModalProps) {
  const [category, setCategory] = useState(REJECTION_CATEGORIES[0].value);
  const [comment, setComment] = useState("");

  const reset = () => { setCategory(REJECTION_CATEGORIES[0].value); setComment(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Powód odrzucenia zadania
          </DialogTitle>
          <DialogDescription>
            Wybierz kategorię przyczyny i opcjonalnie dodaj komentarz. Dane zostaną zapisane w analityce.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Kategoria przyczyny</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Komentarz (opcjonalnie)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Krótki opis problemu..."
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(category, comment); reset(); onOpenChange(false); }}
          >
            Zapisz i cofnij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
