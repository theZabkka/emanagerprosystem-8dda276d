import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash, createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonOk(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth via getClaims ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonOk({ error: true, message: "Brak autoryzacji" });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonOk({ error: true, message: "Nieprawidłowy token" });
    }

    // --- Read sip from POST body ---
    let sip = "";
    try {
      const body = await req.json();
      sip = (body?.sip ?? "").toString().trim();
    } catch {
      return jsonOk({ error: true, message: "Nieprawidłowe body JSON" });
    }

    if (!sip) {
      return jsonOk({ error: true, message: "Missing sip parameter" });
    }

    // --- Zadarma credentials ---
    const apiKey = Deno.env.get("ZADARMA_API_KEY");
    const apiSecret = Deno.env.get("ZADARMA_API_SECRET");
    if (!apiKey || !apiSecret) {
      return jsonOk({ error: true, message: "Brak kluczy Zadarma na serwerze" });
    }

    // --- Build Zadarma signature (node:crypto) ---
    const apiPath = "/v1/webrtc/get_key/";
    const params = new URLSearchParams({ sip });
    const paramsString = params.toString();

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
      return jsonOk({
        error: true,
        message: "Zadarma API unreachable",
        details: String(fetchErr),
      });
    }

    // Always read response body safely
    const responseText = await zadarmaResponse.text();
    let responseData: any = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = { raw: responseText };
    }

    // Non-200 from Zadarma — return as normal JSON (status 200) so frontend doesn't crash
    if (!zadarmaResponse.ok) {
      return jsonOk({
        error: true,
        message: "Zadarma API error",
        zadarma_status: zadarmaResponse.status,
        zadarma: responseData,
      });
    }

    if (responseData?.status !== "success" || !responseData?.key) {
      return jsonOk({
        error: true,
        message: responseData?.message || "Błąd API Zadarma",
        zadarma: responseData,
      });
    }

    // Success
    return jsonOk({ key: responseData.key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonOk({ error: true, message });
  }
});
