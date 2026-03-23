import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sip } = await req.json();
    if (!sip) throw new Error("Missing 'sip'");

    // KRYTYCZNE: .trim() usuwa wszelkie ukryte spacje i entery ze zmiennych środowiskowych
    const ZADARMA_KEY = Deno.env.get('ZADARMA_API_KEY')?.trim();
    const ZADARMA_SECRET = Deno.env.get('ZADARMA_API_SECRET')?.trim();
    const cleanSip = sip.trim();

    if (!ZADARMA_KEY || !ZADARMA_SECRET) throw new Error("Missing API keys");

    // Budowanie sygnatury wg ścisłej dokumentacji Zadarmy
    const paramsString = `sip=${cleanSip}`;
    const md5Hash = createHash('md5').update(paramsString).digest('hex');
    const dataToSign = '/v1/webrtc/get_key/' + paramsString + md5Hash;
    const signature = createHmac('sha1', ZADARMA_SECRET).update(dataToSign).digest('base64');

    const zadarmaResponse = await fetch(`https://api.zadarma.com/v1/webrtc/get_key/?${paramsString}`, {
      method: 'GET',
      headers: { 'Authorization': `${ZADARMA_KEY}:${signature}` }
    });

    const data = await zadarmaResponse.json();

    return new Response(JSON.stringify({
        success: zadarmaResponse.ok,
        key: data.key || null,
        details: data
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
