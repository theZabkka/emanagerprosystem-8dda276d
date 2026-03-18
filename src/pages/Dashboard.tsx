import { useRole } from "@/hooks/useRole";
import StaffDashboard from "./StaffDashboard";
import ClientDashboard from "./ClientDashboard";

export default function Dashboard() {
  const { isClient } = useRole();
  return isClient ? <ClientDashboard /> : <StaffDashboard />;
}
