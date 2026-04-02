import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, ShieldCheck, HelpCircle, Clock } from "lucide-react";
import { statusLabels } from "@/lib/statusConfig";

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

// Helper: format seconds to human readable
function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours} godz. ${remainMins} min.` : `${hours} godz.`;
}

// Modal: Combined responsibility + time verification for review -> client_review
export function ResponsibilityModal({
  open,
  onOpenChange,
  onConfirm,
  taskId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  taskId?: string;
}) {
  const [timeChecked, setTimeChecked] = useState(false);
  const [responsibilityChecked, setResponsibilityChecked] = useState(false);

  const { data: statusHistory = [] } = useQuery({
    queryKey: ["responsibility-status-history", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data } = await supabase
        .from("task_status_history")
        .select("new_status, status_entered_at, status_exited_at, duration_seconds")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!taskId && open,
  });

  // Compute aggregates per status
  const now = Date.now();
  const aggregates: Record<string, number> = {};
  let totalSeconds = 0;
  statusHistory.forEach((h: any) => {
    const status = h.new_status;
    let duration = h.duration_seconds || 0;
    if (!h.status_exited_at && h.status_entered_at) {
      duration = Math.floor((now - new Date(h.status_entered_at).getTime()) / 1000);
    }
    aggregates[status] = (aggregates[status] || 0) + duration;
    totalSeconds += duration;
  });

  const reset = () => {
    setTimeChecked(false);
    setResponsibilityChecked(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Podsumowanie weryfikacji i wysyłka
          </DialogTitle>
          <DialogDescription>
            Sprawdź dane przed wysłaniem zadania do akceptacji klienta.
          </DialogDescription>
        </DialogHeader>

        {/* SECTION 1: Time Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Łączny czas pracy: {formatDurationShort(totalSeconds)}</span>
          </div>
          {Object.keys(aggregates).length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              {Object.entries(aggregates)
                .filter(([, secs]) => secs > 0)
                .map(([status, secs]) => (
                  <div key={status} className="flex justify-between text-xs text-muted-foreground">
                    <span>{statusLabels[status] || status}</span>
                    <span className="font-medium text-foreground/70">{formatDurationShort(secs)}</span>
                  </div>
                ))}
            </div>
          )}
          <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/40 border">
            <Checkbox
              id="time-confirm"
              checked={timeChecked}
              onCheckedChange={(v) => setTimeChecked(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="time-confirm" className="text-sm cursor-pointer leading-relaxed">
              Potwierdzam, że zaraportowany czas pracy jest poprawny i kompletny.
            </Label>
          </div>
        </div>

        <Separator />

        {/* SECTION 2: Responsibility */}
        <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Checkbox
            id="responsibility"
            checked={responsibilityChecked}
            onCheckedChange={(v) => setResponsibilityChecked(!!v)}
            className="mt-0.5"
          />
          <Label htmlFor="responsibility" className="text-sm cursor-pointer leading-relaxed">
            <strong>Biorę odpowiedzialność za akceptację i weryfikację tego zadania.</strong>{" "}
            Potwierdzam, że zadanie zostało sprawdzone i jest gotowe do przesłania klientowi.
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Anuluj
          </Button>
          <Button
            disabled={!timeChecked || !responsibilityChecked}
            onClick={() => { onConfirm(); reset(); onOpenChange(false); }}
          >
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
