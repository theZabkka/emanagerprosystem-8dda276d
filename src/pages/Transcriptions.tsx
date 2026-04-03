import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Search,
  Zap,
  ListTodo,
  ChevronDown,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  formatDuration,
  getCallIcon,
  parseSuggestions,
} from "@/components/calls/CallDetailsSheet";

export default function Transcriptions() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [phoneSearch, setPhoneSearch] = useState("");

  /* ── data ── */
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

  const { data: clients } = useQuery({
    queryKey: ["clients-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  /* ── filtering ── */
  const filtered = useMemo(() => {
    if (!calls) return [];
    let list = [...calls];

    if (clientFilter !== "all") {
      list = list.filter((c) => c.client_id === clientFilter);
    }

    if (directionFilter !== "all") {
      const dir = directionFilter === "in" ? "inbound" : "outbound";
      list = list.filter((c) => c.direction === dir);
    }

    if (phoneSearch.trim()) {
      const q = phoneSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.caller_number ?? "").toLowerCase().includes(q) ||
          (c.callee_number ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [calls, clientFilter, directionFilter, phoneSearch]);

  /* ── helpers ── */
  const getDisplayName = (call: any) => {
    if (call.client?.name) return call.client.name;
    const num =
      call.direction === "outbound" ? call.callee_number : call.caller_number;
    return num || "Nieznany numer";
  };

  return (
    <AppLayout title="Transkrypcje">
      <div className="space-y-4">
        {/* ── FILTERS ── */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Client filter */}
          <div className="w-56">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Klient
            </label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Wszyscy klienci" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy klienci</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction filter */}
          <div className="w-44">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Kierunek
            </label>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="in">Przychodzące</SelectItem>
                <SelectItem value="out">Wychodzące</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Numer telefonu
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>

        {/* ── LOADING ── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* ── EMPTY ── */}
        {!isLoading && !filtered.length && (
          <div className="text-center py-16 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Brak rozmów</p>
            <p className="text-sm mt-1">
              {phoneSearch || clientFilter !== "all" || directionFilter !== "all"
                ? "Brak wyników dla podanych filtrów."
                : "Rozmowy pojawią się tutaj automatycznie po integracji z Zadarma."}
            </p>
          </div>
        )}

        {/* ── LIST ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((call: any) => {
              const { Icon: DirIcon, color } = getCallIcon(
                call.direction,
                call.duration,
                call.status
              );
              const isExpanded = expandedId === call.id;
              const displayName = getDisplayName(call);
              const isUnknown = !call.client?.name;
              const suggestions = parseSuggestions(call.suggestions);

              return (
                <div key={call.id}>
                  {/* ── ROW CARD ── */}
                  <Card
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      isExpanded ? "border-primary/40 bg-accent/30" : ""
                    }`}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : call.id)
                    }
                  >
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                      {/* Direction icon */}
                      <div className={`shrink-0 ${color}`}>
                        <DirIcon className="h-5 w-5" />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm truncate ${
                              isUnknown ? "font-bold" : "font-semibold"
                            }`}
                          >
                            {displayName}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {call.direction === "outbound"
                              ? "Wych."
                              : "Przych."}
                          </Badge>
                        </div>
                        {call.title && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {call.title}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
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

                      {/* Chevron */}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </CardContent>
                  </Card>

                  {/* ── EXPANDED DETAILS ── */}
                  {isExpanded && (
                    <div className="border border-t-0 rounded-b-lg bg-card p-4 sm:p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                      {/* Header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-base">
                            {call.title || "Rozmowa bez tytułu"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {call.called_at
                              ? format(
                                  new Date(call.called_at),
                                  "d MMMM yyyy, HH:mm:ss",
                                  { locale: pl }
                                )
                              : "—"}{" "}
                            · {formatDuration(call.duration)}
                          </p>
                        </div>
                        {call.status === "missed" && (
                          <Badge variant="destructive">Nieodebrane</Badge>
                        )}
                      </div>

                      {/* Audio player */}
                      {call.recording_url && (
                        <div className="rounded-lg bg-muted/60 p-3">
                          <audio
                            controls
                            src={call.recording_url}
                            className="w-full h-9 [&::-webkit-media-controls-panel]:bg-muted [&::-webkit-media-controls-current-time-display]:text-foreground [&::-webkit-media-controls-time-remaining-display]:text-foreground"
                            preload="none"
                          />
                        </div>
                      )}

                      {/* AI section – 2-column grid */}
                      {(call.ai_summary || suggestions.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left – Summary */}
                          {call.ai_summary && (
                            <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-purple-500" />
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                  Podsumowanie AI
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {call.ai_summary}
                              </p>
                            </div>
                          )}

                          {/* Right – Suggestions */}
                          {suggestions.length > 0 && (
                            <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <ListTodo className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                  Sugestie i Działania
                                </span>
                              </div>
                              <ul className="space-y-2">
                                {suggestions.map((s, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <span className="flex-1">{s}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast.success(
                                          "Zadanie utworzone (placeholder)"
                                        );
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

                      {/* Transcription – collapsible */}
                      {call.transcription && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full group">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">
                              Pokaż pełną transkrypcję
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3">
                            <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                              {call.transcription}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
