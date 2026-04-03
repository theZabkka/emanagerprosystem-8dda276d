import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  ChevronDown,
  ListTodo,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

/* ── helpers ─────────────────────────────────────────── */

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function normalizeDirection(raw: string): "in" | "out" {
  if (raw === "out" || raw === "outbound" || raw === "outgoing") return "out";
  return "in";
}

function getCallIcon(direction: string, duration: number | null, status: string) {
  const isMissed = status === "missed" || status === "no-answer" || duration === 0;
  if (isMissed) return { Icon: PhoneMissed, color: "text-destructive" };
  if (normalizeDirection(direction) === "out") return { Icon: PhoneOutgoing, color: "text-blue-500" };
  return { Icon: PhoneIncoming, color: "text-green-500" };
}

function formatPhoneNumber(raw: string | null | undefined): string {
  if (!raw) return "Nieznany numer";
  const digits = raw.replace(/\D/g, "");
  // Handle Polish numbers with +48 prefix
  const core = digits.startsWith("48") && digits.length > 9 ? digits.slice(2) : digits;
  if (core.length === 9) {
    return `+48 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`;
  }
  // Generic formatting for other lengths
  if (core.length > 6) {
    return `+${digits.slice(0, digits.length - 9)} ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`;
  }
  return raw;
}

function parseSuggestions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON
  }
  return raw
    .split(/\n|;/)
    .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

/* ── component ───────────────────────────────────────── */

