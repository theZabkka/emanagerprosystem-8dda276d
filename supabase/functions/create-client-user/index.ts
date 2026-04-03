import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // Verify caller via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Brak nagłówka Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Sesja wygasła lub jest nieprawidłowa" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: callerId });
    if (!isStaff) throw new Error("Brak uprawnień");

    const body = await req.json();
    const {
      email, password, first_name, last_name, phone, website, position,
      company_name, nip, company_phone, country, city, address, postal_code, voivodeship, has_retainer,
    } = body;

    if (!email || !password || !first_name || !last_name || !company_name) {
      throw new Error("Wymagane pola: email, hasło, imię, nazwisko, firma");
    }

    // AKCJA A: Create auth user FIRST
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${first_name} ${last_name}`.trim() },
    });

    if (authErr) throw new Error(`Błąd tworzenia użytkownika: ${authErr.message}`);
    const userId = authData.user.id;

    try {
      // AKCJA B: Create client (company) record
      const { data: client, error: clientErr } = await supabaseAdmin
        .from("clients")
        .insert({
          name: company_name,
          email,
          phone: company_phone || null,
          nip: nip || null,
          country: country || "Poland",
          city: city || null,
          address: address || null,
          postal_code: postal_code || null,
          voivodeship: voivodeship || null,
          contact_person: `${first_name} ${last_name}`.trim(),
          status: "active",
          has_retainer: has_retainer || false,
        })
        .select("id")
        .single();

      if (clientErr) throw new Error(`Błąd tworzenia firmy: ${clientErr.message}`);
      const clientId = client.id;

      try {
        // AKCJA C + D: Create customer_contacts with hardcoded primary + full access
        const { error: contactErr } = await supabaseAdmin
          .from("customer_contacts")
          .insert({
            customer_id: clientId,
            first_name,
            last_name,
            email,
            phone: phone || null,
            position: position || null,
            is_primary: true,
            can_view_all_tickets: true,
          });

        if (contactErr) throw new Error(`Błąd tworzenia kontaktu: ${contactErr.message}`);

        // Update profile
        const { error: profileErr } = await supabaseAdmin
          .from("profiles")
          .update({
            full_name: `${first_name} ${last_name}`.trim(),
            role: "klient",
            client_id: clientId,
            phone: phone || null,
            website: website || null,
            position: position || null,
          })
          .eq("id", userId);

        if (profileErr) console.error("Profile update error:", profileErr.message);

        // Add user_roles entry
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: "user" });

        if (roleErr) console.error("Role insert error:", roleErr.message);

        return new Response(
          JSON.stringify({ success: true, client_id: clientId, user_id: userId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (contactError) {
        // Rollback: delete client record
        await supabaseAdmin.from("clients").delete().eq("id", clientId);
        throw contactError;
      }
    } catch (innerError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw innerError;
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
