import { AppLayout } from "@/components/layout/AppLayout";
import ClientTicketForm from "@/components/tickets/ClientTicketForm";

export default function ClientNewTicket() {
  return (
    <AppLayout title="Nowe zgłoszenie">
      <ClientTicketForm />
    </AppLayout>
  );
}
