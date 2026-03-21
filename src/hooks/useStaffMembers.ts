import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockProfiles } from "@/lib/mockData";

const STAFF_ROLES = ["boss", "koordynator", "specjalista", "praktykant"];

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
 * Use everywhere a staff/employee dropdown is needed.
 */
export function useStaffMembers() {
  const { isDemo } = useDataSource();

  return useQuery<StaffMember[]>({
    queryKey: ["staff-members", isDemo],
    queryFn: async () => {
      if (isDemo) {
        return mockProfiles.filter(p => STAFF_ROLES.includes(p.role));
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url, department, status")
        .in("role", STAFF_ROLES)
        .order("full_name");

      if (error) throw error;
      // Keep everyone except explicitly inactive
      return (data || []).filter((p) => p.status !== "inactive");
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
