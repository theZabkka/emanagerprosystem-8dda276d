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

    const { ticket_id, body_html, body_text } = await req.json();

    if (!ticket_id || (!body_html && !body_text)) {
      return new Response(
        JSON.stringify({ error: "Missing ticket_id or message body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ticket, error: ticketError } = await supabaseService
      .from("tickets")
      .select("title, ticket_number, client_id, clients(email, name, contact_person)")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket fetch error:", ticketError);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = (ticket as any).clients;
    const clientEmail = client?.email;
    if (!clientEmail) {
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shortId = ticket_id.split("-")[0];
    const ticketTitle = ticket.title || "Zgłoszenie";
    const ticketNum = (ticket as any).ticket_number;
    const formattedNumber = '#' + String(ticketNum || 0).padStart(4, '0');

    // Derive client first name
    const rawName = client?.contact_person || client?.name || "";
    const contactFirstname = rawName.split(" ")[0] || "Kliencie";

    // Build notification-only email (no reply content)
    const notificationHtml = `
<p>Witaj ${contactFirstname},</p>

<p>Konsultant właśnie odpowiedział na Twoje zgłoszenie <strong>[Zgłoszenie ${formattedNumber}] "${ticketTitle}"</strong>.</p>

<p>Numer Twojego zgłoszenia: <strong>${formattedNumber}</strong></p>

<p>Aby zobaczyć jego odpowiedź, kliknij poniższy przycisk:</p>

<a href="https://emanagerprosystem.lovable.app/client/tickets/${ticket_id}" style="display: inline-block; padding: 10px 20px; background-color: #e53e3e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">Zobacz odpowiedź</a>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />

<p style="font-size: 12px; color: #666;">Potrzebujesz stałej opieki informatycznej? Zapoznaj się z naszą ofertą na <a href="https://emanager.pro" style="color: #e53e3e;">stałą opiekę IT</a>.</p>

<p style="font-size: 12px; color: #666;">Zespół Emanager.pro</p>
`.trim();

    const notificationText = `Witaj ${contactFirstname}, konsultant odpowiedział na Twoje zgłoszenie [Zgłoszenie ${formattedNumber}] "${ticketTitle}". Zobacz odpowiedź: https://emanagerprosystem.lovable.app/client/tickets/${ticket_id}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Support Emanager <ticket-${shortId}@crm.emanager.pro>`,
        to: [clientEmail],
        subject: `[Zgłoszenie ${formattedNumber}] Re: ${ticketTitle}`,
        html: notificationHtml,
        text: notificationText,
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

    // Save the actual reply content to DB (not the notification template)
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
