import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const event = body.event;

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
