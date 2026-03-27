import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/layout/PageLoader";
import TicketConversation from "@/components/tickets/TicketConversation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const STATUSES = ["Nowe", "Otwarte", "W trakcie", "Oczekiwanie na klienta", "Rozwiązane", "Zamknięte"];
const PRIORITIES = ["Niski", "Średni", "Wysoki"];

const statusConfig: Record<string, { label: string; className: string }> = {
  "Nowe": { label: "Nowe", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  "Otwarte": { label: "Otwarte", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  "W trakcie": { label: "W trakcie", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  "Oczekiwanie na klienta": { label: "Oczekiwanie na klienta", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  "Rozwiązane": { label: "Rozwiązane", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  "Zamknięte": { label: "Zamknięte", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
};

export default function AdminTicketDetails() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: staffMembers } = useStaffMembers();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, clients(name, has_retainer)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: attachments } = useQuery({
    queryKey: ["ticket-attachments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_attachments" as any)
        .select("*")
        .eq("ticket_id", id!);
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const updateField = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("tickets").update(updates as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      toast.success("Zaktualizowano");
    },
    onError: () => toast.error("Błąd aktualizacji"),
  });

  if (isLoading) return <AppLayout title="Zgłoszenie"><PageLoader /></AppLayout>;
  if (!ticket) return <AppLayout title="Zgłoszenie"><p className="text-muted-foreground p-8">Nie znaleziono zgłoszenia.</p></AppLayout>;

  const sc = statusConfig[ticket.status] ?? { label: ticket.status, className: "bg-muted text-muted-foreground" };
  const assignedStaff = staffMembers?.find((s) => s.id === ticket.assigned_to);

  return (
    <AppLayout title="Szczegóły zgłoszenia">
      <div className="max-w-5xl mx-auto">
        <Link to="/admin/tickets">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="h-4 w-4" /> Powrót do listy
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{ticket.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{ticket.department}</span>
                  <span>·</span>
                  <span>{new Date(ticket.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </CardHeader>
              <CardContent>
                <TicketConversation
                  ticketId={id!}
                  ticket={ticket}
                  originalAttachments={attachments}
                  isAdmin={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar - admin controls */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Klient</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ticket.clients?.name || "—"}</span>
                    {ticket.clients?.has_retainer && (
                      <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-1.5 py-0">STAŁA OPIEKA</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={ticket.status} onValueChange={(v) => updateField.mutate({ status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priorytet</Label>
                  <Select value={ticket.priority} onValueChange={(v) => updateField.mutate({ priority: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Przypisany do</Label>
                  <Select
                    value={ticket.assigned_to || "none"}
                    onValueChange={(v) => updateField.mutate({ assigned_to: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Nieprzypisane" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nieprzypisane</SelectItem>
                      {(staffMembers || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Utworzono: {new Date(ticket.created_at).toLocaleString("pl-PL")}</p>
                  <p>ID: <span className="font-mono">{ticket.id.slice(0, 8)}</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
