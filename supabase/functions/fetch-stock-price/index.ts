import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ANYCRAWL_API_KEY = Deno.env.get('ANYCRAWL_API_KEY');
const WATERCRAWL_API_KEY = Deno.env.get('WATERCRAWL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function extractLowHighBetweenMarkers(text) {
  if (!text) return null;
  const normalized = text.replace(/\r/g, '');
  const startMarker = /Today's Low\s*Today's High/i;
  const endMarker = /52W Low\s*52W High/i;
  const startMatch = startMarker.exec(normalized);
  const endMatch = endMarker.exec(normalized);
  if (!startMatch || !endMatch) {
    console.error('Markers not found while extracting low/high.');
    return null;
  }
  const startIdx = startMatch.index + startMatch[0].length;
  const endIdx = endMatch.index;
  if (endIdx <= startIdx) {
    console.error('Invalid marker range while extracting low/high.');
    return null;
  }
  const slice = normalized.slice(startIdx, endIdx);
  const numberTokens = slice.match(/[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[-+]?\d+(?:\.\d+)?/g);
  if (!numberTokens || numberTokens.length < 2) {
    console.error('Could not find two numeric values between markers.');
    return null;
  }
  const normalize = (s)=>s.replace(/,/g, '').trim();
  const lowStr = normalize(numberTokens[0]);
  const highStr = normalize(numberTokens[1]);
  const lowNum = parseFloat(lowStr);
  const highNum = parseFloat(highStr);
  if (Number.isNaN(lowNum) || Number.isNaN(highNum)) {
    console.error('Parsed numbers are invalid:', {
      lowStr,
      highStr
    });
    return null;
  }
  return {
    low: lowNum.toFixed(2),
    high: highNum.toFixed(2)
  };
}
async function getEquityPanditMarkdown(stockCode) {
  let watercrawlRequestUuid = null;
  if (WATERCRAWL_API_KEY) {
    try {
      console.log('Initiating Watercrawl request...');
      const watercrawlPostResponse = await fetch("https://app.watercrawl.dev/api/v1/core/crawl-requests/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WATERCRAWL_API_KEY
        },
        body: JSON.stringify({
          url: `https://www.equitypandit.com/share-price/${stockCode}`,
          options: {
            spider_options: {
              max_depth: 1,
              page_limit: 1
            },
            page_options: {
              wait_time: 1000,
              only_main_content: true,
              timeout: 15000
            },
            plugin_options: {
              openai_extract: {
                is_active: true,
                llm_model: "gpt-4o",
                extractor_schema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string"
                    }
                  },
                  required: [
                    "title"
                  ]
                },
                prompt: "Extract the stock name, Today's High and Today's low value in markdown format"
              }
            }
          }
        })
      });
      if (watercrawlPostResponse.ok) {
        const responseData = await watercrawlPostResponse.json();
        watercrawlRequestUuid = responseData.uuid;
        console.log(`Watercrawl request initiated with UUID: ${watercrawlRequestUuid}`);
      } else {
        console.error('Failed to initiate Watercrawl request:', watercrawlPostResponse.status, await watercrawlPostResponse.text());
      }
    } catch (error) {
      console.error('Error initiating Watercrawl request:', error);
    }
  }
  if (ANYCRAWL_API_KEY) {
    const anycrawlUrl = "https://api.anycrawl.dev/v1/scrape";
    const headers = {
      'Authorization': `Bearer ${ANYCRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    };
    const urlToScrape = `https://www.equitypandit.com/share-price/${stockCode}`;
    const engines = [
      'playwright',
      'puppeteer'
    ];
    for (const engine of engines){
      try {
        console.log(`Attempting to scrape with anycrawl engine: ${engine}...`);
        const response = await fetch(anycrawlUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: urlToScrape,
            engine
          })
        });
        if (response.ok) {
          const result = await response.json();
          if (result.data?.markdown) {
            console.log(`AnyCrawl (${engine}) succeeded.`);
            return result.data.markdown;
          }
        }
        console.error(`AnyCrawl request with ${engine} failed:`, response.status, await response.text());
      } catch (error) {
        console.error(`Error during AnyCrawl request with ${engine}:`, error);
      }
    }
  }
  console.error('All AnyCrawl attempts failed. Falling back to Watercrawl results.');
  if (watercrawlRequestUuid) {
    try {
      console.log('Checking for Watercrawl results...');
      const resultsUrl = `https://app.watercrawl.dev/api/v1/core/crawl-requests/${watercrawlRequestUuid}/results/`;
      const resultsResponse = await fetch(resultsUrl, {
        headers: {
          'X-API-Key': WATERCRAWL_API_KEY
        }
      });
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultUrl = resultsData.results?.[0]?.result;
        if (resultUrl) {
          console.log('Fetching Watercrawl result content...');
          const contentResponse = await fetch(resultUrl);
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const markdown = contentData.markdown;
            if (markdown) {
              console.log('Successfully retrieved markdown from Watercrawl.');
              return markdown;
            }
            console.error('Markdown not found in Watercrawl result:', contentData);
          } else {
            console.error('Failed to fetch Watercrawl result content:', contentResponse.status, await contentResponse.text());
          }
        } else {
          console.error('Watercrawl result URL not found in API response:', resultsData);
        }
      } else {
        console.error('Failed to fetch Watercrawl results:', resultsResponse.status, await resultsResponse.text());
      }
    } catch (error) {
      console.error('Error fetching Watercrawl results:', error);
    }
  }
  console.error('All scraping attempts failed.');
  return null;
}
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
    const markdown = await getEquityPanditMarkdown(stockCode);
    if (!markdown) {
      throw new Error('Failed to get markdown');
    }
    const extractedData = extractLowHighBetweenMarkers(markdown);
    if (!extractedData) {
      throw new Error('Failed to extract high/low data from markdown');
    }
    // Extract stock name from the markdown content
    let nameMatch = '';
    const phraseRegex = /What\s+is\s+the\s+Share\s+price\s+of\s+(.+?)\?/;
    const phraseMatch = markdown.match(phraseRegex);
    if (phraseMatch && phraseMatch[1]) {
      nameMatch = phraseMatch[1].trim();
    }
    if (nameMatch === '') {
      const h1Match = markdown.match(/^#\s*(.+)$/m);
      if (h1Match && h1Match[1]) {
        nameMatch = h1Match[1].trim();
      }
    }
    const stockName = nameMatch ? nameMatch : stockCode;
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
