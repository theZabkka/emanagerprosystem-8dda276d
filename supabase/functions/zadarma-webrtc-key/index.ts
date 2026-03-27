import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const KEY = Deno.env.get('ZADARMA_API_KEY');
    const SECRET = Deno.env.get('ZADARMA_API_SECRET');

    if (!KEY || !SECRET) {
      throw new Error("Brak konfiguracji kluczy Zadarma na serwerze.");
    }

    // 1. Weryfikacja użytkownika z nagłówka
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Brak autoryzacji." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !user) {
      console.error("Błąd weryfikacji tokenu:", authErr);
      return new Response(
        JSON.stringify({ error: "Nie można zweryfikować sesji użytkownika." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Pobranie numeru SIP z tabeli profiles
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('zadarma_sip_login, role')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error("Błąd pobierania profilu:", profileErr);
      throw new Error("Błąd podczas pobierania profilu użytkownika.");
    }

    if (!profile || !profile.zadarma_sip_login) {
      return new Response(
        JSON.stringify({ error: "Brak przypisanego numeru SIP w profilu." }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sipNumber = profile.zadarma_sip_login;
    console.log(`Generowanie klucza Zadarma dla SIP: ${sipNumber}, rola: ${profile.role}`);

    // 3. Algorytm autoryzacji Zadarma: HMAC-SHA1
    const method = '/v1/webrtc/get_key/';
    const paramsString = `sip=${sipNumber}`;

    const md5Hash = createHash('md5').update(paramsString).digest('hex');
    const dataToSign = method + paramsString + md5Hash;
    const signature = createHmac('sha1', SECRET).update(dataToSign).digest('base64');

    const zadarmaResponse = await fetch(`https://api.zadarma.com${method}?${paramsString}`, {
      method: 'GET',
      headers: { 'Authorization': `${KEY}:${signature}` },
    });

    const data = await zadarmaResponse.json();

    return new Response(
      JSON.stringify({
        status: data.status === 'success' ? 'success' : 'error',
        key: data.key || null,
        sip: sipNumber,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("Zadarma edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
