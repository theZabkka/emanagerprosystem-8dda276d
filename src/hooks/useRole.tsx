import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth, ContactPermissions } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppRoleName = "superadmin" | "boss" | "koordynator" | "specjalista" | "praktykant" | "klient";

export const ROLE_LABELS: Record<AppRoleName, string> = {
  superadmin: "SUPERADMIN",
  boss: "BOSS",
  koordynator: "Koordynator",
  specjalista: "Specjalista",
  praktykant: "Praktykant",
  klient: "Klient",
};

export const STAFF_ROLES: AppRoleName[] = ["superadmin", "boss", "koordynator", "specjalista", "praktykant"];

interface Permission {
  role_name: string;
  module_name: string;
  can_view: boolean;
}

interface RoleContextType {
  currentRole: AppRoleName;
  roleLoading: boolean;
  isClient: boolean;
  clientId: string | null;
  permissions: Permission[];
  setPermissions: React.Dispatch<React.SetStateAction<Permission[]>>;
  canViewModule: (moduleName: string) => boolean;
  refreshPermissions: () => void;
  isPrimaryContact: boolean;
  contactPermissions: ContactPermissions;
  hasContactPermission: (key: string) => boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { session, profile, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Only keep loading if auth is loading, or if we have a session but profile hasn't arrived yet
  const roleLoading = authLoading || (!!session && !profile);
  const currentRole: AppRoleName = (profile?.role as AppRoleName) || "specjalista";
  const isClient = currentRole === "klient";
  const clientId = (profile as any)?.client_id || null;
  const isPrimaryContact = profile?.is_primary_contact ?? false;
  const contactPermissions: ContactPermissions = profile?.contact_permissions ?? {};

  const hasContactPermission = useCallback((key: string) => {
    if (!isClient) return true;
    if (isPrimaryContact) return true;
    return contactPermissions[key] === true;
  }, [isClient, isPrimaryContact, contactPermissions]);

  const fetchPermissions = useCallback(async () => {
    const { data } = await supabase.from("role_permissions").select("role_name, module_name, can_view");
    if (data) setPermissions(data as Permission[]);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const canViewModule = useCallback((moduleName: string) => {
    if (currentRole === "superadmin" || currentRole === "boss") return true;
    if (currentRole === "klient") return false;
    const perm = permissions.find(p => p.role_name === currentRole && p.module_name === moduleName);
    return perm?.can_view ?? true;
  }, [currentRole, permissions]);

  return (
    <RoleContext.Provider value={{
      currentRole, roleLoading, isClient, clientId, permissions, setPermissions, canViewModule, refreshPermissions: fetchPermissions,
      isPrimaryContact, contactPermissions, hasContactPermission,
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
