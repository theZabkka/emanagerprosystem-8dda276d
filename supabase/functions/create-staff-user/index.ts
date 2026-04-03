import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_STAFF_ROLES = ["boss", "koordynator", "specjalista", "praktykant"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller via getClaims (stateless, no session needed)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Brak nagłówka Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuthClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Sesja wygasła lub jest nieprawidłowa" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    // Check caller's profile role
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (!callerProfile || !["superadmin", "boss"].includes(callerProfile.role || "")) {
      throw new Error("Tylko superadmin lub boss może dodawać pracowników");
    }

    const body = await req.json();
    const { email, password, full_name, role, department, phone, position } = body;

    if (!email || !password || !full_name) {
      throw new Error("Wymagane pola: email, hasło, imię i nazwisko");
    }

    if (!role || !VALID_STAFF_ROLES.includes(role)) {
      throw new Error(`Nieprawidłowa rola. Dozwolone: ${VALID_STAFF_ROLES.join(", ")}`);
    }

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authErr) {
      console.error("Auth create user error:", authErr.message);
      if (authErr.message?.includes("already") || authErr.message?.includes("exists")) {
        throw new Error(`Użytkownik z adresem ${email} już istnieje w systemie`);
      }
      throw new Error(`Błąd tworzenia użytkownika: ${authErr.message}`);
    }

    const userId = authData.user.id;

    // 2. Update profile
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        role,
        department: department || null,
        phone: phone || null,
        position: position || null,
        status: "active",
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("Profile update error:", profileErr.message);
    }

    // 3. Map staff role to app_role for user_roles table
    // boss -> moderator, koordynator -> moderator, specjalista/praktykant -> user
    let appRole = "user";
    if (role === "boss") appRole = "moderator";
    if (role === "koordynator") appRole = "moderator";

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: appRole });

    if (roleErr) {
      console.error("Role insert error:", roleErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
