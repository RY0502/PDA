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

// Move this INSIDE the cached function so it's also cached
async function getEquityPanditMarkdown(stockCode: string): Promise<string | null> {
  let watercrawlRequestUuid: string | null = null;
  if (WATERCRAWL_API_KEY) {
    try {
      console.log('Initiating Watercrawl request...');
      const watercrawlPostResponse = await fetch("https://app.watercrawl.dev/api/v1/core/crawl-requests/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WATERCRAWL_API_KEY,
        },
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
          body: JSON.stringify({
            url: urlToScrape,
            engine: engine,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data?.markdown) {
            console.log(`Anyncrawl (${engine}) succeeded.`);
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
        headers: { 'X-API-Key': WATERCRAWL_API_KEY },
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const markdown = resultsData.results?.[0]?.markdown
        if (markdown) {
            console.log('Successfully retrieved markdown from Watercrawl.');
            return markdown;
        }
        console.error('Markdown not found in Watercrawl result:', resultsData);
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

const getStockData = async (stockCode: string): Promise<StockMarketOverview | null> => {
  return unstable_cache(
    async () => {
      console.log(`Cache MISS for stock: ${stockCode}`);
      
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
              break;
            } else {
              const errorBody = await response.text();
              if(attempt==3) {
                console.error(
                  `API request failed (attempt ${attempt}/3):`,
                  response.status,
                  errorBody
                );
              }
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
        
        const content = data.candidates?.[0]?.content;
        let jsonText = '';

        if (content?.parts?.[0]?.text) {
          jsonText = content.parts[0].text;
        } else if (content?.text) {
          jsonText = content.text;
        } else {
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
    { 
      revalidate: 3600 // Cache for 1 hour
    }
  )();
};

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
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = await params;
  const stockCode = resolvedParams.code || 'PVRINOX';
  
  console.log(`Fetching data for stock: ${stockCode}`);
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