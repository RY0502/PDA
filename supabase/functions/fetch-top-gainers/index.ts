import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async () => {
  try {
    const targetUrl = 'https://www.hdfcsec.com/market/equity/top-gainer-nse?indicesCode=76394';
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;
    const prompt = `
      Using the markdown source find the top 10 gainers for today. For each stock provide- 'name', 'price', 'change', and 'changePercent'.
      Return ONLY a single, valid, minified JSON object with a 'topGainers' key. Do not include any text, explanations, or markdown formatting.
    `;
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };
    const reqBody = {
      url: targetUrl,
      prompt,
      useWatercrawl: false
    };
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });
    if (!scrapeResp.ok) {
      console.error(`[fetch-top-gainers] website-data responded non-OK: ${scrapeResp.status}`);
      throw new Error(`Website-data function error: ${scrapeResp.status}`);
    }
    const scrape = await scrapeResp.json();
    console.log(`[fetch-top-gainers] website-data returned source=${scrape.source} hasJson=${!!scrape.json}`);
    const payload = scrape?.json;
    if (!payload || typeof payload !== 'object') {
      throw new Error('No JSON payload returned from website-data');
    }
    const topGainers = (payload as any).topGainers;
    if (!topGainers || !Array.isArray(topGainers)) {
      throw new Error('Invalid data format: missing topGainers array');
    }
    const { error } = await supabase.from('top_gainers').insert(topGainers.map((gainer: any) => ({
      name: gainer.name,
      price: gainer.price,
      change: gainer.change,
      change_percent: gainer.changePercent,
      updated_at: new Date().toISOString()
    })));
    if (error) {
      console.error('Error upserting top gainers:', error);
      throw error;
    }
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase.from('top_gainers').delete().lt('updated_at', twoDaysAgo);
    if (deleteError) {
      console.error('Error deleting old top gainers:', deleteError);
    }
    return new Response(JSON.stringify({ success: true }), {
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
