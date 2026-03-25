import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.21.0";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("INBOUND_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("Missing INBOUND_WEBHOOK_SECRET environment variable.");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response(JSON.stringify({ error: "Missing svix headers" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  let body: any;

  try {
    const wh = new Webhook(webhookSecret);
    body = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Unauthorized - Invalid Signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Ignorowanie eventów systemowych (np. ping od Resend)
    const eventType = body.type;
    if (eventType !== "email.received") {
      console.log("Ignorowanie eventu systemowego:", eventType);
      return new Response(JSON.stringify({ ok: true, message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Rozpakowanie "koperty" Resend
    const emailData = body.data || body;

    // 3. Inicjalizacja Resend SDK i pobranie pełnej treści maila
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    let description = "";
    let subject = emailData.subject || "(Brak tematu)";

    if (emailData.email_id) {
      try {
        const { data: fullEmail, error: emailErr } = await resend.emails.receiving.get(emailData.email_id);
        if (!emailErr && fullEmail) {
          description = fullEmail.html || fullEmail.text || "";
          if (fullEmail.subject) {
            subject = fullEmail.subject;
          }
        } else {
          console.error("Błąd pobierania pełnego maila z Resend:", emailErr);
          // Fallback do danych z webhooka
          description = emailData.html || emailData.text || "";
        }
      } catch (fetchErr) {
        console.error("Wyjątek przy pobieraniu maila z Resend SDK:", fetchErr);
        description = emailData.html || emailData.text || "";
      }
    } else {
      description = emailData.html || emailData.text || "";
    }

    // 4. Ekstrakcja nadawcy
    const rawFrom: string = emailData.from || emailData.from_email || "";

    if (!rawFrom) {
      console.error("Brak nadawcy w payloadzie:", emailData);
      return new Response(
        JSON.stringify({ error: "Missing sender email in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailMatch = rawFrom.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : rawFrom.trim().toLowerCase();

    // 5. Szukanie lub tworzenie klienta
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("email", senderEmail)
      .maybeSingle();

    let clientId: string;

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientErr } = await supabaseAdmin
        .from("clients")
        .insert({
          name: senderEmail.split("@")[0],
          email: senderEmail,
          is_auto_created: true,
        })
        .select("id")
        .single();

      if (clientErr || !newClient) {
        console.error("Failed to create stub client:", clientErr);
        return new Response(
          JSON.stringify({ error: "Failed to create client", details: clientErr?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      clientId = newClient.id;
    }

    // 6. Tworzenie zgłoszenia
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from("tickets")
      .insert({
        title: subject,
        description,
        client_id: clientId,
        department: "Zgłoszenia problemów",
        status: "Nowe",
        priority: "Średni",
      })
      .select("id")
      .single();

    if (ticketErr || !ticket) {
      console.error("Failed to create ticket:", ticketErr);
      return new Response(
        JSON.stringify({ error: "Failed to create ticket", details: ticketErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Pobieranie i wgrywanie załączników
    if (emailData.email_id) {
      try {
        const { data: attachments } = await resend.emails.receiving.attachments.list({
          emailId: emailData.email_id,
        });

        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            try {
              const fileRes = await fetch(att.download_url);
              if (!fileRes.ok) {
                console.error(`Nie udało się pobrać załącznika ${att.filename}: HTTP ${fileRes.status}`);
                continue;
              }
              const buffer = await fileRes.arrayBuffer();

              const filePath = `${ticket.id}/${crypto.randomUUID()}-${att.filename}`;

              const { error: uploadErr } = await supabaseAdmin.storage
                .from("ticket_attachments")
                .upload(filePath, buffer, {
                  contentType: att.content_type,
                  upsert: false,
                });

              if (uploadErr) {
                console.error(`Błąd uploadu załącznika ${att.filename}:`, uploadErr);
                continue;
              }

              const { data: publicUrlData } = supabaseAdmin.storage
                .from("ticket_attachments")
                .getPublicUrl(filePath);

              await supabaseAdmin.from("ticket_attachments").insert({
                ticket_id: ticket.id,
                file_name: att.filename,
                file_url: publicUrlData.publicUrl,
              });

              console.log(`Załącznik wgrany: ${att.filename} -> ${filePath}`);
            } catch (attErr) {
              console.error(`Wyjątek przy przetwarzaniu załącznika ${att.filename}:`, attErr);
            }
          }
        }
      } catch (attListErr) {
        console.error("Błąd pobierania listy załączników z Resend:", attListErr);
      }
    }

    console.log(`Ticket created: ${ticket.id} for client: ${clientId} from: ${senderEmail}`);

    return new Response(
      JSON.stringify({ ok: true, ticket_id: ticket.id, client_id: clientId }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Inbound ticket webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
