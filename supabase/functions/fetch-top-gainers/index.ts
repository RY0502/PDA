import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonrepair } from 'npm:jsonrepair';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GAINER_KEYS = ['name', 'price', 'change', 'changePercent'] as const;

function preRepair(raw: string): string {
  return raw.replace(/"(name|price|change|changePercent)"(\s*[,}])/g, '"$1": ""$2');
}

function sanitizeGainer(gainer: any): any {
  const out: any = {};
  for (const key of GAINER_KEYS) {
    const val = gainer[key] ?? '';
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
    const targetUrl = 'https://www.hdfcsec.com/market/equity/top-gainer-nse?indicesCode=76394';
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;
    const prompt = `
  You are reading the screenshot of the HDFC Securities "Top Gainer NSE" page.
  The page contains a list of stock cards. Each card follows this exact pattern:

  <Company Name>
  LTP      GAIN      GAIN (%)
  <price>  <change>  <changePercent>

  Example card:
  Network 18 Media & Investments Ltd
  LTP      GAIN      GAIN (%)
  33.58    3.59      11.97

  From this card extract:
  - "name"          → "Network 18 Media & Investments Ltd"
  - "price"         → "33.58"
  - "change"        → "3.59"
  - "changePercent" → "11.97"

  Rules for extraction:
  - Ignore all other fields on the card: Day's Low, Day's High, Day's Volume, BUY, SELL buttons.
  - Strip commas from numbers (5,14,97,471 → 51497471).
  - Keep positive values for change and changePercent (no minus sign).
  - If a value is present on the page, you MUST extract it. Do NOT leave it blank unless it is truly absent.
  - Process every card on the page before deciding the top 10. Do not skip any card.
  - Sort the final 10 descending by 'change' (highest first).

  Return ONLY a single, valid, minified JSON object with a 'topGainers' key. No text, no explanations, no markdown.
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
        topGainers: {
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
      required: ['topGainers']
    };
    const reqBody = {
      url: targetUrl,
      prompt,
      json_options: { schema, user_prompt: prompt, extract_source: 'screenshot' }
    };

    console.log(`[fetch-top-gainers] Hitting shared for ${targetUrl}`);
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });
    if (!scrapeResp.ok) {
      console.error(`[fetch-top-gainers] shared responded non-OK: ${scrapeResp.status}`);
      throw new Error(`Shared function error: ${scrapeResp.status}`);
    }

    const scrape = await scrapeResp.json();
    console.log(`[fetch-top-gainers] shared returned source=${scrape.source} hasJson=${!!scrape.json}`);

    let payload: any = scrape?.json;
    console.log('[fetch-top-gainers] Raw JSON from shared:', String(payload).substring(0, 600));

    if (typeof payload === 'string') {
      try {
        const prePatched = preRepair(payload);
        payload = JSON.parse(jsonrepair(prePatched));
      } catch (e) {
        console.error('[fetch-top-gainers] JSON repair+parse failed:', e);
        console.error('[fetch-top-gainers] Full raw payload:', payload);
        payload = null;
      }
    }

    if (!payload || typeof payload !== 'object') throw new Error('No JSON payload returned from shared');

    const rawGainers = payload.topGainers;
    if (!rawGainers || !Array.isArray(rawGainers)) throw new Error('Invalid data format: missing topGainers array');

    const topGainers = rawGainers.map(sanitizeGainer).filter((g: any) => g.name);
    console.log(`[fetch-top-gainers] Sanitized ${topGainers.length} gainers`);

    const { error } = await supabase.from('top_gainers').insert(topGainers.map((gainer: any) => ({
      name: gainer.name,
      price: gainer.price,
      change: gainer.change,
      change_percent: gainer.changePercent,
      updated_at: new Date().toISOString()
    })));
    if (error) { console.error('Error inserting top gainers:', error); throw error; }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase.from('top_gainers').delete().lt('updated_at', twoDaysAgo);
    if (deleteError) console.error('Error deleting old top gainers:', deleteError);

    return new Response(JSON.stringify({ success: true, count: topGainers.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in fetch-top-gainers function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
