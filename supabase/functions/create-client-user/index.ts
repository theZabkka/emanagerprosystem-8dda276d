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
    if (!authHeader) throw new Error("Brak autoryzacji");

    // Wyciągnięcie czystego tokenu JWT
    const token = authHeader.replace("Bearer ", "").trim();

    // Bezpośrednia weryfikacja przez Admin API
    const { data: { user: caller }, error: verifyErr } = await supabaseAdmin.auth.getUser(token);

    if (verifyErr || !caller) {
      console.error("Błąd weryfikacji tokenu admina:", verifyErr);
      throw new Error("Nie można zweryfikować użytkownika lub sesja wygasła.");
    }

    const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: caller.id });
    if (!isStaff) throw new Error("Brak uprawnień");

    const body = await req.json();
    const {
      email, password, first_name, last_name, phone, website, position,
      company_name, nip, company_phone, country, city, address, postal_code, voivodeship,
    } = body;

    if (!email || !password || !first_name || !last_name || !company_name) {
      throw new Error("Wymagane pola: email, hasło, imię, nazwisko, firma");
    }

    // 1. Create client record
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .insert({
        name: company_name,
        email: email,
        phone: company_phone || null,
        nip: nip || null,
        country: country || "Poland",
        city: city || null,
        address: address || null,
        postal_code: postal_code || null,
        voivodeship: voivodeship || null,
        status: "active",
      })
      .select("id")
      .single();

    if (clientErr) throw new Error(`Błąd tworzenia klienta: ${clientErr.message}`);

    // 2. Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${first_name} ${last_name}` },
    });

    if (authErr) {
      // Cleanup client
      await supabaseAdmin.from("clients").delete().eq("id", client.id);
      throw new Error(`Błąd tworzenia użytkownika: ${authErr.message}`);
    }

    const userId = authData.user.id;

    // 3. Update profile with extra fields
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: `${first_name} ${last_name}`,
        role: "klient",
        client_id: client.id,
        phone: phone || null,
        website: website || null,
        position: position || null,
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("Profile update error:", profileErr.message);
    }

    // 4. Add user_roles entry
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });

    if (roleErr) {
      console.error("Role insert error:", roleErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, client_id: client.id, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
