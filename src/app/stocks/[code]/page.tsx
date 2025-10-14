
import { unstable_cache } from 'next/cache';
import {
  type StockMarketOverview,
  type StockInfo,
} from '@/ai/flows/get-stock-market-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AreaChart, ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import { GEMINI_API_KEY, ANYCRAWL_API_KEY, WATERCRAWL_API_KEY } from '@/lib/constants';
import { WatchlistManager } from './watchlist-manager';

export const revalidate = 3600; // Revalidate the page every 1 hour
export const dynamic = 'force-static';

function safeJsonParse(jsonString: string): any | null {
  if (!jsonString) return null;
  try {
    const markdownMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      return JSON.parse(markdownMatch[1]);
    }
    const startIndex = jsonString.indexOf('{');
    const endIndex = jsonString.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const potentialJson = jsonString.substring(startIndex, endIndex + 1);
      return JSON.parse(potentialJson);
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(
      'Failed to parse JSON string:',
      error,
      'Original string:',
      jsonString
    );
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ScrapeResult = {
  source: 'anycrawl' | 'watercrawl';
  text: string;
} | null;

// Function to fetch text from AnyCrawl/Watercrawl with retries and fallbacks
async function getEquityPanditContent(stockCode: string): Promise<ScrapeResult> {
  let watercrawlRequestUuid: string | null = null;

  // Prepare Watercrawl request (initiate first, use as fallback)
  if (WATERCRAWL_API_KEY) {
    try {
      console.log('Initiating Watercrawl request...');
      const watercrawlPostResponse = await fetch("https://app.watercrawl.dev/api/v1/core/crawl-requests/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WATERCRAWL_API_KEY,
        },
        next: { revalidate: 3600 },
        keepalive: true,
        body: JSON.stringify({
          url: `https://www.equitypandit.com/share-price/${stockCode}`,
          options: {
            spider_options: {
              max_depth: 1,
              page_limit: 1,
            },
            page_options: {
              wait_time: 1000,
              only_main_content: true,
              timeout: 15000,
            },
            plugin_options: {
              openai_extract: {
                is_active: true,
                llm_model: "gpt-4o",
                extractor_schema: {
                  type: "object",
                  properties: { title: { type: "string" } },
                  required: ["title"],
                },
                prompt: "Extract the stock name, Today's High and Today's low value in markdown format",
              },
            },
          },
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

  // Try AnyCrawl first with two engines
  if (ANYCRAWL_API_KEY) {
    const anycrawlUrl = "https://api.anycrawl.dev/v1/scrape";
    const headers = {
      'Authorization': `Bearer ${ANYCRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const urlToScrape = `https://www.equitypandit.com/historical-data/${stockCode}`;
    const engines = ['playwright', 'puppeteer'];

    for (const engine of engines) {
      try {
        console.log(`Attempting to scrape with anycrawl engine: ${engine}...`);
        const response = await fetch(anycrawlUrl, {
          method: 'POST',
          headers,
          next: { revalidate: 3600 },
          keepalive: true,
          body: JSON.stringify({
            url: urlToScrape,
            engine: engine,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data?.markdown) {
            console.log(`Anyncrawl (${engine}) succeeded.`);
            return { source: 'anycrawl', text: result.data.markdown as string };
          }
        }
        console.error(`AnyCrawl request with ${engine} failed:`, response.status, await response.text());
      } catch (error) {
        console.error(`Error during AnyCrawl request with ${engine}:`, error);
      }
    }
  }

  // Fallback to Watercrawl results if we initiated a job
  console.error('All AnyCrawl attempts failed. Falling back to Watercrawl results.');
  if (watercrawlRequestUuid) {
    try {
      console.log('Checking for Watercrawl results...');

      const resultsUrl = `https://app.watercrawl.dev/api/v1/core/crawl-requests/${watercrawlRequestUuid}/results/`;
      const resultsResponse = await fetch(resultsUrl, {
        headers: { 'X-API-Key': WATERCRAWL_API_KEY as string },
        keepalive: true,
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultUrl = resultsData.results?.[0]?.result;
        if (resultUrl) {
          console.log('Fetching Watercrawl result content...');
          const contentResponse = await fetch(resultUrl, { keepalive: true });
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const markdown = contentData.markdown as string | undefined;
            if (markdown) {
              console.log('Successfully retrieved markdown from Watercrawl.');
              return { source: 'watercrawl', text: markdown };
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

// Extract the first two numbers between the two marker phrases
function extractLowHighBetweenMarkers(text: string): { low: string; high: string } | null {
  if (!text) return null;

  // Normalize whitespace to ensure robust matching across newlines/extra spaces
  console.log(text);
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

  // Find numeric tokens like 1,091.30 or 1110.60, optional +/-, commas, decimals.
  const numberTokens = slice.match(/[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[-+]?\d+(?:\.\d+)?/g);

  if (!numberTokens || numberTokens.length < 2) {
    // Sometimes there could be underscores or extra characters; we still only want numeric tokens
    console.error('Could not find two numeric values between markers.');
    return null;
  }

  const normalize = (s: string) => s.replace(/,/g, '').trim();
  const lowStr = normalize(numberTokens[0]);
  const highStr = normalize(numberTokens[1]);

  // Validate parsability
  const lowNum = parseFloat(lowStr);
  const highNum = parseFloat(highStr);
  if (Number.isNaN(lowNum) || Number.isNaN(highNum)) {
    console.error('Parsed numbers are invalid:', { lowStr, highStr });
    return null;
  }

  // Return as strings formatted without commas (consistent display)
  return { low: lowNum.toFixed(lowStr.includes('.') ? 2 : 2), high: highNum.toFixed(highStr.includes('.') ? 2 : 2) };
}

async function getTopGainersLosers(): Promise<{ topGainers: StockInfo[]; topLosers: StockInfo[] }> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return { topGainers: [], topLosers: [] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Only ask for gainers/losers now
  const prompt = `
    Provide a stock market overview slices ONLY for today's ${currentDate} IST NSE lists:
    1.  topGainers: Today's latest top 10 gainers on the NSE based on https://www.hdfcsec.com/market/equity/top-gainer-nse?indicesCode=76394. For each stock, provide 'name', 'price', 'change', and 'changePercent'.
    2.  topLosers: Today's latest top 10 losers on the NSE based on https://www.hdfcsec.com/market/equity/top-loser-nse?indicesCode=76394. For each stock, provide 'name', 'price', 'change', and 'changePercent'.

    IMPORTANT: Your entire response must be ONLY a single, valid, minified JSON object with two arrays: {"topGainers":[...],"topLosers":[...]}.
    Do not include any text, explanations, or markdown formatting. The response must start with { and end with }.
  `;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ url_context: {} }], // Kept as-is; not passing scraped markup anymore
  });

  try {
    let response: Response | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body,
        });

        if (response.ok) {
          break;
        } else {
          const errorBody = await response.text();
          if (attempt === 3) {
            console.error(
              `Gemini API request failed (attempt ${attempt}/3):`,
              response.status,
              errorBody
            );
          }
          if (attempt < 3) await sleep(5000);
        }
      } catch (err) {
        console.error(`Gemini API request error (attempt ${attempt}/3):`, err);
        if (attempt < 3) await sleep(5000);
      }
    }

    if (!response || !response.ok) {
      return { topGainers: [], topLosers: [] };
    }

    const data = await response.json();

    const content = data.candidates?.[0]?.content;
    let jsonText = '';
    if (content?.parts?.[0]?.text) {
      jsonText = content.parts[0].text;
    } else if (content?.text) {
      jsonText = content.text;
    } else {
      console.warn('No text found in expected format for Gemini response; attempting to stringify entire response');
      jsonText = JSON.stringify(data);
    }

    if (!jsonText) {
      console.error('No valid response content found in Gemini API response:', data);
      return { topGainers: [], topLosers: [] };
    }

    const parsed = safeJsonParse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      console.error('Parsed JSON is not a valid object for gainers/losers:', parsed);
      return { topGainers: [], topLosers: [] };
    }

    const topGainers: StockInfo[] = Array.isArray(parsed.topGainers) ? parsed.topGainers : [];
    const topLosers: StockInfo[] = Array.isArray(parsed.topLosers) ? parsed.topLosers : [];

    return { topGainers, topLosers };
  } catch (error) {
    console.error('Error fetching top gainers/losers from Gemini:', error);
    return { topGainers: [], topLosers: [] };
  }
}

const getStockData = unstable_cache(
  async (
    stockCode: string
  ): Promise<StockMarketOverview | null> => {
    try {
      // Run scraping (watched) and Gemini (gainers/losers) in parallel
      const watchedPromise = (async () => {
        try {
          const scraped = await getEquityPanditContent(stockCode);
          if (!scraped || !scraped.text) {
            console.error('Scrape content unavailable for watched stock.');
            return { name: stockCode, low: '-', high: '-' };
          }
          const extracted = extractLowHighBetweenMarkers(scraped.text);
          if (!extracted) {
            console.error('Extraction failed for watched stock low/high.');
            return { name: stockCode, low: '-', high: '-' };
          }
          return { name: stockCode, low: extracted.low, high: extracted.high };
        } catch (e) {
          console.error('Error while scraping/extracting watched stock:', e);
          return { name: stockCode, low: '-', high: '-' };
        }
      })();

      const glPromise = getTopGainersLosers();

      const [watchedStock, { topGainers, topLosers }] = await Promise.all([watchedPromise, glPromise]);

      // Validate minimal structure before returning
      const overview: StockMarketOverview = {
        watchedStock,
        topGainers: Array.isArray(topGainers) ? topGainers : [],
        topLosers: Array.isArray(topLosers) ? topLosers : [],
      };

      return overview;
    } catch (error) {
      console.error('Error building stock market overview:', error);
      // Return structure that lets the page render
      return {
        watchedStock: { name: stockCode, low: '-', high: '-' },
        topGainers: [],
        topLosers: [],
      };
    }
  },
  ['stock-overview'], // Cache key prefix (kept same to avoid changing existing caching mechanism)
  { revalidate: 3600 } // Revalidate every 1 hour
);

function StockCard({
  stock,
  variant,
}: {
  stock: StockInfo;
  variant: 'gainer' | 'loser';
}) {
  const isGainer = variant === 'gainer';
  const colorClass = isGainer ? 'text-green-600' : 'text-red-600';
  const bgClass = isGainer ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20';
  const borderClass = isGainer ? 'border-green-200 dark:border-green-900/30' : 'border-red-200 dark:border-red-900/30';

  return (
    <div className={`flex items-center justify-between rounded-xl border ${borderClass} ${bgClass} p-4 transition-all hover:shadow-md group`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm mb-1 truncate group-hover:text-primary transition-colors">{stock.name}</p>
        <p className="text-lg font-bold text-foreground">{stock.price}</p>
      </div>
      <div className={`text-right font-semibold ${colorClass} flex flex-col items-end gap-1`}>
        <div className="flex items-center gap-1">
          {isGainer ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          <span className="text-base">{stock.change}</span>
        </div>
        <span className="text-sm font-bold">{stock.changePercent}%</span>
      </div>
    </div>
  );
}

export default async function StocksPage({
  params,
}: {
  params: { code: string };
}) {
  const stockCode = params.code || 'PVRINOX';
  const overview = await getStockData(stockCode);

  if (!overview) {
    return (
      <div className="container py-12 md:py-16">
        <Alert variant="destructive" className="mx-auto max-w-2xl shadow-lg">
          <LineChart className="h-5 w-5" />
          <AlertTitle className="text-base font-semibold">Error Fetching Data</AlertTitle>
          <AlertDescription className="text-sm">
            Could not fetch stock market data. The service may be temporarily
            unavailable. Please try again later.
          </AlertDescription>
        </Alert>
        <div className="mt-8">
          <WatchlistManager stockCode={stockCode} />
        </div>
      </div>
    );
  }

  const sortedGainers = overview.topGainers
    ? [...overview.topGainers].sort(
        (a, b) => parseFloat(b.change) - parseFloat(a.change)
      )
    : [];

  const sortedLosers = overview.topLosers
    ? [...overview.topLosers]
        .filter(
          (stock) => stock.name.toLowerCase() !== 'hdfc bank ltd'
        )
        .sort((a, b) => parseFloat(a.change) - parseFloat(b.change))
    : [];

  return (
    <div className="container py-12 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl"></div>
          <AreaChart className="h-20 w-20 text-primary relative" />
        </div>
        <h1 className="font-headline gradient-text">
          Stock Market Overview
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed text-balance">
          Today's highlights from the National Stock Exchange (NSE).
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-7xl mx-auto">
        {overview.watchedStock && (
          <Card className="lg:col-span-3 card-hover border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-headline">
                Watching:{' '}
                <span className="gradient-text">
                  {overview.watchedStock.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around gap-6 text-center">
              <div className="flex-1 p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border border-green-200 dark:border-green-900/30">
                <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Today's High</p>
                <p className="text-3xl md:text-4xl font-bold text-green-600 font-headline">
                  {overview.watchedStock.high}
                </p>
              </div>
              <div className="flex-1 p-6 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border border-red-200 dark:border-red-900/30">
                <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Today's Low</p>
                <p className="text-3xl md:text-4xl font-bold text-red-600 font-headline">
                  {overview.watchedStock.low}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {sortedLosers.length > 0 && (
          <Card className="lg:col-span-1 card-hover border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-headline">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/30">
                  <ArrowDown className="h-5 w-5 text-red-600" />
                </div>
                Today's Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              {sortedLosers.map((stock) => (
                <StockCard key={stock.name} stock={stock} variant="loser" />
              ))}
            </CardContent>
          </Card>
        )}

        {sortedGainers.length > 0 && (
          <Card className="lg:col-span-2 card-hover border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-headline">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30">
                  <ArrowUp className="h-5 w-5 text-green-600" />
                </div>
                Today's Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sortedGainers.map((stock) => (
                <StockCard key={stock.name} stock={stock} variant="gainer" />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <WatchlistManager stockCode={stockCode} />
    </div>
  );
}
