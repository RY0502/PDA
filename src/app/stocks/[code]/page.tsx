
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
  params: { code: string };
}) {
  const stockCode = params.code || 'PVRINOX';
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
          </Aler ...