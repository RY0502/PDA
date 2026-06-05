import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonrepair } from 'npm:jsonrepair';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOSER_KEYS = ['name', 'price', 'change', 'changePercent'] as const;

function preRepair(raw: string): string {
  // Fix "key","value" → "key":"value"  (comma instead of colon)
  raw = raw.replace(/"(name|price|change|changePercent)","([^"]*)"/g, '"$1":"$2"');
  // Fix bare keys with no value: "key", or "key"}
  raw = raw.replace(/"(name|price|change|changePercent)"(\s*[,}])/g, '"$1": ""$2');
  return raw;
}

function sanitizeLoser(loser: any): any {
  const out: any = {};
  for (const key of LOSER_KEYS) {
    const val = loser[key] ?? '';
    if (key === 'name') {
      out[key] = String(val).trim();
    } else {
      const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
      out[key] = isNaN(num) ? null : num;
    }
  }
  return out;
}

serve(async () => {
  try {
    const targetUrl = 'https://www.hdfcsec.com/market/equity/top-loser-nse?indicesCode=76394';
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;
    const prompt = `
  You are reading the screenshot of the HDFC Securities "Top Loser NSE" page.
  The page contains a list of stock cards. Each card follows this exact pattern:

  <Company Name>
  LTP      LOSS      LOSS (%)
  <price>  <change>  <changePercent>

  Example card:
  Wockhardt Ltd
  LTP      LOSS      LOSS (%)
  1933     -139.95   -6.75

  From this card extract:
  - "name"          → "Wockhardt Ltd"
  - "price"         → "1933"
  - "change"        → "-139.95"
  - "changePercent" → "-6.75"

  Rules for extraction:
  - Ignore all other fields on the card: Day's Low, Day's High, Day's Volume, BUY, SELL buttons.
  - Strip commas from numbers (1,933 → 1933).
  - Keep the minus sign on change and changePercent.
  - If a value is present on the page, you MUST extract it. Do NOT leave it blank unless it is truly absent.
  - Process every card on the page before deciding the top 10. Do not skip any card.
  - Sort the final 10 descending by 'change' (most negative first).

  Return ONLY a single, valid, minified JSON object with a 'topLosers' key. No text, no explanations, no markdown.
  STRICT RULES:
  1. Every object must contain ALL four keys: 'name', 'price', 'change', 'changePercent'.
  2. Never emit a bare key. Always include a colon and a value. INVALID: "price" VALID: "price": "".
  3. If a value cannot be extracted, use an empty string "". Example: "price": "".
  4. Follow this exact shape: {"name":"...","price":"...","change":"...","changePercent":"..."}
`;

    const reqHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };
    const schema = {
      type: 'object',
      properties: {
        topLosers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              change: { type: 'number' },
              changePercent: { type: 'number' }
            },
            required: ['name', 'price', 'change', 'changePercent']
          }
        }
      },
      required: ['topLosers']
    };
    const reqBody = {
      url: targetUrl,
      prompt,
      json_options: { schema, user_prompt: prompt, extract_source: 'screenshot' }
    };

    console.log(`[fetch-top-losers] Hitting shared for ${targetUrl}`);
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });
    if (!scrapeResp.ok) throw new Error(`Shared function error: ${scrapeResp.status}`);

    const scrape = await scrapeResp.json();
    console.log(`[fetch-top-losers] shared returned source=${scrape.source} hasJson=${!!scrape.json}`);

    let payload: any = scrape?.json;
    console.log('[fetch-top-losers] Raw JSON from shared:', String(payload).substring(0, 600));

    if (typeof payload === 'string') {
      try {
        const prePatched = preRepair(payload);
        payload = JSON.parse(jsonrepair(prePatched));
      } catch (e) {
        console.error('[fetch-top-losers] JSON repair+parse failed:', e);
        console.error('[fetch-top-losers] Full raw payload:', payload);
        payload = null;
      }
    }

    if (!payload || typeof payload !== 'object') throw new Error('No JSON payload returned from shared');

    const rawLosers = payload.topLosers;
    if (!rawLosers || !Array.isArray(rawLosers)) throw new Error('Invalid data format: missing topLosers array');

    const topLosers = rawLosers.map(sanitizeLoser).filter((l: any) => l.name);
    console.log(`[fetch-top-losers] Sanitized ${topLosers.length} losers`);

    const { error } = await supabase.from('top_losers').insert(topLosers.map((loser: any) => ({
      name: loser.name,
      price: loser.price,
      change: loser.change,
      change_percent: loser.changePercent,
      updated_at: new Date().toISOString()
    })));
    if (error) { console.error('Error inserting top losers:', error); throw error; }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase.from('top_losers').delete().lt('updated_at', twoDaysAgo);
    if (deleteError) console.error('Error deleting old top losers:', deleteError);

    return new Response(JSON.stringify({ success: true, count: topLosers.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in fetch-top-losers function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
