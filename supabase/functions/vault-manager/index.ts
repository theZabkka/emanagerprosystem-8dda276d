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
    // Auth check
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

    const { action, ...payload } = await req.json();

    // Get the 32-byte key
    const keyHex = Deno.env.get("VAULT_SECRET_KEY");
    if (!keyHex || keyHex.length < 32) {
      console.error("VAULT_SECRET_KEY missing or too short");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive a proper 32-byte key from the secret
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

    if (action === "ENCRYPT") {
      const { password } = payload;
      if (!password) {
        return new Response(JSON.stringify({ error: "Missing password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedPassword = encoder.encode(password);

      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        aesKey,
        encodedPassword
      );

      // AES-GCM appends the auth tag at the end (last 16 bytes)
      const cipherArray = new Uint8Array(cipherBuffer);
      const encryptedData = cipherArray.slice(0, cipherArray.length - 16);
      const authTag = cipherArray.slice(cipherArray.length - 16);

      const toBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));

      return new Response(
        JSON.stringify({
          encrypted_password: toBase64(encryptedData),
          iv: toBase64(iv),
          auth_tag: toBase64(authTag),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "DECRYPT") {
      const { credential_id, encrypted_password, iv, auth_tag } = payload;
      if (!credential_id || !encrypted_password || !iv || !auth_tag) {
        return new Response(JSON.stringify({ error: "Missing decryption parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // CRITICAL: Write audit log BEFORE decrypting
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

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
          JSON.stringify({ error: "Audit log failed. Decryption blocked for security." }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const fromBase64 = (b64: string) =>
        Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

      const encData = fromBase64(encrypted_password);
      const ivData = fromBase64(iv);
      const tagData = fromBase64(auth_tag);

      // Reconstruct ciphertext with appended auth tag
      const combined = new Uint8Array(encData.length + tagData.length);
      combined.set(encData);
      combined.set(tagData, encData.length);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivData, tagLength: 128 },
        aesKey,
        combined
      );

      const decoder = new TextDecoder();
      const decryptedPassword = decoder.decode(decryptedBuffer);

      return new Response(
        JSON.stringify({ password: decryptedPassword }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Vault manager error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
