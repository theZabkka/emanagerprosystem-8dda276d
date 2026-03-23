import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // Verify JWT — only authenticated users
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Brak autoryzacji" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Nieprawidłowy token" }, 401);
    }

    // Read sip parameter (POST body preferred, GET query fallback)
    let sip = "";
    if (req.method === "POST") {
      let body: { sip?: string } | null = null;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Nieprawidłowe body JSON" }, 400);
      }
      sip = (body?.sip ?? "").toString().trim();
    } else {
      sip = new URL(req.url).searchParams.get("sip")?.trim() ?? "";
    }

    if (!sip) {
      return jsonResponse({ error: "Missing sip parameter" }, 400);
    }

    // Build Zadarma API request for /v1/webrtc/get_key
    const apiKey = Deno.env.get("ZADARMA_API_KEY");
    const apiSecret = Deno.env.get("ZADARMA_API_SECRET");
    if (!apiKey || !apiSecret) {
      return jsonResponse({ error: "Brak kluczy Zadarma" }, 500);
    }

    const apiPath = "/v1/webrtc/get_key/";
    const paramsStr = new URLSearchParams({ sip }).toString();

    // Zadarma auth: md5(paramsString) + HMAC-SHA1 + base64
    const md5Hash = encodeHex(
      new Uint8Array(await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(paramsStr)))
    );

    const dataToSign = `${apiPath}${paramsStr}${md5Hash}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiSecret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(dataToSign)
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    const authHeaderValue = `${apiKey}:${signature}`;
    const requestUrl = `https://api.zadarma.com${apiPath}?${paramsStr}`;

    let zadarmaResponse: Response;
    try {
      zadarmaResponse = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Authorization: authHeaderValue,
        },
      });
    } catch (fetchErr) {
      return jsonResponse(
        { error: "Zadarma API unreachable", details: String(fetchErr) },
        502
      );
    }

    const responseText = await zadarmaResponse.text();
    let responseData: any = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = { raw: responseText };
    }

    if (!zadarmaResponse.ok) {
      return jsonResponse(
        {
          error: "Zadarma API error",
          status: zadarmaResponse.status,
          zadarma: responseData,
        },
        zadarmaResponse.status
      );
    }

    if (responseData?.status !== "success" || !responseData?.key) {
      return jsonResponse(
        {
          error: responseData?.message || "Błąd API Zadarma",
          status: zadarmaResponse.status,
          zadarma_status: responseData?.status ?? "unknown",
          zadarma: responseData,
        },
        400
      );
    }

    return jsonResponse({ key: responseData.key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
