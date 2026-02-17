import { unstable_cache } from 'next/cache';
import {
  type StockInfo,
  type WatchedStock,
} from '@/ai/flows/get-stock-market-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import { WatchlistManager } from './watchlist-manager';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

export const revalidate = 3600; // Revalidate the page every 1 hour
export const dynamic = 'force-static';

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
  const glowClass = isGainer ? 'hover:shadow-green-200/50 dark:hover:shadow-green-900/20' : 'hover:shadow-red-200/50 dark:hover:shadow-red-900/20';

  return (
    <div className={`flex items-center justify-between rounded-2xl border-2 ${borderClass} ${bgClass} p-4 transition-all hover:shadow-lg ${glowClass} hover:-translate-y-0.5 group`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm mb-1.5 truncate group-hover:text-primary transition-colors">{stock.name}</p>
        <p className="text-xl font-bold text-foreground font-headline">{stock.price}</p>
      </div>
      <div className={`text-right font-semibold ${colorClass} flex flex-col items-end gap-1.5`}>
        <div className="flex items-center gap-1.5">
          {isGainer ? (
            <ArrowUp className="h-5 w-5" />
          ) : (
            <ArrowDown className="h-5 w-5" />
          )}
          <span className="text-base font-bold">{stock.change}</span>
        </div>
        <span className="text-sm font-bold bg-white dark:bg-gray-900 px-2 py-0.5 rounded-lg">{stock.changePercent}%</span>
      </div>
    </div>
  );
}


function StocksPageSkeleton() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl"></div>
          <div className="h-24 w-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl w-3/4 animate-pulse"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-xl w-1/2 animate-pulse mt-2"></div>
      </div>
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-3 max-w-7xl mx-auto">
        <div className="lg:col-span-3 h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse shadow-lg"></div>
        <div className="lg:col-span-1 h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse shadow-lg"></div>
        <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse shadow-lg"></div>
      </div>
    </div>
  );
}

async function getWatchedStock(stockCode: string): Promise<WatchedStock | null> {
  const cached = unstable_cache(
    async (): Promise<WatchedStock | null> => {
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
      return data as WatchedStock;
    },
    ['watched-stock', stockCode],
    { revalidate: 3600 }
  );
  return cached();
}

const getLatestNifty = unstable_cache(
  async (): Promise<any | null> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) return null;
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/read-dashboard-metrics?metric=nifty`, {
        headers: { Authorization: `Bearer ${supabaseAnonKey}` }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data;
    } catch {
      return null;
    }
  },
  ['nifty-50-status-latest'],
  { revalidate: 900 }
);

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
  nifty,
}: {
  watchedStock: WatchedStock | null;
  topGainers: StockInfo[] | null;
  topLosers: StockInfo[] | null;
  stockCode: string;
  nifty: any | null;
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
    <div className="container py-6 sm:py-12 md:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center mb-6 sm:mb-10 md:mb-12">
        <div className="relative mt-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 p-5 rounded-2xl shadow-lg ring-1 ring-primary/20">
            <AreaChart className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="font-headline gradient-text text-5xl md:text-6xl font-bold">
          Stock Market Overview
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed text-balance">
          Today's highlights from the National Stock Exchange (NSE)
        </p>
      </section>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-3 max-w-7xl mx-auto">
        {watchedStock && (
          <Card className="lg:col-span-3 card-hover border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-5">
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">Watching:</span>
                <span className="gradient-text">{watchedStock.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-row items-stretch gap-6 flex-nowrap">
              <div className="basis-1/2 flex flex-col gap-4">
                <div className="p-4 sm:p-7 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-50 to-green-100/60 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-900/40 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 text-center">
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wider">Today's High</p>
                  <p className="text-2xl sm:text-4xl md:text-5xl font-bold text-green-600 font-headline">{watchedStock.high}</p>
                </div>
                <div className="p-4 sm:p-7 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50 to-red-100/60 dark:from-red-950/30 dark:to-red-900/20 border-2 border-red-200 dark:border-red-900/40 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 text-center">
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wider">Today's Low</p>
                  <p className="text-2xl sm:text-4xl md:text-5xl font-bold text-red-600 font-headline">{watchedStock.low}</p>
                </div>
              </div>
              <div className="basis-1/2 flex flex-col justify-center items-center relative pl-6 pr-2">
                <div className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 h-[80%] w-[3px] bg-primary/80 rounded-full" />
                {nifty ? (
                  <div className="flex flex-col gap-3 items-center text-center">
                    <div className="flex items-center gap-2">
                      <span className="text-lg md:text-xl font-bold">Nifty:</span>
                      {String(nifty.jump) === 'up' ? (
                        <ArrowUp className="h-10 w-10 text-green-600" strokeWidth={3} />
                      ) : (
                        <ArrowDown className="h-10 w-10 text-red-600" strokeWidth={3} />
                      )}
                    </div>
                    <div className="text-xl font-bold text-foreground">{nifty.points}</div>
                    <div className="text-base font-semibold text-muted-foreground">
                      {nifty.change} ({nifty.changePercentage}%)
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nifty data unavailable</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {sortedLosers.length > 0 && (
          <Card className="lg:col-span-1 card-hover border-border/50 bg-card/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-xl font-headline">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 shadow-md">
                  <ArrowDown className="h-6 w-6 text-red-600" />
                </div>
                Today's Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              {sortedLosers.map((stock) => (
                <StockCard key={`${stock.name}-${(stock as any).updated_at ?? ''}`} stock={stock} variant="loser" />
              ))}
            </CardContent>
          </Card>
        )}

        {sortedGainers.length > 0 && (
          <Card className="lg:col-span-2 card-hover border-border/50 bg-card/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-xl font-headline">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950/40 shadow-md">
                  <ArrowUp className="h-6 w-6 text-green-600" />
                </div>
                Today's Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
  const [watchedStock, topGainers, topLosers, nifty] = await Promise.all([
    getWatchedStock(stockCode),
    getTopGainers(),
    getTopLosers(),
    getLatestNifty(),
  ]);

  return (
    <Suspense fallback={<StocksPageSkeleton />}>
      <PageContent
        watchedStock={watchedStock}
        topGainers={topGainers}
        topLosers={topLosers}
        stockCode={stockCode}
        nifty={nifty}
      />
    </Suspense>
  );
}
