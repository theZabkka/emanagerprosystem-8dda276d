import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PASSWORD = "haslo1234";

const TEST_ACCOUNTS = [
  { email: "boss@test.pl", full_name: "Jan Kowalski (Boss)", role: "boss", department: "Zarząd" },
  { email: "koordynator@test.pl", full_name: "Anna Nowak (Koordynator)", role: "koordynator", department: "Marketing" },
  { email: "specjalista@test.pl", full_name: "Piotr Wiśniewski (Specjalista)", role: "specjalista", department: "Design" },
  { email: "praktykant@test.pl", full_name: "Tomasz Lewandowski (Praktykant)", role: "praktykant", department: "Development" },
  { email: "klient@test.pl", full_name: "Marek Jankowski (Klient)", role: "klient", department: null },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const createdUsers: { email: string; id: string; role: string }[] = [];

    // 1. Create auth users + profiles
    for (const account of TEST_ACCOUNTS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === account.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
      } else {
        const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: account.full_name },
        });
        if (authErr) throw new Error(`Auth ${account.email}: ${authErr.message}`);
        userId = newUser.user.id;
      }

      // Update profile with role and department
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          department: account.department,
        }, { onConflict: "id" });

      createdUsers.push({ email: account.email, id: userId, role: account.role });
    }

    // 2. Insert clients
    const clientUserId = createdUsers.find(u => u.role === "klient")!.id;

    const { data: clients, error: cErr } = await supabaseAdmin
      .from("clients")
      .upsert([
        {
          name: "TechCorp Sp. z o.o.",
          contact_person: "Marek Jankowski",
          email: "marek@techcorp.pl",
          phone: "+48 500 100 200",
          status: "active",
          monthly_value: 15000,
          score: 85,
          tags: ["IT", "premium"],
        },
        {
          name: "Creative Studio",
          contact_person: "Ewa Kowalczyk",
          email: "ewa@creativestudio.pl",
          phone: "+48 600 300 400",
          status: "active",
          monthly_value: 8500,
          score: 72,
          tags: ["design", "branding"],
        },
      ], { onConflict: "id" })
      .select("id, name");

    if (cErr || !clients || clients.length < 2) {
      throw new Error("Clients: " + (cErr?.message ?? "no data"));
    }

    const clientA = clients[0];
    const clientB = clients[1];

    // 3. Link client user profile to their client record
    await supabaseAdmin
      .from("profiles")
      .update({ client_id: clientA.id })
      .eq("id", clientUserId);

    // 4. Insert projects linked to clients
    const { data: projects, error: pErr } = await supabaseAdmin
      .from("projects")
      .insert([
        {
          name: "Redesign strony TechCorp",
          client_id: clientA.id,
          status: "active",
          description: "Kompleksowy redesign witryny klienta TechCorp",
          start_date: "2026-01-15",
        },
        {
          name: "Kampania Social Media",
          client_id: clientA.id,
          status: "active",
          description: "Kampania social media Q1 2026 dla TechCorp",
          start_date: "2026-02-01",
        },
        {
          name: "Branding Creative Studio",
          client_id: clientB.id,
          status: "active",
          description: "Rebranding i nowa identyfikacja wizualna",
          start_date: "2026-03-01",
        },
      ])
      .select("id, name, client_id");

    if (pErr || !projects) {
      throw new Error("Projects: " + (pErr?.message ?? "no data"));
    }

    // 5. Insert tasks
    const { error: tErr } = await supabaseAdmin.from("tasks").insert([
      {
        title: "Zaprojektować nowy landing page",
        project_id: projects[0].id,
        client_id: clientA.id,
        status: "client_review",
        priority: "high",
        estimated_time: 480,
        is_client_visible: true,
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
        client_id: clientA.id,
        status: "done",
        priority: "high",
        estimated_time: 360,
        is_client_visible: true,
      },
      {
        title: "Analiza konkurencji",
        project_id: projects[2].id,
        client_id: clientB.id,
        status: "in_progress",
        priority: "low",
        estimated_time: 120,
      },
    ]);

    if (tErr) throw new Error("Tasks: " + tErr.message);

    // 6. Insert client ideas
    await supabaseAdmin.from("client_ideas").insert([
      {
        client_id: clientA.id,
        title: "Dodać chatbota na stronie",
        description: "Klienci pytają o nasze usługi — chatbot mógłby odpowiadać automatycznie.",
        status: "new",
        created_by: clientUserId,
      },
      {
        client_id: clientA.id,
        title: "Newsletter z poradami SEO",
        description: "Chcielibyśmy wysyłać klientom newsletter z poradami.",
        status: "reviewed",
        created_by: clientUserId,
      },
    ]);

    // 7. Insert contracts & orders
    await supabaseAdmin.from("client_contracts").insert([
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

    await supabaseAdmin.from("client_orders").insert([
      {
        client_id: clientB.id,
        name: "Zlecenie – pakiet grafik",
        value: 3500,
        status: "in_progress",
        due_date: "2026-04-15",
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        accounts: createdUsers.map(u => ({ email: u.email, role: u.role, password: TEST_PASSWORD })),
        clientsCount: clients.length,
        projectsCount: projects.length,
        tasksCount: 4,
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
