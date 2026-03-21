import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nip } = await req.json();
    if (!nip || !/^\d{10}$/.test(nip)) {
      return new Response(JSON.stringify({ error: "Invalid NIP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CEIDG_TOKEN = Deno.env.get("CEIDG_API_TOKEN");
    if (!CEIDG_TOKEN) {
      return new Response(JSON.stringify({ error: "CEIDG_API_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try CEIDG first
    let ceidgData = null;
    try {
      const ceidgUrl = `https://dane.biznes.gov.pl/api/ceidg/v3/firmy?nip=${nip}`;
      console.log("CEIDG v3 request:", ceidgUrl);
      const ceidgRes = await fetch(ceidgUrl, {
        headers: { Authorization: `Bearer ${CEIDG_TOKEN}` },
      });

      console.log("CEIDG status:", ceidgRes.status);

      if (ceidgRes.status === 200) {
        const ceidgJson = await ceidgRes.json();
        console.log("CEIDG response firmy count:", ceidgJson?.firmy?.length);
        
        // Find active entry first, fallback to first
        const firmy = ceidgJson?.firmy || [];
        const firma = firmy.find((f: any) => f.status === "AKTYWNY") || firmy[0];
        
        if (firma) {
          console.log("CEIDG firma nazwa:", firma.nazwa);
          const addr = firma.adresDzialalnosci || {};
          const owner = firma.wlasciciel || {};
          
          // Build street: "ul. X 3" or "ul. X 3/4"
          let street = addr.ulica || "";
          if (addr.budynek) street += ` ${addr.budynek}`;
          if (addr.lokal) street += `/${addr.lokal}`;

          ceidgData = {
            source: "ceidg",
            name: firma.nazwa || "",
            contact_person: [owner.imie, owner.nazwisko].filter(Boolean).join(" "),
            nip: owner.nip || nip,
            street: street.trim(),
            postal_code: addr.kod || "",
            city: addr.miasto || "",
            voivodeship: addr.wojewodztwo || "",
          };
        }
      } else {
        const body = await ceidgRes.text();
        console.error("CEIDG non-200:", ceidgRes.status, body);
      }
    } catch (e) {
      console.error("CEIDG lookup failed:", e);
    }

    if (ceidgData) {
      return new Response(JSON.stringify(ceidgData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to MF VAT API
    const today = new Date().toISOString().slice(0, 10);
    const mfRes = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
    
    if (!mfRes.ok) {
      return new Response(JSON.stringify({ error: "Nie znaleziono firmy" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mfJson = await mfRes.json();
    const subject = mfJson?.result?.subject;
    if (!subject) {
      return new Response(JSON.stringify({ error: "Nie znaleziono firmy" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse MF address (format: "ul. Sienkiewicza 3, 89-200 Szubin")
    const rawAddress = subject.workingAddress || subject.residenceAddress || "";
    let street = "", postal_code = "", city = "";
    const parts = rawAddress.split(",").map((s: string) => s.trim());
    if (parts.length >= 2) {
      street = parts[0];
      const cityPart = parts[1];
      const postalMatch = cityPart.match(/^(\d{2}-\d{3})\s+(.+)/);
      if (postalMatch) {
        postal_code = postalMatch[1];
        city = postalMatch[2];
      } else {
        city = cityPart;
      }
    } else if (parts.length === 1) {
      street = parts[0];
    }

    return new Response(
      JSON.stringify({
        source: "mf",
        name: subject.name || "",
        contact_person: "",
        nip,
        street,
        postal_code,
        city,
        voivodeship: "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("lookup-nip error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