export default function Transcriptions() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [phoneSearch, setPhoneSearch] = useState("");

  /* Fetch calls with client join */
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

  /* Unique clients for filter dropdown */
  const clientOptions = useMemo(() => {
    if (!calls?.length) return [];
    const map = new Map<string, string>();
    for (const c of calls) {
      if (c.client_id && (c.client as any)?.name) {
        map.set(c.client_id, (c.client as any).name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [calls]);

  /* Filtered & sorted list */
  const filtered = useMemo(() => {
    if (!calls?.length) return [];
    let list = [...calls];

    if (clientFilter !== "all") {
      if (clientFilter === "unknown") {
        list = list.filter((c) => !c.client_id);
      } else {
        list = list.filter((c) => c.client_id === clientFilter);
      }
    }

    if (directionFilter !== "all") {
      list = list.filter((c) => normalizeDirection(c.direction) === directionFilter);
    }

    if (phoneSearch.trim()) {
      const q = phoneSearch.replace(/\s/g, "").toLowerCase();
      list = list.filter((c) => {
        const num = (c.client_number || "").replace(/\s/g, "").toLowerCase();
        return num.includes(q);
      });
    }

    return list;
  }, [calls, clientFilter, directionFilter, phoneSearch]);

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AppLayout title="Transkrypcje">
      <div className="space-y-4">
        {/* ── Filter Bar ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card">
          {/* Client filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Wszyscy klienci" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy klienci</SelectItem>
              <SelectItem value="unknown">Nieznane numery</SelectItem>
              {clientOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Direction filter */}
          <div className="flex rounded-md border overflow-hidden">
            {[
              { value: "all", label: "Wszystkie" },
              { value: "in", label: "Przychodzące" },
              { value: "out", label: "Wychodzące" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDirectionFilter(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  directionFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Phone search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po numerze telefonu..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="pl-9 font-mono"
            />
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* ── Empty ──────────────────────────────────── */}
        {!isLoading && !filtered.length && (
          <div className="text-center py-16 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Brak rozmów</p>
            <p className="text-sm mt-1">
              {phoneSearch || clientFilter !== "all" || directionFilter !== "all"
                ? "Brak wyników dla wybranych filtrów."
                : "Rozmowy pojawią się tutaj automatycznie po integracji z Zadarma."}
            </p>
          </div>
        )}

        {/* ── Calls List ─────────────────────────────── */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((call: any) => {
              const isExpanded = expandedId === call.id;
              const { Icon: DirIcon, color } = getCallIcon(call.direction, call.duration, call.status);
              const clientName = (call.client as any)?.name;
              const displayName = clientName || null;
              const displayNumber = call.client_number ? formatPhoneNumber(call.client_number) : null;
              const suggestions = isExpanded ? parseSuggestions(call.suggestions) : [];

              return (
                <div key={call.id}>
                  {/* ── Row Card ──────────────────────── */}
                  <Card
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      isExpanded ? "border-primary/40 bg-accent/30" : ""
                    }`}
                    onClick={() => toggleExpanded(call.id)}
                  >
                    <CardContent className="p-3">
                      {/* Mobile: flex layout */}
                      <div className="flex items-center gap-3 md:hidden">
                        <div className={`shrink-0 ${color}`}>
                          <DirIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <span className={`block text-sm truncate ${displayName ? "font-semibold text-foreground" : "font-bold font-mono text-foreground"}`}>
                            {displayName || displayNumber || "Nieznany numer"}
                          </span>
                          <p className="text-xs text-muted-foreground truncate">
                            {call.title || "Rozmowa bez tytułu"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            {call.called_at ? format(new Date(call.called_at), "d MMM yyyy, HH:mm", { locale: pl }) : "—"}
                          </p>
                          <p className="text-xs font-medium font-mono flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration)}
                          </p>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>

                      {/* Desktop: 3-column grid */}
                      <div className="hidden md:grid items-center" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                        {/* Col 1: Icon + Name + Title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 ${color}`}>
                            <DirIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <span className={`block text-sm truncate ${displayName ? "font-semibold text-foreground" : "font-bold font-mono text-foreground"}`}>
                              {displayName || displayNumber || "Nieznany numer"}
                            </span>
                            <p className="text-xs text-muted-foreground truncate">
                              {call.title || "Rozmowa bez tytułu"}
                            </p>
                          </div>
                        </div>

                        {/* Col 2: Phone number – centered */}
                        <div className="justify-self-center">
                          {displayNumber ? (
                            <span className="text-sm font-mono text-muted-foreground">{displayNumber}</span>
                          ) : (
                            <span />
                          )}
                        </div>

                        {/* Col 3: Metadata + chevron – right aligned */}
                        <div className="flex items-center justify-end gap-3">
                          <div className="text-right space-y-0.5">
                            <p className="text-xs text-muted-foreground">
                              {call.called_at ? format(new Date(call.called_at), "d MMM yyyy, HH:mm", { locale: pl }) : "—"}
                            </p>
                            <p className="text-xs font-medium font-mono flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(call.duration)}
                            </p>
                          </div>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Expanded Details ──────────────── */}
                  {isExpanded && (
                    <div className="border border-t-0 rounded-b-lg bg-card/80 backdrop-blur-sm p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                      {/* Detail Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold">
                            {call.client_id
                              ? call.title || "Rozmowa bez tytułu"
                              : `Połączenie z numerem: ${displayNumber || "Nieznany"}`}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {normalizeDirection(call.direction) === "out" ? "Wychodzące" : "Przychodzące"}
                            </Badge>
                            <Badge
                              variant={call.status === "missed" || call.status === "no-answer" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {call.status === "missed" || call.status === "no-answer"
                                ? "Nieodebrane"
                                : "Zakończone"}
                            </Badge>
                            <span>
                              {call.called_at
                                ? format(new Date(call.called_at), "d MMMM yyyy, HH:mm:ss", { locale: pl })
                                : "—"}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" />
                              {formatDuration(call.duration)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Audio Player */}
                      {call.recording_url && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Nagranie
                          </h4>
                          <div className="rounded-lg bg-muted/60 p-3">
                            <audio
                              controls
                              src={call.recording_url}
                              className="w-full [&::-webkit-media-controls-panel]:bg-transparent"
                              preload="none"
                            />
                          </div>
                        </div>
                      )}

                      {/* AI Section – 2 columns */}
                      {(call.ai_summary || call.suggestions) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* AI Summary */}
                          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-purple-500" />
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                Podsumowanie AI
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {call.ai_summary || "Brak podsumowania."}
                            </p>
                          </div>

                          {/* Suggestions */}
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <ListTodo className="h-4 w-4 text-blue-500" />
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Sugestie i Działania
                              </span>
                            </div>
                            {suggestions.length > 0 ? (
                              <ul className="space-y-1.5">
                                {suggestions.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-blue-500 mt-1 shrink-0">•</span>
                                    <span className="flex-1">{s}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">Brak sugestii.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Transcription – collapsible */}
                      {call.transcription && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full group">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Pokaż pełną transkrypcję</span>
                            <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3">
                            <div className="rounded-lg bg-muted/50 border p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto font-mono text-xs">
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
