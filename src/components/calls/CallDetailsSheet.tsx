import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Zap,
  Clock,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

export function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getCallIcon(direction: string, duration: number | null, status: string) {
  const isMissed = status === "missed" || status === "no-answer" || duration === 0;
  if (isMissed) return { Icon: PhoneMissed, color: "text-destructive" };
  if (direction === "outbound") return { Icon: PhoneOutgoing, color: "text-blue-500" };
  return { Icon: PhoneIncoming, color: "text-green-500" };
}

export function parseSuggestions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON
  }
  return raw.split(/\n|;/).map(s => s.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
}

interface CallDetailsSheetProps {
  call: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CallDetailsSheet({ call, open, onOpenChange }: CallDetailsSheetProps) {
  if (!call) return null;

  const { Icon: DirIcon, color } = getCallIcon(call.direction, call.duration, call.status);
  const suggestions = parseSuggestions(call.suggestions);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b space-y-2">
          <SheetTitle className="text-lg leading-snug">
            {call.title || "Rozmowa bez tytułu"}
          </SheetTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <DirIcon className={`h-4 w-4 ${color}`} />
            <Badge variant="outline" className="text-xs">
              {call.direction === "outbound" ? "Wychodzące" : "Przychodzące"}
            </Badge>
            <span>
              {call.called_at
                ? format(new Date(call.called_at), "d MMMM yyyy, HH:mm", { locale: pl })
                : "—"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration)}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Audio */}
            {call.recording_url && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Nagranie
                </h4>
                <audio controls src={call.recording_url} className="w-full" preload="none" />
              </div>
            )}

            {/* AI section */}
            {(call.ai_summary || suggestions.length > 0) && (
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Analiza AI
                  </span>
                </div>

                {call.ai_summary && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">Podsumowanie</h5>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{call.ai_summary}</p>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">Sugestie</h5>
                    <ul className="space-y-2">
                      {suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex-1">{s}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={e => {
                              e.stopPropagation();
                              toast.success("Zadanie utworzone (placeholder)");
                            }}
                          >
                            <ListTodo className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Transcription */}
            {call.transcription && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Transkrypcja
                </h4>
                <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {call.transcription}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
