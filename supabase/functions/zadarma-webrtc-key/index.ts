import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ZADARMA_KEY = Deno.env.get('ZADARMA_API_KEY')?.trim();
    const ZADARMA_SECRET = Deno.env.get('ZADARMA_API_SECRET')?.trim();

    if (!ZADARMA_KEY || !ZADARMA_SECRET) throw new Error("Missing API keys");

    const method = '/v1/webrtc/get_key/';
    const paramsString = '';
    
    const md5Hash = createHash('md5').update(paramsString).digest('hex');
    const dataToSign = method + paramsString + md5Hash;
    const signature = createHmac('sha1', ZADARMA_SECRET).update(dataToSign).digest('base64');

    const zadarmaResponse = await fetch(`https://api.zadarma.com${method}`, {
      method: 'GET',
      headers: { 'Authorization': `${ZADARMA_KEY}:${signature}` }
    });

    const data = await zadarmaResponse.json();

    return new Response(JSON.stringify(data), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), 
    { status: 500, headers: corsHeaders });
  }
});
