import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Insert clients
    const { data: clients, error: cErr } = await supabaseAdmin
      .from("clients")
      .insert([
        {
          name: "Firma Testowa A Sp. z o.o.",
          contact_person: "Anna Kowalska",
          email: "anna@firmatestowa.pl",
          phone: "+48 500 100 200",
          status: "active",
          monthly_value: 12000,
          score: 85,
          tags: ["e-commerce", "SEO"],
          onboarding_steps: [
            { name: "Brief zebrany", completed: true },
            { name: "Dostępy skonfigurowane", completed: true },
            { name: "Kick-off meeting", completed: false },
          ],
        },
        {
          name: "Firma Testowa B S.A.",
          contact_person: "Marek Nowak",
          email: "marek@firmatestowab.pl",
          phone: "+48 600 300 400",
          status: "potential",
          monthly_value: 8000,
          score: 60,
          tags: ["branding", "social media"],
          onboarding_steps: [{ name: "Brief zebrany", completed: false }],
        },
      ])
      .select("id, name");

    if (cErr || !clients || clients.length < 2) {
      throw new Error("Clients: " + (cErr?.message ?? "no data"));
    }

    const clientA = clients[0];
    const clientB = clients[1];

    // 2. Insert projects
    const { data: projects, error: pErr } = await supabaseAdmin
      .from("projects")
      .insert([
        {
          name: "Redesign strony A",
          client_id: clientA.id,
          status: "active",
          description: "Pełny redesign witryny klienta A",
          start_date: "2026-01-15",
        },
        {
          name: "Kampania Social B",
          client_id: clientB.id,
          status: "active",
          description: "Kampania social media dla klienta B",
          start_date: "2026-02-01",
        },
      ])
      .select("id, name, client_id");

    if (pErr || !projects || projects.length < 2) {
      throw new Error("Projects: " + (pErr?.message ?? "no data"));
    }

    // 3. Insert tasks
    const { error: tErr } = await supabaseAdmin.from("tasks").insert([
      {
        title: "Zaprojektować nowy landing page",
        project_id: projects[0].id,
        client_id: clientA.id,
        status: "todo",
        priority: "high",
        estimated_time: 480,
      },
      {
        title: "Wdrożyć sekcję hero",
        project_id: projects[0].id,
        client_id: clientA.id,
        status: "in_progress",
        priority: "medium",
        estimated_time: 240,
      },
      {
        title: "Przygotować kreacje reklamowe",
        project_id: projects[1].id,
        client_id: clientB.id,
        status: "todo",
        priority: "high",
        estimated_time: 360,
      },
      {
        title: "Analiza konkurencji social media",
        project_id: projects[1].id,
        client_id: clientB.id,
        status: "in_progress",
        priority: "low",
        estimated_time: 120,
      },
    ]);

    if (tErr) throw new Error("Tasks: " + tErr.message);

    // 4. Insert contracts & orders
    const { error: ctErr } = await supabaseAdmin.from("client_contracts").insert([
      {
        client_id: clientA.id,
        name: "Umowa serwisowa 2026",
        type: "service",
        value: 48000,
        status: "active",
        start_date: "2026-01-01",
        end_date: "2026-12-31",
      },
    ]);
    if (ctErr) throw new Error("Contracts: " + ctErr.message);

    const { error: oErr } = await supabaseAdmin.from("client_orders").insert([
      {
        client_id: clientB.id,
        name: "Zlecenie – pakiet grafik",
        value: 3500,
        status: "in_progress",
        due_date: "2026-04-15",
      },
    ]);
    if (oErr) throw new Error("Orders: " + oErr.message);

    return new Response(
      JSON.stringify({
        success: true,
        clientsCount: 2,
        projectsCount: 2,
        tasksCount: 4,
        contractsCount: 1,
        ordersCount: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
