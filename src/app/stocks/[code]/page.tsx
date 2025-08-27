
import { unstable_cache } from 'next/cache';
import {
  type StockMarketOverview,
  type StockInfo,
} from '@/ai/flows/get-stock-market-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AreaChart, ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import { GEMINI_API_KEY, ANYCRAWL_API_KEY } from '@/lib/constants';
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

// Function to fetch markdown from AnyCrawl API with retries
async function getEquityPanditMarkdown(stockCode: string): Promise<string | null> {
  if (!ANYCRAWL_API_KEY) {
    console.error('ANYCRAWL_API_KEY is not set.');
    return null;
  }
  const anycrawlUrl = "https://api.anycrawl.dev/v1/scrape";
  const headers = {
    'Authorization': `Bearer ${ANYCRAWL_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const urlToScrape = `https://www.equitypandit.com/historical-data/${stockCode}`;

  const engines = ['playwright', 'puppeteer'];

  for (const engine of engines) {
    try {
      console.log(`Attempting to scrape with ${engine}...`);
      const response = await fetch(anycrawlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: urlToScrape,
          engine: engine,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.markdown) {
          return result.data.markdown;
        }
      }
      console.error(`AnyCrawl request with ${engine} failed:`, response.status, await response.text());
    } catch (error) {
      console.error(`Error during AnyCrawl request with ${engine}:`, error);
    }
  }

  console.error('All AnyCrawl attempts failed.');
  return null;
}


const getStockData = unstable_cache(
  async (
    stockCode: string
  ): Promise<StockMarketOverview | null> => {
    
    const markdown = await getEquityPanditMarkdown(stockCode);
    const truncatedMarkdown = markdown ? markdown.substring(0, 5000) : null;

    if (!truncatedMarkdown) {
      return null;
    }

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
      Provide a stock market overview for the Indian stock market (NSE) for today, ${currentDate} IST.
      You are an expert data extractor and must return the following information in a structured JSON format only.

      1.  **watchedStock**: Extract only ${currentDate} IST Today's' Low / High price and name for the stock with the code: ${stockCode} from this markdown ${truncatedMarkdown}. The object must contain 'name', 'high', and 'low'.
      2.  **topGainers**: Get Today's ${currentDate} IST latest list of the top 10 gainers on the NSE based on https://www.hdfcsec.com/market/equity/top-gainer-nse?indicesCode=76394. For each stock, provide 'name', 'price', 'change', and 'changePercent'.
      3.  **topLosers**: Get Today's ${currentDate} IST latest list of the top 10 losers on the NSE based on https://www.hdfcsec.com/market/equity/top-loser-nse?indicesCode=76394. For each stock, provide 'name', 'price', 'change', and 'changePercent'.

      IMPORTANT: Your entire response must be ONLY a single, valid, minified JSON object. Do not include any text, explanations, or markdown formatting like \`\`\`json before or after the JSON object. The response must start with { and end with }.
    `;

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ url_context: {}}],
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
      
      // Handle the Gemini API response format
      const content = data.candidates?.[0]?.content;
      let jsonText = '';

      // Try to get text from parts if available (Gemini 1.5+ format)
      if (content?.parts?.[0]?.text) {
        jsonText = content.parts[0].text;
      } 
      // If no text in parts, try to get it directly from the content (older format)
      else if (content?.text) {
        jsonText = content.text;
      }
      // If still no text, try to stringify the entire response as a last resort
      else {
        console.warn('No text found in expected format, trying to use full response');
        jsonText = JSON.stringify(data);
      }

      if (!jsonText) {
        console.error('No valid response content found in API response:', data);
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
  params: { code: string };
}) {
   const paramAwait = await params;
   const stockCodeAwait = await paramAwait.code;
  const stockCode = stockCodeAwait || 'PVRINOX';
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