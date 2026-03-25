import { AppLayout } from "@/components/layout/AppLayout";
import TicketsTable from "@/components/tickets/TicketsTable";
import { useAuth } from "@/hooks/useAuth";

export default function ClientTickets() {
  const { profile } = useAuth();
  return (
    <AppLayout title="Moje zgłoszenia">
      <TicketsTable isAdmin={false} clientId={profile?.client_id} />
    </AppLayout>
  );
}
