import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STAFF_ROLES = ["superadmin", "boss", "koordynator", "specjalista", "praktykant"];

export interface StaffMember {
  id: string;
  full_name: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  department?: string | null;
  status?: string | null;
}

/**
 * Single source of truth for fetching assignable staff members.
 * Filters out clients and inactive users.
 */
export function useStaffMembers() {
  return useQuery<StaffMember[]>({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url, department, status")
        .in("role", STAFF_ROLES)
        .order("full_name");

      if (error) throw error;
      return (data || []).filter((p) => p.status !== "inactive");
    },
    staleTime: 5 * 60 * 1000,
  });
}
