import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const TARGET_URL = 'https://www.tickertape.in/indices/nifty-50-index-.NSEI';
const PROMPT = "From the given markdown find out today's status for Nifty 50: The value will be available between 'NIFTY 50 Share Price' and 'ETFs tracking NIFTY 50'. The first line in between these two tags should be ignored having value 'INDEX'.The second line will be like this : 25,725.40 __0.17 % (+42.65). The first number is current points. After '__' is the change % and the third value in the () will be the changed point with increase(+) and decrease (-). Your entire response should be this json.Do not provide any extra commentary or anything else";
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
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        url: TARGET_URL,
        prompt: PROMPT,
        watercrawlSchema: SCHEMA,
        useWatercrawl: true
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
      points: Number(payload.points),
      change_percentage: Number(payload.changePercentage),
      change: Number(payload.change),
      jump: String(payload.jump),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('nifty_50_status').insert(row);
    if (error) {
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
        const { error: deleteError } = await supabase
          .from('nifty_50_status')
          .delete()
          .in('id', ids);
        if (deleteError) {
        }
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
