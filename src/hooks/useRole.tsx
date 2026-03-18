import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useDataSource } from "./useDataSource";
import { supabase } from "@/integrations/supabase/client";
import { mockPermissions } from "@/lib/mockData";

export type AppRoleName = "boss" | "koordynator" | "specjalista" | "praktykant" | "klient";

export const ROLE_LABELS: Record<AppRoleName, string> = {
  boss: "BOSS",
  koordynator: "Koordynator",
  specjalista: "Specjalista",
  praktykant: "Praktykant",
  klient: "Klient",
};

export const STAFF_ROLES: AppRoleName[] = ["boss", "koordynator", "specjalista", "praktykant"];

interface Permission {
  role_name: string;
  module_name: string;
  can_view: boolean;
}

interface RoleContextType {
  currentRole: AppRoleName;
  isClient: boolean;
  clientId: string | null;
  permissions: Permission[];
  setPermissions: React.Dispatch<React.SetStateAction<Permission[]>>;
  canViewModule: (moduleName: string) => boolean;
  refreshPermissions: () => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { isDemo } = useDataSource();
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Derive role from profile
  const currentRole: AppRoleName = (profile?.role as AppRoleName) || "specjalista";
  const isClient = currentRole === "klient";
  const clientId = (profile as any)?.client_id || null;

  const fetchPermissions = useCallback(async () => {
    if (isDemo) {
      setPermissions(mockPermissions);
      return;
    }
    const { data } = await supabase.from("role_permissions").select("role_name, module_name, can_view");
    if (data) setPermissions(data as Permission[]);
  }, [isDemo]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const canViewModule = useCallback((moduleName: string) => {
    if (currentRole === "boss") return true;
    if (currentRole === "klient") return false;
    const perm = permissions.find(p => p.role_name === currentRole && p.module_name === moduleName);
    return perm?.can_view ?? true;
  }, [currentRole, permissions]);

  return (
    <RoleContext.Provider value={{
      currentRole,
      isClient,
      clientId,
      permissions,
      setPermissions,
      canViewModule,
      refreshPermissions: fetchPermissions,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
