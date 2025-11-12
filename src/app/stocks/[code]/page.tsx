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
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

export const revalidate = 3600; // Revalidate the page every 1 hour
export const dynamic = 'force-static';

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

const getStockData = unstable_cache(
  async (stockCode: string): Promise<StockMarketOverview | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('read-stock-data', {
      body: { stockCode },
    });

    if (error) {
      console.error('Error fetching stock data:', error);
      return null;
    }

    return data;
  },
  ['stock-overview'],
  { revalidate: 3600 }
);

function OverviewPageContent({ overview, stockCode }: { overview: StockMarketOverview | null, stockCode: string }) {
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

  const sortedLosers = Array.isArray(overview.topLosers)
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

        {/* Always render Losers card, even if empty */}
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

        {/* Always render Gainers card, even if empty */}
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
      </div>

      <WatchlistManager stockCode={stockCode} />
    </div>
  );
}

function StocksPageSkeleton() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl"></div>
          <div className="h-20 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4 animate-pulse"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-md w-1/2 animate-pulse mt-2"></div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-7xl mx-auto">
        <div className="lg:col-span-3 h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        <div className="lg:col-span-1 h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}

async function getWatchedStock(stockCode: string): Promise<StockInfo | null> {
  const cached = unstable_cache(
    async (): Promise<StockInfo | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('watched_stocks')
        .select('*')
        .eq('code', stockCode)
        .single();

      if (error) {
        console.error('Error fetching watched stock:', error);
        return null;
      }
      return data as StockInfo;
    },
    ['watched-stock', stockCode],
    { revalidate: 3600 }
  );
  return cached();
}

const getTopGainers = unstable_cache(
  async (): Promise<StockInfo[] | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('top_gainers')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching top gainers:', error);
      return null;
    }
    const mapped = (data ?? []).map((row: any) => ({
      name: row.name,
      price: row.price,
      change: row.change,
      changePercent: row.change_percent,
      updated_at: row.updated_at,
    }));
    return mapped as unknown as StockInfo[];
  },
  ['top-gainers'],
  { revalidate: 3600 }
);

const getTopLosers = unstable_cache(
  async (): Promise<StockInfo[] | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('top_losers')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching top losers:', error);
      return null;
    }
    const mapped = (data ?? []).map((row: any) => ({
      name: row.name,
      price: row.price,
      change: row.change,
      changePercent: row.change_percent,
      updated_at: row.updated_at,
    }));
    return mapped as unknown as StockInfo[];
  },
  ['top-losers'],
  { revalidate: 3600 }
);

function PageContent({
  watchedStock,
  topGainers,
  topLosers,
  stockCode,
}: {
  watchedStock: StockInfo | null;
  topGainers: StockInfo[] | null;
  topLosers: StockInfo[] | null;
  stockCode: string;
}) {
  const uniqueByName = (list: StockInfo[] | null): StockInfo[] => {
    if (!list) return [];
    const map = new Map<string, StockInfo>();
    for (const item of list) {
      const key = item.name.toLowerCase();
      const prev = map.get(key);
      const prevTime = prev && (prev as any).updated_at ? new Date((prev as any).updated_at).getTime() : -Infinity;
      const currTime = (item as any).updated_at ? new Date((item as any).updated_at).getTime() : -Infinity;
      if (!prev || currTime > prevTime) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  };

  const sortedGainers = uniqueByName(topGainers)
    ? [...uniqueByName(topGainers)].sort(
        (a, b) => parseFloat(b.change) - parseFloat(a.change)
      )
    : [];

  const sortedLosers = uniqueByName(topLosers)
    ? [...uniqueByName(topLosers)]
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
        {watchedStock && (
          <Card className="lg:col-span-3 card-hover border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-headline">
                Watching:{' '}
                <span className="gradient-text">
                  {watchedStock.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around gap-6 text-center">
              <div className="flex-1 p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border border-green-200 dark:border-green-900/30">
                <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Today's High</p>
                <p className="text-3xl md:text-4xl font-bold text-green-600 font-headline">
                  {watchedStock.high}
                </p>
              </div>
              <div className="flex-1 p-6 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border border-red-200 dark:border-red-900/30">
                <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Today's Low</p>
                <p className="text-3xl md:text-4xl font-bold text-red-600 font-headline">
                  {watchedStock.low}
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
                <StockCard key={`${stock.name}-${(stock as any).updated_at ?? ''}`} stock={stock} variant="loser" />
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
                <StockCard key={`${stock.name}-${(stock as any).updated_at ?? ''}`} stock={stock} variant="gainer" />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <WatchlistManager stockCode={stockCode} />
    </div>
  );
}

export default async function StocksPage({
  params,
}: {
  params: { code: string };
}) {
  const stockCode = params.code || 'PVRINOX';
  const [watchedStock, topGainers, topLosers] = await Promise.all([
    getWatchedStock(stockCode),
    getTopGainers(),
    getTopLosers(),
  ]);

  return (
    <Suspense fallback={<StocksPageSkeleton />}>
      <PageContent
        watchedStock={watchedStock}
        topGainers={topGainers}
        topLosers={topLosers}
        stockCode={stockCode}
      />
    </Suspense>
  );
}
