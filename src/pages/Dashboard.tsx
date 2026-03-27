import { useRole } from "@/hooks/useRole";
import { PageLoader } from "@/components/layout/PageLoader";
import StaffDashboard from "./StaffDashboard";
import ClientDashboard from "./ClientDashboard";

export default function Dashboard() {
  const { isClient, roleLoading } = useRole();

  if (roleLoading) return <PageLoader />;

  return isClient ? <ClientDashboard /> : <StaffDashboard />;
}
