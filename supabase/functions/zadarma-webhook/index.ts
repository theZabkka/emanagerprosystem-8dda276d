import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyZadarmaSignature(
  body: string,
  signature: string | null,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  if (!signature) {
    console.warn("No signature provided, skipping verification");
    return true; // Allow unsigned requests for now during development
  }

  try {
    const params = JSON.parse(body);
    const sortedKeys = Object.keys(params).sort();
    const pairs = sortedKeys.map(
      (k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? "")}`
    );
    const paramsStr = pairs.join("&");

    // Zadarma signature: base64(hmac_sha1(params_string + md5(params_string), secret))
    const md5Buf = await crypto.subtle.digest(
      "MD5",
      new TextEncoder().encode(paramsStr)
    );
    const md5Hex = Array.from(new Uint8Array(md5Buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const signData = paramsStr + md5Hex;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiSecret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signData));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

    return computed === signature;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  // Zadarma webhook verification - echo back zd_echo parameter
  if (req.method === "GET") {
    const url = new URL(req.url);
    const zdEcho = url.searchParams.get("zd_echo");
    if (zdEcho) {
      return new Response(zdEcho, { status: 200 });
    }
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const event = body.event;

    // Verify signature if keys are configured
    const zadarmaKey = Deno.env.get("ZADARMA_API_KEY");
    const zadarmaSecret = Deno.env.get("ZADARMA_API_SECRET");
    if (zadarmaKey && zadarmaSecret) {
      const signature = req.headers.get("Signature");
      const valid = await verifyZadarmaSignature(rawBody, signature, zadarmaKey, zadarmaSecret);
      if (!valid) {
        console.error("Invalid Zadarma signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Only process NOTIFY_END events
    if (event !== "NOTIFY_END") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      call_id,
      caller_id,
      called_did,
      duration,
      disposition,
      recording: recording_url,
      call_start,
    } = body;

    // Insert the call record first
    const { data: callRecord, error: insertErr } = await supabaseAdmin
      .from("calls")
      .insert({
        zadarma_call_id: call_id?.toString(),
        caller_number: caller_id,
        callee_number: called_did,
        duration: parseInt(duration) || 0,
        recording_url: recording_url || null,
        direction: body.direction === "outbound" ? "outbound" : "inbound",
        called_at: call_start || new Date().toISOString(),
        status: disposition === "answered" ? "completed" : "missed",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert call error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If there's a recording, process with Groq API
    if (recording_url) {
      try {
        const groqKey = Deno.env.get("GROQ_API_KEY");
        if (!groqKey) throw new Error("GROQ_API_KEY not configured");

        // Step 1: Download audio file
        const audioResponse = await fetch(recording_url);
        if (!audioResponse.ok) throw new Error(`Failed to download recording: ${audioResponse.status}`);
        const audioBlob = await audioResponse.blob();

        // Step 2: Transcribe with Groq Whisper
        const transcriptionForm = new FormData();
        transcriptionForm.append("file", audioBlob, "recording.mp3");
        transcriptionForm.append("model", "whisper-large-v3");
        transcriptionForm.append("language", "pl");

        const transcriptionRes = await fetch(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${groqKey}` },
            body: transcriptionForm,
          }
        );

        if (!transcriptionRes.ok) {
          const errText = await transcriptionRes.text();
          throw new Error(`Groq transcription error: ${transcriptionRes.status} - ${errText}`);
        }

        const transcriptionData = await transcriptionRes.json();
        const transcription = transcriptionData.text || "";

        // Step 3: Summarize with Groq Llama 3
        let aiSummary = "";
        if (transcription.length > 10) {
          const summaryRes = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${groqKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  {
                    role: "system",
                    content:
                      "Jesteś asystentem CRM. Przeczytaj transkrypcję rozmowy z klientem. Zwróć tylko dwie sekcje: 'Podsumowanie:' (2-3 zdania) oraz 'Następne kroki:' (krótka lista w punktach).",
                  },
                  { role: "user", content: transcription },
                ],
                temperature: 0.3,
                max_tokens: 500,
              }),
            }
          );

          if (!summaryRes.ok) {
            const errText = await summaryRes.text();
            throw new Error(`Groq summary error: ${summaryRes.status} - ${errText}`);
          }

          const summaryData = await summaryRes.json();
          aiSummary = summaryData.choices?.[0]?.message?.content || "";
        }

        // Step 4: Update call record
        await supabaseAdmin
          .from("calls")
          .update({ transcription, ai_summary: aiSummary })
          .eq("id", callRecord.id);

      } catch (aiErr) {
        console.error("Groq API error:", aiErr);
        // Save error note but don't fail the webhook
        await supabaseAdmin
          .from("calls")
          .update({
            error_note: `Błąd API Groq - nie udało się wygenerować transkrypcji: ${aiErr.message}`,
          })
          .eq("id", callRecord.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, call_id: callRecord.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
