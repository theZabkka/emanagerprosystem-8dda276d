import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  // Verify webhook secret
  const webhookSecret = Deno.env.get("INBOUND_WEBHOOK_SECRET");
  if (webhookSecret) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    console.warn("INBOUND_WEBHOOK_SECRET not set — endpoint is unprotected!");
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();

    // Extract email fields from payload (compatible with Resend / SendGrid / generic)
    const senderEmail: string =
      body.from_email || body.from || body.sender_email || body.envelope?.from || "";
    const subject: string = body.subject || body.title || "(Brak tematu)";
    const htmlBody: string = body.html || body.body_html || "";
    const textBody: string = body.text || body.body_plain || body.body || "";
    const description = htmlBody || textBody || "";

    if (!senderEmail) {
      return new Response(
        JSON.stringify({ error: "Missing sender email in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
