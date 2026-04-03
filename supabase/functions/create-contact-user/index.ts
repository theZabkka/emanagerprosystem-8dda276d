import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Brak nagłówka Authorization");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const { data: { user: caller }, error: verifyErr } = await supabaseAuth.auth.getUser();
    if (verifyErr || !caller) throw new Error("Sesja wygasła lub jest nieprawidłowa");

    const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: caller.id });
    if (!isStaff) throw new Error("Brak uprawnień");

    const body = await req.json();
    const { email, password, first_name, last_name, phone, position, client_id, is_primary, can_view_all_tickets } = body;

    if (!email || !password) throw new Error("Email i hasło są wymagane");
    if (!client_id) throw new Error("Brak ID klienta");
    if (!first_name && !last_name) throw new Error("Podaj imię lub nazwisko");

    // 1. Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      throw new Error("Użytkownik z tym adresem e-mail już istnieje w systemie");
    }

    // 2. If setting as primary, unset others
    if (is_primary) {
      await supabaseAdmin
        .from("customer_contacts")
        .update({ is_primary: false })
        .eq("customer_id", client_id)
        .eq("is_primary", true);
    }

    // 3. Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${first_name} ${last_name}`.trim() },
    });

    if (authErr) throw new Error(`Błąd tworzenia użytkownika: ${authErr.message}`);

    const userId = authData.user.id;

    // 4. Create customer_contacts entry with new flag model
    const resolvedCanViewAll = is_primary ? true : (can_view_all_tickets ?? true);

    const { error: contactErr } = await supabaseAdmin
      .from("customer_contacts")
      .insert({
        customer_id: client_id,
        first_name: first_name || "",
        last_name: last_name || "",
        email,
        phone: phone || null,
        position: position || null,
        is_primary: is_primary || false,
        can_view_all_tickets: resolvedCanViewAll,
      });

    if (contactErr) {
      console.error("Contact insert error:", contactErr.message);
    }

    // 5. Update profile with client_id and role
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: `${first_name} ${last_name}`.trim(),
        role: "klient",
        client_id: client_id,
        phone: phone || null,
        position: position || null,
      })
      .eq("id", userId);

    if (profileErr) console.error("Profile update error:", profileErr.message);

    // 6. Add user_roles entry
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });

    if (roleErr) console.error("Role insert error:", roleErr.message);

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
