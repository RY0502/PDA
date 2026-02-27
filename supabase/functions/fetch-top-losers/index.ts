import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const ANYCRAWL_API_KEY = Deno.env.get('LOSERS_ANYCRAWL_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async () => {
  try {
    const targetUrl = 'https://www.hdfcsec.com/market/equity/top-loser-nse?indicesCode=76394';
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;
    const prompt = `
      Using the markdown source find the top 10 losers for today. For each stock provide- 'name', 'price', 'change', and 'changePercent' and sort them descending based on change.
      Return ONLY a single, valid, minified JSON object with a 'topLosers' key. Do not include any text, explanations, or markdown formatting.
    `;
    if (!ANYCRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing AnyCrawl API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log(`[fetch-top-losers] Hitting shared for ${targetUrl}`);
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };
    const reqBody = {
      url: targetUrl,
      prompt,
      anycrawlApiKey: ANYCRAWL_API_KEY,
      useWatercrawl: false
    };
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });
    if (!scrapeResp.ok) {
      console.error(`[fetch-top-losers] website-data responded non-OK: ${scrapeResp.status}`);
      throw new Error(`Website-data function error: ${scrapeResp.status}`);
    }
    const scrape = await scrapeResp.json();
    console.log(`[fetch-top-losers] website-data returned source=${scrape.source} hasJson=${!!scrape.json}`);
    const payload = scrape?.json;
    if (!payload || typeof payload !== 'object') {
      throw new Error('No JSON payload returned from website-data');
    }
    const topLosers = (payload as any).topLosers;
    if (!topLosers || !Array.isArray(topLosers)) {
      throw new Error('Invalid data format: missing topLosers array');
    }
    const { error } = await supabase.from('top_losers').insert(topLosers.map((loser: any) => ({
      name: loser.name,
      price: loser.price,
      change: loser.change,
      change_percent: loser.changePercent,
      updated_at: new Date().toISOString()
    })));
    if (error) {
      console.error('Error inserting top losers:', error);
      throw error;
    }
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase.from('top_losers').delete().lt('updated_at', twoDaysAgo);
    if (deleteError) {
      console.error('Error deleting old top losers:', deleteError);
    }
    return new Response(JSON.stringify({ success: true }), {
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
