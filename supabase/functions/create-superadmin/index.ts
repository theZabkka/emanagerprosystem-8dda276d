import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const email = "superadmin@local.test";
    const password = "haslo1234";
    const fullName = "Super Admin";

    // Check if user already exists
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      // Update existing profile role
      await supabaseAdmin
        .from("profiles")
        .update({ role: "superadmin", full_name: fullName, status: "active", department: "Zarząd" })
        .eq("id", existingProfiles[0].id);

      // Ensure user_roles entry
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: existingProfiles[0].id, role: "superadmin" }, { onConflict: "user_id,role" });

      return new Response(
        JSON.stringify({ success: true, message: "Superadmin already exists, role updated", user_id: existingProfiles[0].id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authErr) throw new Error(`Auth error: ${authErr.message}`);

    const userId = authData.user.id;

    // Update profile
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        role: "superadmin",
        status: "active",
        department: "Zarząd",
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("Profile update error:", profileErr.message);
    }

    // Add user_roles entry
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "superadmin" });

    if (roleErr) {
      console.error("Role insert error:", roleErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
