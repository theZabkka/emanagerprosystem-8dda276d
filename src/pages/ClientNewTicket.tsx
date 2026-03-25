import { AppLayout } from "@/components/layout/AppLayout";
import TicketForm from "@/components/tickets/TicketForm";

export default function ClientNewTicket() {
  return (
    <AppLayout title="Nowe zgłoszenie">
      <TicketForm isAdmin={false} />
    </AppLayout>
  );
}
