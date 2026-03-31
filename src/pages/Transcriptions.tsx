import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import CallDetailsSheet, {
  formatDuration,
  getCallIcon,
} from "@/components/calls/CallDetailsSheet";

type CallFilter = "all" | "unknown";

export default function Transcriptions() {
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [filter, setFilter] = useState<CallFilter>("all");

  const { data: calls, isLoading } = useQuery({
    queryKey: ["global-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, client:clients(name)")
        .order("called_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = calls?.filter((c: any) => {
    if (filter === "unknown") return !c.client_id;
    return true;
  });

  return (
    <AppLayout title="Transkrypcje">
      <div className="space-y-4">
        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={v => setFilter(v as CallFilter)}>
          <TabsList>
            <TabsTrigger value="all">Wszystkie rozmowy</TabsTrigger>
            <TabsTrigger value="unknown">Tylko nieznane numery</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !filtered?.length && (
          <div className="text-center py-16 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Brak rozmów</p>
            <p className="text-sm mt-1">
              {filter === "unknown"
                ? "Brak rozmów z nieznanych numerów."
                : "Rozmowy pojawią się tutaj automatycznie po integracji z Zadarma."}
            </p>
          </div>
        )}

        {/* List */}
        {filtered?.map((call: any) => {
          const { Icon: DirIcon, color } = getCallIcon(call.direction, call.duration, call.status);
          const clientName = call.client?.name;

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
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {clientName ? (
                      <Badge variant="secondary" className="text-xs">
                        {clientName}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                        Nieznany numer
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate">
                    {call.title || "Rozmowa bez tytułu"}
                  </p>
                  {call.ai_summary && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
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
    </AppLayout>
  );
}
