import { AppLayout } from "@/components/layout/AppLayout";
import TicketsTable from "@/components/tickets/TicketsTable";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";

export default function ClientTickets() {
  const { profile } = useAuth();
  const { hasContactPermission } = useRole();

  if (!hasContactPermission("support")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout title="Moje zgłoszenia">
      <TicketsTable isAdmin={false} clientId={profile?.client_id} />
    </AppLayout>
  );
}
