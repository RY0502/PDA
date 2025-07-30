
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
    const markdownMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      return JSON.parse(markdownMatch[1]);
    }

    const braceMatch = jsonString.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]);
    }

    return null;
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

async function getStockData(
  stockCode: string
): Promise<StockMarketOverview | null> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    // Returning a specific structure for the component to handle
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `
      Provide a stock market overview for the Indian stock market (NSE) for today, ${currentDate}.
      You must return the following information in a structured JSON format only.

      1.  **watchedStock**: You must find today's high and low price for the stock with the code: "${stockCode}". The object must contain 'name', 'high', and 'low'. If you need to make a separate search to get this specific stock's data, do it. This field is mandatory.
      2.  **topGainers**: A list of the top 10 gainers on the NSE today. For each stock, provide its 'name', current 'price', price 'change', and percentage 'changePercent'.
      3.  **topLosers**: A list of the top 10 losers on the NSE today. For each stock, provide its 'name', current 'price', price 'change', and percentage 'changePercent'.

      Ensure the output is a valid JSON object only, with no extra text or markdown. The final output must start with { and end with }.
    `;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      // Use a shorter timeout for the API call itself to prevent long hangs
      signal: AbortSignal.timeout(15000), 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API request failed:', response.status, errorBody);
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
    
    // Validate the presence of nested properties before returning
    if (overview.watchedStock && overview.topGainers && overview.topLosers) {
      return overview;
    } else {
      console.error(
        'API response was missing one or more required fields (watchedStock, topGainers, topLosers).',
        overview
      );
      return null; // Return null if the structure is incomplete
    }

  } catch (error) {
    console.error('Error fetching stock market overview:', error);
    return null;
  }
}

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

  // This is the critical change: check for null overview and render an error state.
  if (!overview) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <LineChart className="h-4 w-4" />
          <AlertTitle>Error Fetching Data</AlertTitle>
          <AlertDescription>
            Could not fetch stock market data. The service may be temporarily
            unavailable, the API may have returned an invalid response, or you
            may have exceeded your API quota. Please try again later.
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
