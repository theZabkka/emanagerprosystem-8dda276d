import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import CallDetailsSheet, {
  formatDuration,
  getCallIcon,
} from "@/components/calls/CallDetailsSheet";

const UNKNOWN_GROUP_KEY = "__unknown__";
const UNKNOWN_GROUP_LABEL = "Nieznane / Nowe numery";

interface CallGroup {
  key: string;
  label: string;
  calls: any[];
}

export default function Transcriptions() {
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [search, setSearch] = useState("");

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

  const groups = useMemo<CallGroup[]>(() => {
    if (!calls?.length) return [];

    const map = new Map<string, { label: string; calls: any[] }>();

    for (const call of calls) {
      const key = call.client_id ?? UNKNOWN_GROUP_KEY;
      const label = (call.client as any)?.name ?? UNKNOWN_GROUP_LABEL;
      if (!map.has(key)) map.set(key, { label, calls: [] });
      map.get(key)!.calls.push(call);
    }

    const sorted = Array.from(map.entries())
      .map(([key, val]) => ({ key, label: val.label, calls: val.calls }))
      .sort((a, b) => {
        if (a.key === UNKNOWN_GROUP_KEY) return -1;
        if (b.key === UNKNOWN_GROUP_KEY) return 1;
        return a.label.localeCompare(b.label, "pl");
      });

    return sorted;
  }, [calls]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => g.label.toLowerCase().includes(q));
  }, [groups, search]);

  return (
    <AppLayout title="Transkrypcje">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj klienta po nazwie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !filtered.length && (
          <div className="text-center py-16 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Brak rozmów</p>
            <p className="text-sm mt-1">
              {search
                ? "Brak wyników dla podanej frazy."
                : "Rozmowy pojawią się tutaj automatycznie po integracji z Zadarma."}
            </p>
          </div>
        )}

        {/* Grouped Accordion */}
        {!isLoading && filtered.length > 0 && (
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((group) => (
              <AccordionItem
                key={group.key}
                value={group.key}
                className="border rounded-lg px-1"
              >
                <AccordionTrigger className="px-3 py-3 hover:no-underline text-sm font-semibold">
                  {group.label}{" "}
                  <span className="ml-1.5 text-muted-foreground font-normal">
                    ({group.calls.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3 space-y-2">
                  {group.calls.map((call: any) => {
                    const { Icon: DirIcon, color } = getCallIcon(
                      call.direction,
                      call.duration,
                      call.status
                    );

                    return (
                      <Card
                        key={call.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedCall(call)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`shrink-0 ${color}`}>
                            <DirIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
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
                                ? format(
                                    new Date(call.called_at),
                                    "d MMM yyyy, HH:mm",
                                    { locale: pl }
                                  )
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <CallDetailsSheet
        call={selectedCall}
        open={!!selectedCall}
        onOpenChange={(open) => !open && setSelectedCall(null)}
      />
    </AppLayout>
  );
}
