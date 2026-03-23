import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash, createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Brak autoryzacji" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Nieprawidłowy token" }, 401);
    }

    // --- Read sip from body (POST) or query (GET) ---
    let sip = "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        sip = (body?.sip ?? "").toString().trim();
      } catch {
        return jsonResponse({ error: "Nieprawidłowe body JSON" }, 400);
      }
    } else {
      sip = new URL(req.url).searchParams.get("sip")?.trim() ?? "";
    }

    if (!sip) {
      return jsonResponse({ error: "Missing sip parameter" }, 400);
    }

    // --- Zadarma credentials ---
    const apiKey = Deno.env.get("ZADARMA_API_KEY");
    const apiSecret = Deno.env.get("ZADARMA_API_SECRET");
    if (!apiKey || !apiSecret) {
      return jsonResponse({ error: "Brak kluczy Zadarma" }, 500);
    }

    // --- Build Zadarma signature (node:crypto) ---
    const apiPath = "/v1/webrtc/get_key/";
    const params = new URLSearchParams({ sip });
    const paramsString = params.toString(); // "sip=504768-100"

    const md5Hash = createHash("md5").update(paramsString).digest("hex");
    const dataToSign = apiPath + paramsString + md5Hash;
    const signature = createHmac("sha1", apiSecret)
      .update(dataToSign)
      .digest("base64");

    const requestUrl = `https://api.zadarma.com${apiPath}?${paramsString}`;

    // --- Call Zadarma API ---
    let zadarmaResponse: Response;
    try {
      zadarmaResponse = await fetch(requestUrl, {
        method: "GET",
        headers: { Authorization: `${apiKey}:${signature}` },
      });
    } catch (fetchErr) {
      return jsonResponse(
        { error: "Zadarma API unreachable", details: String(fetchErr) },
        502,
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
        zadarmaResponse.status >= 400 && zadarmaResponse.status < 600
          ? zadarmaResponse.status
          : 502,
      );
    }

    if (responseData?.status !== "success" || !responseData?.key) {
      return jsonResponse(
        {
          error: responseData?.message || "Błąd API Zadarma",
          zadarma_status: responseData?.status ?? "unknown",
          zadarma: responseData,
        },
        400,
      );
    }

    return jsonResponse({ key: responseData.key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
