import { AppLayout } from "@/components/layout/AppLayout";
import AdminTicketForm from "@/components/tickets/AdminTicketForm";

export default function AdminNewTicket() {
  return (
    <AppLayout title="Nowe zgłoszenie (Admin)">
      <AdminTicketForm />
    </AppLayout>
  );
}
