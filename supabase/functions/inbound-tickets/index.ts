import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.21.0";

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
    // 1. Ignorowanie eventów systemowych
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

    // 3. Pobranie treści wiadomości z API Inbound Resend
    const emailId = emailData.email_id;
    const subject = emailData.subject || "(Brak tematu)";

    let description = "(Trwa pobieranie treści...)";

    if (emailId) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        const bodyRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (bodyRes.ok) {
          const resJson = await bodyRes.json();
          const fullEmailData = resJson.data || resJson;

          const htmlBody = fullEmailData.html || "";
          const textBody = fullEmailData.text || "";
          description = htmlBody || textBody || "(Brak treści wiadomości)";

          console.log(`Pomyślnie pobrano treść z API. Długość: ${description.length} znaków.`);
        } else {
          console.error(`Błąd API przy pobieraniu treści: ${bodyRes.status} ${await bodyRes.text()}`);
          description = "(Błąd podczas pobierania treści wiadomości z serwera Resend)";
        }
      } catch (err) {
        console.error("Błąd sieci przy pobieraniu treści:", err);
        description = "(Błąd sieci podczas pobierania treści z Resend)";
      }
    } else {
      console.warn("Brak email_id w payloadzie, nie można pobrać treści.");
      description = "(Brak ID wiadomości)";
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

    // 7. Pobranie załączników przez dedykowany endpoint Inbound Resend
    const attachmentsMetadata = emailData.attachments || [];
    // emailId already declared above

    if (attachmentsMetadata.length > 0 && emailId) {
      console.log(`Mail ${emailId} posiada ${attachmentsMetadata.length} załączników. Uderzam do API Inbound Resend...`);

      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) throw new Error("Brak klucza RESEND_API_KEY");

        // KROK 1: Uderzenie w prawidłowy endpoint INBOUND
        const apiRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!apiRes.ok) {
           throw new Error(`Błąd API Inbound Resend: ${apiRes.status} ${await apiRes.text()}`);
        }

        const apiData = await apiRes.json();
        const fullAttachments = apiData.data || [];

        // KROK 2: Pobranie plików przez udostępnione linki CDN
        for (const att of fullAttachments) {
          if (!att.download_url) {
            console.warn(`Załącznik ${att.filename} nie posiada download_url. Pomijam.`);
            continue;
          }

          console.log(`Pobieranie fizycznego pliku: ${att.filename}...`);
          const fileRes = await fetch(att.download_url);
          
          if (!fileRes.ok) {
            console.error(`Błąd pobierania pliku ${att.filename} z serwera CDN Resend.`);
            continue;
          }

          const arrayBuffer = await fileRes.arrayBuffer();
          const fileData = new Uint8Array(arrayBuffer);

          const fileNameSafe = att.filename ? att.filename.replace(/[^a-zA-Z0-9.\-_]/g, '') : `file-${crypto.randomUUID()}`;
          const filePath = `${ticket.id}/${crypto.randomUUID()}-${fileNameSafe}`;

          console.log(`Wgrywanie ${fileNameSafe} do Storage...`);

          const { error: uploadErr } = await supabaseAdmin.storage
            .from('ticket_attachments')
            .upload(filePath, fileData, {
              contentType: att.content_type || 'application/octet-stream',
              upsert: true
            });

          if (uploadErr) {
            console.error(`Błąd wgrywania do Supabase dla ${fileNameSafe}:`, uploadErr);
            continue;
          }

          const { data: publicUrlData } = supabaseAdmin.storage
            .from('ticket_attachments')
            .getPublicUrl(filePath);

          await supabaseAdmin.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            file_name: att.filename,
            file_url: publicUrlData.publicUrl
          });

          console.log(`Sukces: Wgrano ${att.filename}`);
        }
      } catch (err) {
        console.error("Krytyczny błąd podczas pobierania załączników przez API:", err);
      }
    } else {
      console.log("Mail nie posiadał załączników.");
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
