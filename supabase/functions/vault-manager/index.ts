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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...payload } = await req.json();

    // Derive AES-256 key
    const keyHex = Deno.env.get("VAULT_SECRET_KEY");
    if (!keyHex || keyHex.length < 32) {
      console.error("VAULT_SECRET_KEY missing or too short");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(keyHex),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("vault-salt-v1"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const toBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
    const fromBase64 = (b64: string) =>
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // ========== ENCRYPT ==========
    if (action === "ENCRYPT") {
      const { password } = payload;
      if (!password) {
        return new Response(JSON.stringify({ error: "Missing password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        aesKey,
        encoder.encode(password)
      );

      const cipherArray = new Uint8Array(cipherBuffer);
      const encryptedData = cipherArray.slice(0, cipherArray.length - 16);
      const authTag = cipherArray.slice(cipherArray.length - 16);

      return new Response(
        JSON.stringify({
          encrypted_password: toBase64(encryptedData),
          iv: toBase64(iv),
          auth_tag: toBase64(authTag),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DECRYPT_REVEAL (show password - conditional logging) ==========
    if (action === "DECRYPT" || action === "DECRYPT_REVEAL") {
      const { credential_id, encrypted_password, iv, auth_tag } = payload;
      if (!credential_id || !encrypted_password || !iv || !auth_tag) {
        return new Response(JSON.stringify({ error: "Missing decryption parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const userRole = profile?.role || "";
      const isAdminUser = ["superadmin", "boss", "admin"].includes(userRole);

      if (!isAdminUser) {
        // Check ACL
        const { data: grant, error: grantErr } = await supabaseAdmin
          .from("vault_access_grants")
          .select("id, expires_at")
          .eq("credential_id", credential_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (grantErr || !grant) {
          return new Response(
            JSON.stringify({ error: "Brak uprawnień do tego hasła" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (grant.expires_at && new Date(grant.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Dostęp wygasł" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Audit log for non-admin REVEAL
        const { error: auditErr } = await supabaseAdmin
          .from("vault_audit_logs")
          .insert({
            credential_id,
            user_id: userId,
            action: "REVEALED",
          });

        if (auditErr) {
          console.error("Audit log failed, blocking decryption:", auditErr);
          return new Response(
            JSON.stringify({ error: "Audit log failed. Decryption blocked." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      // Admin/boss/superadmin: NO audit log for REVEAL, skip ACL check

      // Decrypt
      const encData = fromBase64(encrypted_password);
      const ivData = fromBase64(iv);
      const tagData = fromBase64(auth_tag);

      const combined = new Uint8Array(encData.length + tagData.length);
      combined.set(encData);
      combined.set(tagData, encData.length);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivData, tagLength: 128 },
        aesKey,
        combined
      );

      return new Response(
        JSON.stringify({ password: new TextDecoder().decode(decryptedBuffer) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== COPY_TO_CLIPBOARD (always logged, even for admins) ==========
    if (action === "COPY_TO_CLIPBOARD") {
      const { credential_id } = payload;
      if (!credential_id) {
        return new Response(JSON.stringify({ error: "Missing credential_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("vault_audit_logs")
        .insert({
          credential_id,
          user_id: userId,
          action: "COPIED",
        });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== GRANT_ACCESS ==========
    if (action === "GRANT_ACCESS") {
      const { credential_id, target_user_id, expires_at } = payload;
      if (!credential_id || !target_user_id) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("vault_access_grants")
        .upsert({
          credential_id,
          user_id: target_user_id,
          granted_by: userId,
          expires_at: expires_at || null,
        }, { onConflict: "credential_id,user_id" });

      if (error) {
        console.error("Grant access error:", error);
        return new Response(JSON.stringify({ error: "Failed to grant access" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Audit log
      await supabaseAdmin.from("vault_audit_logs").insert({
        credential_id,
        user_id: userId,
        action: "GRANTED_ACCESS",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== REVOKE_ACCESS ==========
    if (action === "REVOKE_ACCESS") {
      const { credential_id, target_user_id } = payload;
      if (!credential_id || !target_user_id) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("vault_access_grants")
        .delete()
        .eq("credential_id", credential_id)
        .eq("user_id", target_user_id);

      if (error) {
        console.error("Revoke access error:", error);
        return new Response(JSON.stringify({ error: "Failed to revoke access" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Audit log
      await supabaseAdmin.from("vault_audit_logs").insert({
        credential_id,
        user_id: userId,
        action: "REVOKED_ACCESS",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Vault manager error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
