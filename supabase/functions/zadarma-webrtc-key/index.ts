import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

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
    // Verify JWT — only authenticated users
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Brak autoryzacji");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Nieprawidłowy token");

    // Build Zadarma API request for /v1/webrtc/get_key
    const apiKey = Deno.env.get("ZADARMA_API_KEY");
    const apiSecret = Deno.env.get("ZADARMA_API_SECRET");
    if (!apiKey || !apiSecret) throw new Error("Brak kluczy Zadarma");

    const apiPath = "/v1/webrtc/get_key/";

    // Zadarma auth: sort params, md5, hmac-sha1
    // For GET with no params, paramsStr is empty
    const paramsStr = "";
    const md5Hash = encodeHex(
      new Uint8Array(await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(paramsStr)))
    );

    const signData = apiPath + paramsStr + md5Hash;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiSecret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signData)
    );
    // Zadarma expects base64(hex(hmac_sha1)), not base64(binary(hmac_sha1))
    const hmacHex = encodeHex(new Uint8Array(sig));
    const signature = btoa(hmacHex);

    const authHeaderValue = `${apiKey}:${signature}`;

    let response: Response;
    try {
      response = await fetch(
        `https://api.zadarma.com${apiPath}`,
        {
          method: "GET",
          headers: {
            Authorization: authHeaderValue,
          },
        }
      );
    } catch (fetchErr) {
      return new Response(
        JSON.stringify({ error: "Zadarma API unreachable", details: String(fetchErr) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Zadarma API error", status: response.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (data.status !== "success") {
      return new Response(
        JSON.stringify({ error: data.message || "Błąd API Zadarma", zadarma_status: data.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ key: data.key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
