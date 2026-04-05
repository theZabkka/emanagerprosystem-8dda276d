import { useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Search,
  Zap,
  FileText,
  Play,
  Pause,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import CallDetailsSheet from "@/components/calls/CallDetailsSheet";

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
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  const core = digits.startsWith("48") && digits.length > 9 ? digits.slice(2) : digits;
  if (core.length === 9) {
    return `+48 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`;
  }
  return raw;
}

/* ── component ───────────────────────────────────────── */

export default function Transcriptions() {
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [phoneSearch, setPhoneSearch] = useState("");

  // Sheet state
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [sheetTab, setSheetTab] = useState<"ai" | "transcript">("ai");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Inline audio
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const togglePlay = useCallback((callId: string) => {
    // Pause any currently playing
    if (playingId && playingId !== callId) {
      audioRefs.current[playingId]?.pause();
    }
    const el = audioRefs.current[callId];
    if (!el) return;
    if (playingId === callId) {
      el.pause();
      setPlayingId(null);
    } else {
      el.play();
      setPlayingId(callId);
    }
  }, [playingId]);

  const handleAudioEnded = useCallback((callId: string) => {
    if (playingId === callId) setPlayingId(null);
  }, [playingId]);

  const openSheet = (call: any, tab: "ai" | "transcript") => {
    setSelectedCall(call);
    setSheetTab(tab);
    setSheetOpen(true);
  };

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

  /* Filtered list */
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

  return (
    <AppLayout title="Transkrypcje">
      <div className="space-y-4">
        {/* ── Filter Bar ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
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

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po numerze..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="pl-9 font-mono"
            />
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
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

        {/* ── Table ──────────────────────────────────── */}
        {!isLoading && filtered.length > 0 && (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Firma / Numer</TableHead>
                  <TableHead className="hidden md:table-cell">Numer</TableHead>
                  <TableHead>Temat</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="w-16">Czas</TableHead>
                  <TableHead className="w-28 text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((call: any) => {
                  const { Icon: DirIcon, color } = getCallIcon(call.direction, call.duration, call.status);
                  const clientName = (call.client as any)?.name;
                  const phoneDisplay = formatPhoneNumber(call.client_number);
                  const isPlaying = playingId === call.id;

                  return (
                    <TableRow
                      key={call.id}
                      className="group cursor-pointer"
                      onClick={() => openSheet(call, "ai")}
                    >
                      {/* Direction icon */}
                      <TableCell className="pr-0">
                        <DirIcon className={`h-4 w-4 ${color}`} />
                      </TableCell>

                      {/* Company / number */}
                      <TableCell>
                        <span className={`text-sm truncate block max-w-[180px] ${clientName ? "font-medium" : "font-mono text-muted-foreground"}`}>
                          {clientName || phoneDisplay}
                        </span>
                      </TableCell>

                      {/* Phone number (desktop) */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">
                          {phoneDisplay}
                        </span>
                      </TableCell>

                      {/* Subject */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                          {call.title || "Bez tytułu"}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {call.called_at
                            ? format(new Date(call.called_at), "dd.MM.yyyy, HH:mm", { locale: pl })
                            : "—"}
                        </span>
                      </TableCell>

                      {/* Duration */}
                      <TableCell>
                        <span className="text-xs font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDuration(call.duration)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Play button */}
                          {call.recording_url && (
                            <>
                              <audio
                                ref={(el) => { audioRefs.current[call.id] = el; }}
                                src={call.recording_url}
                                preload="none"
                                onEnded={() => handleAudioEnded(call.id)}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => togglePlay(call.id)}
                                title={isPlaying ? "Pauza" : "Odtwórz"}
                              >
                                {isPlaying ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </>
                          )}

                          {/* AI button */}
                          {(call.ai_summary || call.suggestions) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-purple-500 hover:text-purple-600"
                              onClick={() => openSheet(call, "ai")}
                              title="Analiza AI"
                            >
                              <Zap className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Transcription button */}
                          {call.transcription && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openSheet(call, "transcript")}
                              title="Transkrypcja"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Side panel ───────────────────────────────── */}
      <CallDetailsSheet
        call={selectedCall}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultTab={sheetTab}
      />
    </AppLayout>
  );
}
