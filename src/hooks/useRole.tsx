import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
  simulatedRole: AppRoleName;
  setSimulatedRole: (role: AppRoleName) => void;
  isClient: boolean;
  permissions: Permission[];
  setPermissions: React.Dispatch<React.SetStateAction<Permission[]>>;
  canViewModule: (moduleName: string) => boolean;
  refreshPermissions: () => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

const STORAGE_KEY = "emanager-simulated-role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useDataSource();
  const [simulatedRole, setSimulatedRoleState] = useState<AppRoleName>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as AppRoleName) || "boss";
    } catch {
      return "boss";
    }
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const setSimulatedRole = (role: AppRoleName) => {
    setSimulatedRoleState(role);
    try { localStorage.setItem(STORAGE_KEY, role); } catch {}
  };

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
    if (simulatedRole === "boss") return true;
    if (simulatedRole === "klient") return false; // client uses separate sidebar
    const perm = permissions.find(p => p.role_name === simulatedRole && p.module_name === moduleName);
    return perm?.can_view ?? true;
  }, [simulatedRole, permissions]);

  return (
    <RoleContext.Provider value={{
      simulatedRole,
      setSimulatedRole,
      isClient: simulatedRole === "klient",
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
