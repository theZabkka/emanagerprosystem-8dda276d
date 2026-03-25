import { AppLayout } from "@/components/layout/AppLayout";
import TicketsTable from "@/components/tickets/TicketsTable";

export default function AdminTickets() {
  return (
    <AppLayout title="Zgłoszenia">
      <TicketsTable isAdmin={true} />
    </AppLayout>
  );
}
