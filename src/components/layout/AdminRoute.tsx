import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { PageLoader } from "@/components/layout/PageLoader";

const ADMIN_ROLES = ["superadmin", "boss", "koordynator"];

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { session, loading } = useAuth();
  const { currentRole, roleLoading } = useRole();

  if (loading || roleLoading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!ADMIN_ROLES.includes(currentRole)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
