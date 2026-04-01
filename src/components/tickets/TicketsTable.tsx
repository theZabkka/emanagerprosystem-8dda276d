import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, Plus } from "lucide-react";

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; className: string }> = {
  "Nowe": { label: "Nowe", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  "Otwarte": { label: "Otwarte", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  "W trakcie": { label: "W trakcie", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  "Zamknięte": { label: "Zamknięte", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
};

interface TicketsTableProps {
  isAdmin: boolean;
  clientId?: string | null;
  isPrimaryContact?: boolean;
  contactId?: string | null;
}

export default function TicketsTable({ isAdmin, clientId }: TicketsTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", isAdmin, clientId, page],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*, clients(name, has_retainer)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (!isAdmin && clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { tickets: data ?? [], count: count ?? 0 };
    },
    enabled: isAdmin || !!clientId,
  });

  const tickets = data?.tickets ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.toLowerCase();
    return tickets.filter((t: any) => {
      const title = (t.title ?? "").toLowerCase();
      const clientName = (t.clients?.name ?? "").toLowerCase();
      const ticketNum = '#' + String(t.ticket_number ?? '').padStart(4, '0');
      return title.includes(q) || clientName.includes(q) || ticketNum.includes(q);
    });
  }, [tickets, search]);

  const isHighlighted = (status: string) => status === "Nowe" || status === "Otwarte";

  if (isLoading) return <TableSkeleton columns={isAdmin ? 6 : 5} rows={8} />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {isAdmin && (
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po temacie lub kliencie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        <Link to={isAdmin ? "/admin/tickets/new" : "/client/tickets/new"} className="ml-auto">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nowe zgłoszenie
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Numer</TableHead>
              <TableHead>Temat</TableHead>
              <TableHead className="hidden md:table-cell">Departament</TableHead>
              {isAdmin && <TableHead>Klient</TableHead>}
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-36 hidden sm:table-cell">Data utworzenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-muted-foreground">
                  Brak zgłoszeń
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((ticket: any) => {
                const highlighted = isHighlighted(ticket.status);
                const sc = statusConfig[ticket.status] ?? { label: ticket.status, className: "bg-muted text-muted-foreground" };
                return (
                  <TableRow
                    key={ticket.id}
                    className={highlighted ? "bg-red-50 dark:bg-red-950/30" : ""}
                  >
                    <TableCell className="text-xs font-mono font-semibold text-primary">
                      #{String(ticket.ticket_number ?? '').padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={isAdmin ? `/admin/tickets/${ticket.id}` : `/client/tickets/${ticket.id}`}
                        className={`hover:underline text-sm ${highlighted ? "font-bold" : "font-medium"}`}
                      >
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                      {ticket.department}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="text-sm">{ticket.clients?.name ?? "—"}</div>
                        {ticket.clients?.has_retainer && (
                          <Badge className="mt-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] px-1.5 py-0">
                            STAŁA OPIEKA
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${sc.className}`}>
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-muted-foreground">
            {totalCount} zgłoszeń · Strona {page + 1} z {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
