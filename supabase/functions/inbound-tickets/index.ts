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

    // 3. Pobranie treści bezpośrednio z payloadu
    const description = emailData.html || emailData.text || "";
    const subject = emailData.subject || "(Brak tematu)";

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

    // 7. Dekodowanie załączników bezpośrednio z payloadu webhooka
    const attachments = emailData.attachments || [];

    if (attachments.length > 0) {
      console.log(`Znaleziono ${attachments.length} załączników w payloadzie. Rozpoczynam bezpośrednie dekodowanie...`);

      for (const att of attachments) {
        try {
          // Resend może używać różnych kluczy w zależności od struktury JSON
          const rawContent = att.content || att.contentBytes || att.data || att.raw;

          if (!rawContent) {
            console.warn(`Załącznik ${att.filename || 'nieznany'} jest pusty. Zrzut dostępnych kluczy obiektu z Resend:`, Object.keys(att));
            continue;
          }

          let fileData;

          // Rozpoznawanie formatu danych (Array vs Buffer Object vs Base64)
          if (Array.isArray(rawContent)) {
            fileData = new Uint8Array(rawContent);
          } else if (rawContent.type === 'Buffer' && Array.isArray(rawContent.data)) {
            fileData = new Uint8Array(rawContent.data);
          } else if (typeof rawContent === 'string') {
            const binary = atob(rawContent);
            fileData = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) fileData[i] = binary.charCodeAt(i);
          } else {
            console.error(`Nieznany format danych załącznika ${att.filename}. Typ:`, typeof rawContent);
            continue;
          }

          const fileNameSafe = att.filename ? att.filename.replace(/[^a-zA-Z0-9.\-_]/g, '') : `file-${crypto.randomUUID()}`;
          const filePath = `${ticket.id}/${crypto.randomUUID()}-${fileNameSafe}`;

          console.log(`Wgrywanie pliku: ${fileNameSafe} do Storage...`);
          const { error: uploadErr } = await supabaseAdmin.storage
            .from('ticket_attachments')
            .upload(filePath, fileData, {
              contentType: att.content_type || 'application/octet-stream',
              upsert: true
            });

          if (uploadErr) {
            console.error(`Błąd wgrywania pliku ${fileNameSafe} do Supabase:`, uploadErr);
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

          console.log(`Sukces: Zapisano i podpięto załącznik ${att.filename}`);
        } catch (attErr) {
          console.error(`Krytyczny błąd podczas przetwarzania załącznika ${att.filename}:`, attErr);
        }
      }
    } else {
      console.log("Mail nie zawierał informacji o załącznikach w payloadzie.");
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
