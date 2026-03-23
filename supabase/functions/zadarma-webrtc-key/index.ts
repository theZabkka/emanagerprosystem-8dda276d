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
    const md5Data = new TextEncoder().encode(paramsStr);
    const md5Hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("MD5", md5Data))
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

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
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

    const authHeaderValue = `${apiKey}:${signature}`;

    const response = await fetch(
      `https://api.zadarma.com${apiPath}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeaderValue,
        },
      }
    );

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message || "Błąd API Zadarma");
    }

    return new Response(JSON.stringify({ key: data.webrtc_key }), {
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
