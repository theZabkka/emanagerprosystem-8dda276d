import { AppLayout } from "@/components/layout/AppLayout";
import TicketForm from "@/components/tickets/TicketForm";

export default function AdminNewTicket() {
  return (
    <AppLayout title="Nowe zgłoszenie (Admin)">
      <TicketForm isAdmin={true} />
    </AppLayout>
  );
}
