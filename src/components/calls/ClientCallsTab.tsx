import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Phone,
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

interface ClientCallsTabProps {
  clientId: string;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getCallIcon(direction: string, duration: number | null, status: string) {
  const isMissed = status === "missed" || status === "no-answer" || duration === 0;
  if (isMissed) return { Icon: PhoneMissed, color: "text-destructive" };
  if (direction === "outbound") return { Icon: PhoneOutgoing, color: "text-blue-500" };
  return { Icon: PhoneIncoming, color: "text-green-500" };
}

function parseSuggestions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON — split by newlines
  }
  return raw.split(/\n|;/).map(s => s.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
}

export default function ClientCallsTab({ clientId }: ClientCallsTabProps) {
  const [selectedCall, setSelectedCall] = useState<any | null>(null);

  const { data: calls, isLoading } = useQuery({
    queryKey: ["client-calls", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("client_id", clientId)
        .order("called_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!calls?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">Brak nagrań rozmów</p>
        <p className="text-sm mt-1">Rozmowy pojawią się tutaj automatycznie po integracji z Zadarma.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {calls.map((call: any) => {
          const { Icon: DirIcon, color } = getCallIcon(call.direction, call.duration, call.status);
          return (
            <Card
              key={call.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedCall(call)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`shrink-0 ${color}`}>
                  <DirIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {call.title || "Rozmowa bez tytułu"}
                  </p>
                  {call.ai_summary && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {call.ai_summary}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {call.called_at
                      ? format(new Date(call.called_at), "d MMM yyyy, HH:mm", { locale: pl })
                      : "—"}
                  </p>
                  <p className="text-xs font-medium flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(call.duration)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Detail Sheet ─────────────────────────────────── */}
      <Sheet open={!!selectedCall} onOpenChange={open => !open && setSelectedCall(null)}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
          {selectedCall && (() => {
            const { Icon: DirIcon, color } = getCallIcon(
              selectedCall.direction,
              selectedCall.duration,
              selectedCall.status
            );
            const suggestions = parseSuggestions(selectedCall.suggestions);

            return (
              <>
                {/* Header */}
                <div className="p-6 pb-4 border-b space-y-2">
                  <SheetTitle className="text-lg leading-snug">
                    {selectedCall.title || "Rozmowa bez tytułu"}
                  </SheetTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <DirIcon className={`h-4 w-4 ${color}`} />
                    <Badge variant="outline" className="text-xs">
                      {selectedCall.direction === "outbound" ? "Wychodzące" : "Przychodzące"}
                    </Badge>
                    <span>
                      {selectedCall.called_at
                        ? format(new Date(selectedCall.called_at), "d MMMM yyyy, HH:mm", { locale: pl })
                        : "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(selectedCall.duration)}
                    </span>
                  </div>
                </div>

                {/* Scrollable body */}
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Audio */}
                    {selectedCall.recording_url && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Nagranie
                        </h4>
                        <audio
                          controls
                          src={selectedCall.recording_url}
                          className="w-full"
                          preload="none"
                        />
                      </div>
                    )}

                    {/* AI section */}
                    {(selectedCall.ai_summary || suggestions.length > 0) && (
                      <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            Analiza AI
                          </span>
                        </div>

                        {selectedCall.ai_summary && (
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground mb-1">Podsumowanie</h5>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {selectedCall.ai_summary}
                            </p>
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
                    {selectedCall.transcription && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Transkrypcja
                        </h4>
                        <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                          {selectedCall.transcription}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
}
