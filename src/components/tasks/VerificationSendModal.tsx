import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Clock, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useVerificationLock } from "@/hooks/useVerificationLock";

interface TimeLogEntry {
  duration: number;
  phase?: string | null;
  profiles?: { full_name?: string } | null;
}

interface VerificationSendModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: string;
  timeLogs: TimeLogEntry[];
  totalMinutes: number;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function VerificationSendModal({
  open,
  onOpenChange,
  taskId,
  timeLogs,
  totalMinutes,
}: VerificationSendModalProps) {
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [responsibilityConfirmed, setResponsibilityConfirmed] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { refreshAfterVerification } = useVerificationLock();

  const reset = () => {
    setTimeConfirmed(false);
    setResponsibilityConfirmed(false);
  };

  // Group time by phase
  const phaseBreakdown = timeLogs.reduce<Record<string, number>>((acc, log) => {
    const phase = log.phase || "Ogólne";
    acc[phase] = (acc[phase] || 0) + log.duration;
    return acc;
  }, {});

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("change_task_status", {
        _task_id: taskId,
        _new_status: "client_review" as any,
        _changed_by: user?.id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zadanie wysłane do akceptacji klienta");
      reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["status-history", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      refreshAfterVerification();
    },
    onError: (err: any) => {
      toast.error(`Błąd zmiany statusu: ${err.message}`);
    },
  });

  const bothChecked = timeConfirmed && responsibilityConfirmed;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Podsumowanie weryfikacji i wysyłka
          </DialogTitle>
          <DialogDescription>
            Potwierdź czas pracy oraz odpowiedzialność przed wysłaniem zadania do klienta.
          </DialogDescription>
        </DialogHeader>

        {/* SECTION 1: Time */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Czas pracy</span>
          </div>
          <div className="px-3 py-3 rounded-lg bg-muted/50 border space-y-2">
            <p className="text-base font-bold">
              Łączny czas pracy: {formatDuration(totalMinutes)}
            </p>
            {Object.keys(phaseBreakdown).length > 0 && (
              <div className="space-y-1">
                {Object.entries(phaseBreakdown).map(([phase, mins]) => (
                  <div key={phase} className="flex justify-between text-sm text-muted-foreground">
                    <span>{phase}</span>
                    <span className="font-medium">{formatDuration(mins)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="time-confirm"
              checked={timeConfirmed}
              onCheckedChange={(v) => setTimeConfirmed(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="time-confirm" className="text-sm cursor-pointer leading-relaxed">
              Potwierdzam, że zaraportowany czas pracy jest poprawny i kompletny.
            </Label>
          </div>
        </div>

        <Separator />

        {/* SECTION 2: Responsibility */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Odpowiedzialność</span>
          </div>
          <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Checkbox
              id="responsibility-confirm"
              checked={responsibilityConfirmed}
              onCheckedChange={(v) => setResponsibilityConfirmed(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="responsibility-confirm" className="text-sm cursor-pointer leading-relaxed">
              <strong>Biorę odpowiedzialność za akceptację i weryfikację tego zadania.</strong>{" "}
              Potwierdzam, że zadanie zostało sprawdzone i jest gotowe do przesłania klientowi.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Anuluj
          </Button>
          <Button
            disabled={!bothChecked || mutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wysyłanie...</>
            ) : (
              "Potwierdź i wyślij do klienta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
