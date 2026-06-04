import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonrepair } from 'npm:jsonrepair';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const TARGET_URL = 'https://www.tickertape.in/indices/nifty-50-index-.NSEI';
const PROMPT = `
  From the given markdown find out today's status for Nifty 50: The value will be available between 'NIFTY 50 Share Price' and 'ETFs tracking NIFTY 50'.
  The first line in between these two tags should be ignored having value 'INDEX'. The second line will be like this: 25,725.40 __0.17 % (+42.65).
  The first number is current points. After '__' is the change % and the third value in the () will be the changed point with increase(+) and decrease(-).
  Return ONLY a single, valid, minified JSON object. Do not include any text, explanations, or markdown formatting.
  STRICT RULES:
  1. Every object must contain ALL four keys: 'points', 'changePercentage', 'change', 'jump'.
  2. Never emit a bare key. Always include a colon and a value. INVALID: "points" VALID: "points": "".
  3. If a value cannot be extracted, use an empty string "". Example: "points": "".
  4. Follow this exact shape: {"points":"...","changePercentage":"...","change":"...","jump":"..."}
`;
const SCHEMA = {
  type: 'object',
  properties: {
    points: {
      type: 'number',
      description: 'The current points value (e.g., 25725.40).'
    },
    changePercentage: {
      type: 'number',
      description: 'The percentage change value without the % sign (e.g., 0.17).'
    },
    change: {
      type: 'number',
      description: 'The numerical point change value without the plus or minus sign (e.g., 42.65).'
    },
    jump: {
      type: 'string',
      enum: ['up', 'down'],
      description: "Indicates the direction of the change: 'up' for positive (+), 'down' for negative (-)."
    }
  },
  required: ['points', 'changePercentage', 'change', 'jump']
};

function preRepair(raw: string): string {
  return raw.replace(/"(points|changePercentage|change|jump)"(\s*[,}])/g, '"$1": ""$2');
}

function sanitizePayload(p: any): any {
  return {
    points: parseFloat(String(p.points ?? '').replace(/[^0-9.]/g, '')) || null,
    changePercentage: parseFloat(String(p.changePercentage ?? '').replace(/[^0-9.]/g, '')) || null,
    change: parseFloat(String(p.change ?? '').replace(/[^0-9.]/g, '')) || null,
    jump: ['up', 'down'].includes(p.jump) ? p.jump : null
  };
}

serve(async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env config' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;

    console.log('[fetch-nifty] Hitting shared for', TARGET_URL);
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        url: TARGET_URL,
        prompt: PROMPT,
        json_options: { schema: SCHEMA, user_prompt: PROMPT, extract_source: 'markdown' }
      })
    });

    if (!scrapeResp.ok) {
      console.error(`[fetch-nifty] shared responded non-OK: ${scrapeResp.status}`);
      return new Response(JSON.stringify({ error: `shared responded ${scrapeResp.status}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const scrape = await scrapeResp.json();
    console.log(`[fetch-nifty] shared returned source=${scrape.source} hasJson=${!!scrape.json}`);

    let payload: any = scrape?.json;
    console.log('[fetch-nifty] Raw JSON from shared:', String(payload).substring(0, 300));

    if (typeof payload === 'string') {
      try {
        const prePatched = preRepair(payload);
        payload = JSON.parse(jsonrepair(prePatched));
      } catch (e) {
        console.error('[fetch-nifty] JSON repair+parse failed:', e);
        console.error('[fetch-nifty] Full raw payload:', payload);
        payload = null;
      }
    }

    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ error: 'No JSON payload returned from shared' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitized = sanitizePayload(payload);
    console.log('[fetch-nifty] Sanitized payload:', JSON.stringify(sanitized));

    const row = {
      points: sanitized.points,
      change_percentage: sanitized.changePercentage,
      change: sanitized.change,
      jump: sanitized.jump,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('nifty_50_status').insert(row);
    if (error) {
      console.error('[fetch-nifty] DB insert failed:', error);
      return new Response(JSON.stringify({ error: 'Database insert failed', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: oldRows, error: selectError } = await supabase
      .from('nifty_50_status')
      .select('id')
      .order('updated_at', { ascending: false })
      .range(10, 10000);

    if (!selectError) {
      const ids = (oldRows || []).map((r: any) => r.id).filter(Boolean);
      if (ids.length > 0) {
        const { error: deleteError } = await supabase.from('nifty_50_status').delete().in('id', ids);
        if (deleteError) console.error('[fetch-nifty] Error deleting old rows:', deleteError);
      }
    }

    return new Response(JSON.stringify({ success: true, data: row }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[fetch-nifty] Unhandled error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});