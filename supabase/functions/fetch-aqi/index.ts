import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const EVEN_TARGET_URL = 'https://www.aqi.in/in/dashboard/india/delhi';
const EVEN_PROMPT = `You are a data extraction specialist. From the provided scraped markdown, extract the CURRENT AQI value for Delhi.

### EXTRACTION RULE:
- Locate the text string 'Live AQI'
- Locate the text string 'AQI (US)'.
- Extract only the digits appearing between both text strings.
- Example Template: 'Live AQI XXX AQI (US)' -> You extract XXX.

### CONSTRAINTS:
- Do not use any numbers found in the instructions or examples.
- Scan the provided input text only.
- If no such value is found, return {"aqi": null}.

### OUTPUT FORMAT:
Return ONLY a minified JSON object: {"aqi": number}. No extra text or explanation.`;
const ODD_TARGET_URL = 'https://www.iqair.com/india/delhi/delhi';
const ODD_PROMPT = `You are a data extraction specialist. From the provided markdown, extract the CURRENT AQI value for Delhi.

### EXTRACTION RULE:
- Locate the link 'https://www.iqair.com/newsroom/india-air-quality-alert'
- Locate the text string 'US AQI⁺'.
- Extract only the digits appearing between the link and text string.
- Example Template: 'https://www.iqair.com/newsroom/india-air-quality-alert XXX US AQI⁺' -> You extract XXX.

### CONSTRAINTS:
- Do not use any numbers found in the instructions or examples.
- Scan the provided input text only.
- If no such value is found, return {"aqi": null}.

### OUTPUT FORMAT:
Return ONLY a minified JSON object: {"aqi": number}. No extra text or explanation.`;
const SCHEMA = {
  type: 'object',
  properties: {
    aqi: {
      type: 'number',
      description: 'The current aqi value (e.g., 110).'
    }
  },
  required: ['aqi']
};

serve(async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env config' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;
    const isEvenHour = new Date().getUTCHours() % 2 === 0;
    const targetUrl = isEvenHour ? EVEN_TARGET_URL : ODD_TARGET_URL;
    const prompt = isEvenHour ? EVEN_PROMPT : ODD_PROMPT;
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        url: targetUrl,
        prompt: `${prompt} Output strictly as JSON with schema: { \"aqi\": number }. No extra text.`,
        useWatercrawl: false
      })
    });
    if (!scrapeResp.ok) {
      return new Response(JSON.stringify({ error: `shared responded ${scrapeResp.status}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const scrape = await scrapeResp.json();
    const jsonPayload = scrape?.json;
    if (!jsonPayload || typeof jsonPayload !== 'object') {
      return new Response(JSON.stringify({ error: 'No JSON payload returned from shared' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const payload = jsonPayload as any;
    const row = {
      aqi: Number(payload.aqi),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('delhi_aqi_status').insert(row);
    if (error) {
      return new Response(JSON.stringify({ error: 'Database insert failed', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const { data: oldRows, error: selectError } = await supabase
      .from('delhi_aqi_status')
      .select('id')
      .order('updated_at', { ascending: false })
      .range(10, 10000);
    if (selectError) {
      return new Response(JSON.stringify({ error: 'Database cleanup query failed', details: selectError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const ids = (oldRows || []).map((r: any) => r.id).filter(Boolean);
    if (ids.length > 0) {
      const { error: deleteError } = await supabase
        .from('delhi_aqi_status')
        .delete()
        .in('id', ids);
      if (deleteError) {
        return new Response(JSON.stringify({ error: 'Database cleanup delete failed', details: deleteError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response(JSON.stringify({ success: true, data: row }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
