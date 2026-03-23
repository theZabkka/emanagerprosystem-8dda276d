import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sip } = await req.json();
    if (!sip) throw new Error("Missing 'sip' parameter");

    const ZADARMA_KEY = Deno.env.get('ZADARMA_API_KEY');
    const ZADARMA_SECRET = Deno.env.get('ZADARMA_API_SECRET');

    if (!ZADARMA_KEY || !ZADARMA_SECRET) {
      throw new Error("Missing Zadarma API keys in environment");
    }

    // Algorytm HMAC-SHA1 wg dokumentacji Zadarmy
    const params = new URLSearchParams({ sip: sip });
    params.sort(); // Wymagane sortowanie alfabetyczne
    const paramsString = params.toString(); 

    const md5Hash = createHash('md5').update(paramsString).digest('hex');
    const dataToSign = '/v1/webrtc/get_key/' + paramsString + md5Hash;
    const signature = createHmac('sha1', ZADARMA_SECRET).update(dataToSign).digest('base64');

    const zadarmaResponse = await fetch(`https://api.zadarma.com/v1/webrtc/get_key/?${paramsString}`, {
      method: 'GET',
      headers: {
        'Authorization': `${ZADARMA_KEY}:${signature}`
      }
    });

    const data = await zadarmaResponse.json();

    // Zwracamy status 200 nawet przy błędzie Zadarmy, żeby nie wywalać klienta Supabase
    return new Response(JSON.stringify({
        success: zadarmaResponse.ok,
        key: data.key || null,
        details: data
    }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
        status: 200, // ratunkowe 200
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});