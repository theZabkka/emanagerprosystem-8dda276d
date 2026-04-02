import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";

// Modal: Checklist not complete - blocks in_progress -> review
export function ChecklistBlockModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Nie można przejść do Weryfikacji
          </DialogTitle>
          <DialogDescription>
            Wszystkie elementy listy kontrolnej muszą być zaznaczone zanim zadanie trafi do weryfikacji.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Wróć do zadania i upewnij się, że każdy punkt checklisty jest oznaczony jako ukończony lub N/A.
        </p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Rozumiem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal: Responsibility acceptance for review -> client_review
export function ResponsibilityModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setAccepted(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Oświadczenie odpowiedzialności
          </DialogTitle>
          <DialogDescription>
            Przesyłasz zadanie do akceptacji klienta. Potwierdź, że zadanie zostało zweryfikowane.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 py-4 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Checkbox
            id="responsibility"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(!!v)}
            className="mt-0.5"
          />
          <Label htmlFor="responsibility" className="text-sm cursor-pointer leading-relaxed">
            <strong>Biorę odpowiedzialność za akceptację i weryfikację tego zadania.</strong>{" "}
            Potwierdzam, że zadanie zostało sprawdzone i jest gotowe do przesłania klientowi.
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setAccepted(false); }}>
            Anuluj
          </Button>
          <Button disabled={!accepted} onClick={() => { onConfirm(); setAccepted(false); onOpenChange(false); }}>
            Potwierdź i wyślij do klienta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal: "Don't understand" the task
export function NotUnderstoodModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(""); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <HelpCircle className="h-5 w-5" /> Nie rozumiem polecenia
          </DialogTitle>
          <DialogDescription>
            Koordynator zostanie powiadomiony i będzie musiał wyjaśnić zadanie.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm">Co jest niejasne? (opcjonalnie)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Opisz, co jest niezrozumiałe w tym zadaniu..."
            className="min-h-[80px] text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setReason(""); }}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(reason); setReason(""); onOpenChange(false); }}
          >
            Zgłoś niezrozumienie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal: Client review - approve or request corrections
export function ClientReviewModal({
  open,
  onOpenChange,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApprove: () => void;
  onReject: (severity: string, reason: string) => void;
}) {
  const [mode, setMode] = useState<"choice" | "reject">("choice");
  const [severity, setSeverity] = useState("minor");
  const [reason, setReason] = useState("");

  const reset = () => { setMode("choice"); setSeverity("minor"); setReason(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Akceptacja zadania</DialogTitle>
          <DialogDescription>Czy zadanie spełnia Twoje oczekiwania?</DialogDescription>
        </DialogHeader>

        {mode === "choice" ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              size="lg"
              className="h-24 flex-col gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { onApprove(); reset(); onOpenChange(false); }}
            >
              <ShieldCheck className="h-8 w-8" />
              <span className="font-bold">Akceptuję</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-24 flex-col gap-2 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setMode("reject")}
            >
              <AlertTriangle className="h-8 w-8" />
              <span className="font-bold">Poprawki</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Rodzaj poprawek</Label>
              <RadioGroup value={severity} onValueChange={setSeverity}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="minor" id="minor" />
                  <Label htmlFor="minor" className="text-sm cursor-pointer">
                    <span className="font-medium text-amber-600">Małe poprawki</span> — drobne korekty, nie wymagają dużo pracy
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="critical" id="critical" />
                  <Label htmlFor="critical" className="text-sm cursor-pointer">
                    <span className="font-medium text-destructive">Krytyczne poprawki</span> — poważne problemy, wymaga przerobienia
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Opisz uwagi</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Co należy poprawić..."
                className="min-h-[80px] text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("choice")}>Wróć</Button>
              <Button
                variant="destructive"
                disabled={!reason.trim()}
                onClick={() => { onReject(severity, reason); reset(); onOpenChange(false); }}
              >
                Zgłoś poprawki
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
