import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Zap, ChevronDown, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface CallsListProps {
  clientId?: string;
  taskId?: string;
}

export default function CallsList({ clientId, taskId }: CallsListProps) {
  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls", clientId, taskId],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("*")
        .order("called_at", { ascending: false });

      if (clientId) query = query.eq("client_id", clientId);
      if (taskId) query = query.eq("task_id", taskId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!calls?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Phone className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Brak nagrań rozmów</p>
        <p className="text-sm mt-1">Rozmowy pojawią się tutaj automatycznie po integracji z Zadarma.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call: any) => {
        const DirectionIcon =
          call.status === "missed" ? PhoneMissed :
          call.direction === "outbound" ? PhoneOutgoing : PhoneIncoming;
        const dirColor =
          call.status === "missed" ? "text-destructive" :
          call.direction === "outbound" ? "text-blue-500" : "text-green-500";

        return (
          <Card key={call.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DirectionIcon className={`h-5 w-5 ${dirColor}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {call.direction === "outbound" ? call.callee_number : call.caller_number}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {call.direction === "outbound" ? "Wychodzące" : "Przychodzące"}
                      </Badge>
                      {call.status === "missed" && (
                        <Badge variant="destructive" className="text-xs">Nieodebrane</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {call.called_at && format(new Date(call.called_at), "d MMM yyyy, HH:mm", { locale: pl })}
                      {call.duration > 0 && ` · ${formatDuration(call.duration)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {call.ai_summary && (
                <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                      Podsumowanie AI
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{call.ai_summary}</p>
                </div>
              )}

              {/* Error note */}
              {call.error_note && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{call.error_note}</p>
                </div>
              )}

              {/* Recording player */}
              {call.recording_url && (
                <audio controls className="w-full h-8" preload="none">
                  <source src={call.recording_url} />
                </audio>
              )}

              {/* Transcription (collapsible) */}
              {call.transcription && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                    Pokaż pełną transkrypcję
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {call.transcription}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
