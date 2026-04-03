import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactPermissions {
  support?: boolean;
  invoices?: boolean;
  projects?: boolean;
  contracts?: boolean;
  estimates?: boolean;
  [key: string]: boolean | undefined;
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  department: string | null;
  client_id: string | null;
  zadarma_sip_login: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_phone?: string | null;
  contact_position?: string | null;
  is_contact?: boolean;
  is_primary_contact?: boolean;
  contact_permissions?: ContactPermissions;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        // Global fallback: on SIGNED_OUT force redirect to login
        if (event === "SIGNED_OUT") {
          queryClient.clear();
          navigate("/login", { replace: true });
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, queryClient]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, avatar_url, department, client_id, zadarma_sip_login")
      .eq("id", userId)
      .single();
    if (!data) return;

    const profileData = data as ProfileData;

    // If client role, try to fetch contact data for proper name display
    if (profileData.role === "klient" && profileData.client_id) {
      const { data: contactData } = await supabase
        .from("customer_contacts")
        .select("first_name, last_name, phone, position, is_primary, permissions, customer_id")
        .eq("id", userId)
        .maybeSingle();

      if (contactData) {
        profileData.contact_first_name = contactData.first_name;
        profileData.contact_last_name = contactData.last_name;
        profileData.contact_phone = contactData.phone;
        profileData.contact_position = contactData.position;
        profileData.is_contact = true;
        profileData.is_primary_contact = contactData.is_primary;
        profileData.contact_permissions = (contactData.permissions as ContactPermissions) || {};
        // Override client_id with the actual company ID from customer_contacts
        if (contactData.customer_id) {
          profileData.client_id = contactData.customer_id;
        }
        // Override full_name with contact's personal name
        const contactName = `${contactData.first_name || ""} ${contactData.last_name || ""}`.trim();
        if (contactName) {
          profileData.full_name = contactName;
        }
      }
    }

    setProfile(profileData);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut error:", e);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    queryClient.clear();
    // Hard redirect — window.location guarantees navigation even if React router state is stale
    window.location.href = "/login";
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
