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

  // Verify webhook signature via Svix (Resend standard)
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

    const rawFrom: string = emailData.from || emailData.from_email || "";
    const subject: string = emailData.subject || "(Brak tematu)";
    const htmlBody: string = emailData.html || "";
    const textBody: string = emailData.text || "";
    const description = htmlBody || textBody || "";

    if (!rawFrom) {
      console.error("Brak nadawcy w payloadzie:", emailData);
      return new Response(
        JSON.stringify({ error: "Missing sender email in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Ekstrakcja czystego e-maila za pomocą Regex
    const emailMatch = rawFrom.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : rawFrom.trim().toLowerCase();

    // Step 1: Find existing client by email
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("email", senderEmail.toLowerCase().trim())
      .maybeSingle();

    let clientId: string;

    if (existingClient) {
      // Step 2a: Client exists
      clientId = existingClient.id;
    } else {
      // Step 2b: Create stub client
      const { data: newClient, error: clientErr } = await supabaseAdmin
        .from("clients")
        .insert({
          name: senderEmail.split("@")[0],
          email: senderEmail.toLowerCase().trim(),
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

    // Step 3: Create ticket
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
