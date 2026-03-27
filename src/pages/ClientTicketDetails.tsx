import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageLoader } from "@/components/layout/PageLoader";
import TicketConversation from "@/components/tickets/TicketConversation";
import { ArrowLeft } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  "Nowe": { label: "Nowe", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  "Otwarte": { label: "Otwarte", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  "W trakcie": { label: "W trakcie", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  "Oczekiwanie na klienta": { label: "Oczekiwanie na klienta", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  "Rozwiązane": { label: "Rozwiązane", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  "Zamknięte": { label: "Zamknięte", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
};

export default function ClientTicketDetails() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id!)
        .eq("client_id", profile?.client_id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id && !!profile?.client_id,
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

  if (isLoading) return <AppLayout title="Zgłoszenie"><PageLoader /></AppLayout>;
  if (!ticket) return <AppLayout title="Zgłoszenie"><p className="text-muted-foreground p-8">Nie znaleziono zgłoszenia.</p></AppLayout>;

  const sc = statusConfig[ticket.status] ?? { label: ticket.status, className: "bg-muted text-muted-foreground" };

  return (
    <AppLayout title="Szczegóły zgłoszenia">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/client/tickets">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-2">
            <ArrowLeft className="h-4 w-4" /> Powrót do listy
          </Button>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm px-2 py-0.5">
                  #{String(ticket.ticket_number ?? '').padStart(4, '0')}
                </Badge>
                <CardTitle className="text-lg">{ticket.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{ticket.department}</span>
                <span>·</span>
                <span>{new Date(ticket.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <Badge variant="secondary" className={sc.className}>{sc.label}</Badge>
          </CardHeader>
          <CardContent>
            <TicketConversation
              ticketId={id!}
              ticket={ticket}
              originalAttachments={attachments}
              isAdmin={false}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
