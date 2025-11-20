import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function cleanJsonResponse(text) {
  // Remove markdown code block wrappers if present
  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
}
function extractGeminiJsonText(geminiData) {
  const parts = geminiData?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts){
    if (typeof part?.text === 'string' && part.text.trim()) {
      return part.text.trim();
    }
    const inline = part?.inlineData?.data;
    if (inline && typeof inline === 'string') {
      try {
        const decoded = atob(inline);
        if (decoded && decoded.trim()) {
          return decoded.trim();
        }
      } catch (_e) {
      // ignore base64 decode errors
      }
    }
  }
  return null;
}
serve(async ()=>{
  try {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const headers = {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json'
    };
    const prompt = `
      Using ONLY real-time web version of the web page get Today's ${currentDate} IST latest list of the top 10 gainers from the past 24 hours on the NSE based on https://www.hdfcsec.com/market/equity/top-gainer-nse?indicesCode=76394.
      For each stock, provide 'name', 'price', 'change', and 'changePercent'.
      Return ONLY a single, valid, minified JSON object with a 'topGainers' key. Do not include any text, explanations, or markdown formatting.
    `;
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      tools: [
        {
          url_context: {}
        }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    });
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers,
      body
    });
    if (!geminiResponse.ok) {
      throw new Error(`Failed to fetch from Gemini: ${await geminiResponse.text()}`);
    }
    const geminiData = await geminiResponse.json();
    const rawJsonText = extractGeminiJsonText(geminiData);
    if (!rawJsonText) {
      throw new Error('No content found in Gemini response');
    }
    const cleanedJsonText = cleanJsonResponse(rawJsonText);
    const { topGainers } = JSON.parse(cleanedJsonText);
    if (!topGainers || !Array.isArray(topGainers)) {
      throw new Error('Invalid data format from Gemini');
    }
    const { error } = await supabase.from('top_gainers').insert(topGainers.map((gainer)=>({
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
    // Delete old records
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase.from('top_gainers').delete().lt('updated_at', twoDaysAgo);
    if (deleteError) {
      console.error('Error deleting old top gainers:', deleteError);
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in fetch-top-gainers function:', error);
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
