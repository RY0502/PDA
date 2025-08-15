
import { unstable_cache } from 'next/cache';
import {
  type StockMarketOverview,
  type StockInfo,
} from '@/ai/flows/get-stock-market-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AreaChart, ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import { GEMINI_API_KEY } from '@/lib/constants';
import { WatchlistManager } from './watchlist-manager';

export const revalidate = 3600; // Revalidate the page every 1 hour

function safeJsonParse(jsonString: string): any | null {
  if (!jsonString) return null;
  try {
    // First, try to find a JSON block wrapped in markdown
    const markdownMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      return JSON.parse(markdownMatch[1]);
    }

    // If no markdown block, find the first '{' and last '}'
    const startIndex = jsonString.indexOf('{');
    const endIndex = jsonString.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const potentialJson = jsonString.substring(startIndex, endIndex + 1);
      return JSON.parse(potentialJson);
    }

    // Fallback for when the string is just the JSON object itself.
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


// Simple sleep utility for retry backoff
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const getStockData = unstable_cache(
  async (
    stockCode: string
  ): Promise<StockMarketOverview | null> => {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set.');
      return null;
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

    const prompt = `
You are a financial data extractor for the Indian NSE. Work in IST.

Task date: ${currentDate} (IST). If today is an NSE holiday, use the most recent trading day before today. Always state the date you used in the JSON under asOfDate.

Data requirements (must-haves):
1) watchedStock:
   - Use the NSE stock code: "${stockCode}".
   - Return TODAY’S session high and low (NOT 52-week). If holiday, use last trading day’s session high/low.
   - Fields (required):
     - name: Official company name for the code on NSE (string)
     - high: session high price (string numeric, no commas/symbols, 2 decimals, e.g. "1234.50")
     - low: session low price (string numeric, no commas/symbols, 2 decimals)
2) topGainers (exactly 10 distinct NSE-listed equities):
   - TODAY’S session top 10 gainers by % change (descending).
   - Each item fields (required):
     - name (string)
     - price: last traded price (string numeric, 2 decimals, no commas/symbols)
     - change: absolute price change (string numeric, 2 decimals, sign allowed, e.g. "+12.30" or "-5.10")
     - changePercent: percent change (string numeric, 2 decimals, NO % symbol, e.g. "3.45")
3) topLosers (exactly 10 distinct NSE-listed equities):
   - TODAY’S session bottom 10 by % change (ascending).
   - Same fields and formats as topGainers.

Hard constraints (must follow):
- Instruments: equities only. Exclude indices, ETFs, derivatives.
- No duplicates across each list.
- Use Indian number format internally if needed, but output MUST be numeric strings as specified (no commas, no currency symbol).
- Time zone: IST session data only (or last trading day if holiday).
- Sorting: topGainers by changePercent desc, topLosers by changePercent asc.
- For watchedStock, DO NOT use 52-week values. Use intraday session high/low.

Grounding and sources:
- Use web search to verify values. Preferred sources in order:
  1) Official: nseindia.com
  2) Reputable financial sites: moneycontrol.com, reuters.com, bloomberg.com, investing.com
- If sources disagree, prefer NSE. If still ambiguous, prefer majority among reputable sources.
- Include a root-level sources array with unique URLs used.

Output format:
- Output ONLY one minified JSON object, no markdown, no commentary.
- JSON schema (extra keys allowed, but required keys must be present):
  {"asOfDate":"YYYY-MM-DD","isHoliday":boolean,"watchedStock":{"name":string,"high":string,"low":string},"topGainers":[{"name":string,"price":string,"change":string,"changePercent":string},...x10],"topLosers":[{"name":string,"price":string,"change":string,"changePercent":string},...x10],"sources":[string,...]}

Validation (perform internally before finalizing output):
- watchedStock.high > watchedStock.low (both parseable as floats).
- topGainers length = 10, topLosers length = 10.
- All price/change/changePercent strings parse as floats when removing leading '+'. changePercent has NO % sign.
- No duplicate names in each list.
- All names correspond to NSE-listed equities (not indices/ETFs).

Remember: Return only the single JSON object (minified). Start with { and end with }.`;

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
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
            break; // success
          } else {
            const errorBody = await response.text();
            console.error(
              `API request failed (attempt ${attempt}/3):`,
              response.status,
              errorBody
            );
            if (attempt < 3) await sleep(5000);
          }
        } catch (err) {
          console.error(`API request error (attempt ${attempt}/3):`, err);
          if (attempt < 3) await sleep(5000);
        }
      }

      if (!response || !response.ok) {
        return null;
      }

      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!jsonText) {
        console.error('No JSON text found in API response:', data);
        return null;
      }

      const overview: StockMarketOverview | null = safeJsonParse(jsonText);

      if (!overview || typeof overview !== 'object') {
        console.error('Parsed JSON is not a valid object:', overview);
        return null;
      }

      // Final validation: ensure all required nested properties exist before returning.
      if (overview.watchedStock && overview.topGainers && overview.topLosers) {
        return overview;
      } else {
        console.error(
          'API response was parsed but is missing required fields (watchedStock, topGainers, or topLosers).',
          overview
        );
        return null;
      }

    } catch (error) {
      console.error('Error fetching stock market overview:', error);
      return null;
    }
  },
  ['stock-overview'], // Cache key prefix
  { revalidate: 3600 } // Revalidate every 1 hour
);


function StockCard({
  stock,
  variant,
}: {
  stock: StockInfo;
  variant: 'gainer' | 'loser';
}) {
  const colorClass = variant === 'gainer' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex items-center justify-between rounded-md bg-muted p-3">
      <div>
        <p className="font-semibold text-foreground">{stock.name}</p>
        <p className="text-sm text-muted-foreground">{stock.price}</p>
      </div>
      <div className={`text-right text-sm font-medium ${colorClass}`}>
        <p>{stock.change}</p>
        <p>{stock.changePercent}%</p>
      </div>
    </div>
  );
}

export default async function StocksPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const stockCode = code || 'PVRINOX';
  const overview = await getStockData(stockCode);

  if (!overview) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <LineChart className="h-4 w-4" />
          <AlertTitle>Error Fetching Data</AlertTitle>
          <AlertDescription>
            Could not fetch stock market data. The service may be temporarily
            unavailable.Please try again later.
          </AlertDescription>
        </Alert>
        <WatchlistManager stockCode={stockCode} />
      </div>
    );
  }

  const sortedGainers = overview.topGainers
    ? [...overview.topGainers].sort(
        (a, b) => parseFloat(b.change) - parseFloat(a.change)
      )
    : [];

  const sortedLosers = overview.topLosers
    ? [...overview.topLosers].sort(
        (a, b) => parseFloat(a.change) - parseFloat(b.change)
      )
    : [];

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <AreaChart className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Stock Market Overview
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Today's highlights from the National Stock Exchange (NSE).
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {overview.watchedStock && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>
                Watching:{' '}
                <span className="text-primary">
                  {overview.watchedStock.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around gap-4 text-center">
              <div className="flex-1">
                <p className="text-2xl font-bold text-green-600">
                  {overview.watchedStock.high}
                </p>
                <p className="text-sm text-muted-foreground">Today's High</p>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-red-600">
                  {overview.watchedStock.low}
                </p>
                <p className="text-sm text-muted-foreground">Today's Low</p>
              </div>
            </CardContent>
          </Card>
        )}

        {sortedLosers.length > 0 && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDown className="h-6 w-6 text-red-600" />
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUp className="h-6 w-6 text-green-600" />
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
