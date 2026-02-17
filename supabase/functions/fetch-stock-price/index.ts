import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
serve(async (req)=>{
  try {
    // Fetch latest stock code from supabase 'stock_code' table by updated_at desc
    const { data: latestStockRow, error: fetchError } = await supabase.from('stock_code').select('code').order('updatedAt', {
      ascending: false
    }).limit(1).maybeSingle();
    if (fetchError) {
      console.error('Error fetching latest stock_code:', fetchError);
      return new Response(JSON.stringify({
        error: 'Database error fetching latest stock code'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (!latestStockRow || !latestStockRow.code) {
      console.error('No stock code found in stock_code table.');
      return new Response(JSON.stringify({
        error: 'No stock code available'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const stockCode = latestStockRow.code;
    console.log('Using stockCode from DB:', stockCode);
    const targetUrl = `https://www.equitypandit.com/share-price/${stockCode}`;
    const functionsUrl = `${SUPABASE_URL}/functions/v1/shared`;
    console.log(`[fetch-stock-price] Hitting website-data for ${targetUrl}`);
    const scrapeResp = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        url: targetUrl,
        prompt: "Extract the stock's name, today's High, and today's Low. Return ONLY a minified JSON object with keys: name (string), high (string or number), low (string or number). You should return high and low but not 52 week high and 52 week low. No extra text.",
        useWatercrawl: false
      })
    });
    if (!scrapeResp.ok) {
      console.error(`[fetch-stock-price] website-data responded non-OK: ${scrapeResp.status}`);
      throw new Error(`Shared function error: ${scrapeResp.status}`);
    }
    const scrape = await scrapeResp.json();
    console.log(`[fetch-stock-price] website-data returned source=${scrape.source} hasJson=${!!scrape.json} hasMarkdown=${!!scrape.markdown}`);
    if (!scrape.json || typeof scrape.json !== 'object') {
      throw new Error('No JSON data returned from scraper');
    }
    const j = scrape.json as any;
    const highVal = j.high ?? j.High;
    const lowVal = j.low ?? j.Low;
    if (highVal == null || lowVal == null) {
      throw new Error('Missing high/low in JSON data');
    }
    const highNum = parseFloat(String(highVal).toString().replace(/,/g, ''));
    const lowNum = parseFloat(String(lowVal).toString().replace(/,/g, ''));
    if (Number.isNaN(highNum) || Number.isNaN(lowNum)) {
      throw new Error('Invalid numeric values for high/low');
    }
    const extractedData = { high: highNum.toFixed(2), low: lowNum.toFixed(2) };
    let stockName = stockCode;
    if (typeof j.name === 'string' && j.name.trim().length > 0) {
      stockName = j.name.trim();
    } else if (typeof j.title === 'string' && j.title.trim().length > 0) {
      stockName = j.title.trim();
    }
    const { error } = await supabase.from('watched_stocks').upsert({
      code: stockCode,
      name: stockName,
      high: extractedData.high,
      low: extractedData.low,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'code'
    });
    if (error) {
      console.error('Error upserting watched stock:', error);
      throw error;
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in fetch-stock-price function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
