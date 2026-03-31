import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import CallDetailsSheet, {
  formatDuration,
  getCallIcon,
} from "@/components/calls/CallDetailsSheet";

interface ClientCallsTabProps {
  clientId: string;
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

      <CallDetailsSheet
        call={selectedCall}
        open={!!selectedCall}
        onOpenChange={open => !open && setSelectedCall(null)}
      />
    </>
  );
}
