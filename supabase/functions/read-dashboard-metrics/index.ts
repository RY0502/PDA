import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const url = new URL(req.url);
    const metric = (url.searchParams.get('metric') || '').toLowerCase();
    if (!metric || (metric !== 'nifty' && metric !== 'aqi')) {
      return new Response(JSON.stringify({ error: 'Invalid metric. Use "nifty" or "aqi".' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    if (metric === 'nifty') {
      const { data, error } = await supabase
        .from('nifty_50_status')
        .select('points, change_percentage, change, jump, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: 'DB error', details: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (!data) {
        return new Response(JSON.stringify({ error: 'No data' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const res = {
        points: Number((data as any).points),
        changePercentage: Number((data as any).change_percentage),
        change: Number((data as any).change),
        jump: String((data as any).jump)
      };
      return new Response(JSON.stringify(res), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const { data, error } = await supabase
        .from('delhi_aqi_status')
        .select('aqi, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: 'DB error', details: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (!data) {
        return new Response(JSON.stringify({ error: 'No data' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const res = {
        aqi: Number((data as any).aqi)
      };
      return new Response(JSON.stringify(res), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
