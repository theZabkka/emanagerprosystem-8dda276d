import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // 2. Parse body
    const { ticket_id, body_html, body_text } = await req.json();

    if (!ticket_id || (!body_html && !body_text)) {
      return new Response(
        JSON.stringify({ error: "Missing ticket_id or message body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch ticket + client email using service role for reliable access
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ticket, error: ticketError } = await supabaseService
      .from("tickets")
      .select("title, client_id, clients(email)")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket fetch error:", ticketError);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientEmail = (ticket as any).clients?.email;
    if (!clientEmail) {
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Build short ID for unique reply address
    const shortId = ticket_id.split("-")[0];
    const ticketTitle = ticket.title || "Zgłoszenie";

    // 5. Send email via Resend API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Support Emanager <ticket-${shortId}@crm.emanager.pro>`,
        to: [clientEmail],
        subject: `Re: ${ticketTitle}`,
        html: body_html || `<p>${(body_text || "").replace(/\n/g, "<br/>")}</p>`,
        text: body_text || "",
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendRes.json();
    console.log("Email sent successfully via Resend:", resendData.id);

    // 6. Only after successful send → INSERT into ticket_messages
    const { error: insertError } = await supabaseService
      .from("ticket_messages")
      .insert({
        ticket_id,
        sender_type: "admin",
        sender_id: userId,
        body_html: body_html || `<p>${(body_text || "").replace(/\n/g, "<br/>")}</p>`,
        body_text: body_text || "",
      });

    if (insertError) {
      console.error("DB insert error (email was sent):", insertError);
      return new Response(
        JSON.stringify({ error: "Email sent but failed to save message", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, resend_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
