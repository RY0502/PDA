import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const TOP_LOSERS_KEY_URL = Deno.env.get('TOP_LOSERS_KEY_URL'); // env: URL that returns keys[...] JSON

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanJsonResponse(text: string) {
  // Remove markdown code block wrappers if present
  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
}

function extractGeminiJsonText(geminiData: any) {
  const parts = geminiData?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
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

async function fetchApiKeyWithRetries(url: string | null, maxAttempts = 3, baseDelayMs = 500): Promise<string | null> {
  if (!url) {
    console.error('TOP_LOSERS_KEY_URL is not set');
    return null;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Fetching API key (attempt ${attempt}) from ${url}...`);
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => '');
        console.error(`Key fetch failed (status ${resp.status}):`, bodyText);
        throw new Error(`Key fetch failed with status ${resp.status}`);
      }

      const json = await resp.json().catch((e) => {
        console.error('Error parsing key response JSON:', e);
        throw e;
      });

      const decrypted = json?.keys?.[0]?.vault_keys?.decrypted_value;
      if (decrypted && typeof decrypted === 'string') {
        console.log('Successfully retrieved decrypted API key.');
        return decrypted;
      } else {
        console.error('Decrypted key not found in response JSON:', json);
        throw new Error('Decrypted key not found');
      }
    } catch (err) {
      console.error(`Attempt ${attempt} to fetch API key failed:`, err?.message ?? err);
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        console.log(`Retrying after ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      } else {
        console.error('All attempts to fetch API key failed.');
        return null;
      }
    }
  }
  return null;
}

serve(async () => {
  try {
    // Retrieve API key from remote URL with retries
    const geminiApiKey = await fetchApiKeyWithRetries(TOP_LOSERS_KEY_URL, 3, 500);
    if (!geminiApiKey) {
      throw new Error('Unable to retrieve Gemini API key from configured URL');
    }

    const currentDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const headers = {
      'x-goog-api-key': geminiApiKey,
      'Content-Type': 'application/json'
    };

    const prompt = `
      Using ONLY real-time web version of the web page get Today's ${currentDate} IST latest list of the top 10 losers from the past 24 hours on the NSE based on https://www.hdfcsec.com/market/equity/top-loser-nse?indicesCode=76394.
      For each stock, provide 'name', 'price', 'change', and 'changePercent'.
      Return ONLY a single, valid, minified JSON object with a 'topLosers' key. Do not include any text, explanations, or markdown formatting.
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
        },
        {
          google_search: {}
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
    const { topLosers } = JSON.parse(cleanedJsonText);
    if (!topLosers || !Array.isArray(topLosers)) {
      throw new Error('Invalid data format from Gemini');
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

    // Delete old records older than 2 days
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});