import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sip } = await req.json();
    const cleanSip = sip ? String(sip).trim() : "504768-500";

    const ZADARMA_KEY = Deno.env.get('ZADARMA_API_KEY');
    const ZADARMA_SECRET = Deno.env.get('ZADARMA_API_SECRET');

    if (!ZADARMA_KEY || !ZADARMA_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Zadarma API credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const method = '/v1/webrtc/get_key/';
    const paramsString = `sip=${cleanSip}`;

    // Zadarma authorization algorithm: HMAC-SHA1
    const md5Hash = createHash('md5').update(paramsString).digest('hex');
    const dataToSign = method + paramsString + md5Hash;
    const signature = createHmac('sha1', ZADARMA_SECRET).update(dataToSign).digest('base64');

    const zadarmaResponse = await fetch(`https://api.zadarma.com${method}?${paramsString}`, {
      method: 'GET',
      headers: { 'Authorization': `${ZADARMA_KEY}:${signature}` },
    });

    const data = await zadarmaResponse.json();

    return new Response(
      JSON.stringify({
        success: zadarmaResponse.ok,
        key: data.key || null,
        details: data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
