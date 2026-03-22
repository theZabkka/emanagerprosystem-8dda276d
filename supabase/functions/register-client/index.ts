import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // --- PUBLIC NIP LOOKUP (no auth required) ---
    if (action === "lookup-nip") {
      const nip = (body.nip || "").replace(/[\s-]/g, "");
      if (!/^\d{10}$/.test(nip)) {
        return new Response(JSON.stringify({ error: "Nieprawidłowy NIP. Wprowadź 10 cyfr." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try CEIDG first
      const CEIDG_TOKEN = Deno.env.get("CEIDG_API_TOKEN");
      if (CEIDG_TOKEN) {
        try {
          const ceidgRes = await fetch(
            `https://dane.biznes.gov.pl/api/ceidg/v3/firmy?nip=${nip}`,
            { headers: { Authorization: `Bearer ${CEIDG_TOKEN}` } }
          );
          if (ceidgRes.status === 200) {
            const ceidgJson = await ceidgRes.json();
            const firmy = ceidgJson?.firmy || [];
            const firma = firmy.find((f: any) => f.status === "AKTYWNY") || firmy[0];
            if (firma) {
              const addr = firma.adresDzialalnosci || {};
              const owner = firma.wlasciciel || {};
              let street = addr.ulica || "";
              if (addr.budynek) street += ` ${addr.budynek}`;
              if (addr.lokal) street += `/${addr.lokal}`;

              return new Response(JSON.stringify({
                name: firma.nazwa || "",
                contact_person: [owner.imie, owner.nazwisko].filter(Boolean).join(" "),
                nip,
                street: street.trim(),
                postal_code: addr.kod || "",
                city: addr.miasto || "",
                voivodeship: addr.wojewodztwo || "",
              }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          }
        } catch (e) {
          console.error("CEIDG lookup failed:", e);
        }
      }

      // Fallback to MF VAT API
      const today = new Date().toISOString().slice(0, 10);
      const mfRes = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
      if (!mfRes.ok) {
        return new Response(JSON.stringify({ error: "Nie znaleziono firmy" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const mfJson = await mfRes.json();
      const subject = mfJson?.result?.subject;
      if (!subject) {
        return new Response(JSON.stringify({ error: "Nie znaleziono firmy" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawAddress = subject.workingAddress || subject.residenceAddress || "";
      let street = "", postal_code = "", city = "";
      const parts = rawAddress.split(",").map((s: string) => s.trim());
      if (parts.length >= 2) {
        street = parts[0];
        const postalMatch = parts[1].match(/^(\d{2}-\d{3})\s+(.+)/);
        if (postalMatch) { postal_code = postalMatch[1]; city = postalMatch[2]; }
        else { city = parts[1]; }
      } else if (parts.length === 1) { street = parts[0]; }

      return new Response(JSON.stringify({
        name: subject.name || "",
        contact_person: subject.name || "",
        nip, street, postal_code, city, voivodeship: "",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- REGISTER ---
    if (action !== "register") {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, first_name, last_name, company_name, nip: regNip, address, postal_code, city, voivodeship, phone } = body;

    if (!email || !password || !first_name || !last_name || !company_name) {
      return new Response(JSON.stringify({ error: "Wymagane pola: email, hasło, imię, nazwisko, firma" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${first_name} ${last_name}` },
    });

    if (authErr) {
      const msg = authErr.message.includes("already been registered")
        ? "Użytkownik z tym adresem e-mail już istnieje."
        : authErr.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // 2. Create client record
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .insert({
        name: company_name,
        email,
        nip: regNip || null,
        address: address || null,
        postal_code: postal_code || null,
        city: city || null,
        voivodeship: voivodeship || null,
        phone: phone || null,
        contact_person: `${first_name} ${last_name}`,
        status: "active",
      })
      .select("id")
      .single();

    if (clientErr) {
      console.error("Client create error:", clientErr.message);
      // Cleanup auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: `Błąd tworzenia klienta: ${clientErr.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Update profile (created by trigger) with role=klient and client_id
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: `${first_name} ${last_name}`,
        role: "klient",
        client_id: client.id,
        phone: phone || null,
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
    console.error("register-client error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
