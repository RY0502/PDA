'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, ExternalLink, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type StockInfo } from '@/ai/flows/get-stock-market-overview';

const ALLOWED_EMAIL = 'ravi.y0102@gmail.com';

function getProfitProbabilityBadge(probability?: string | null) {
  const norm = (probability ?? '').trim().toLowerCase();
  if (norm === 'high') {
    return {
      label: 'High',
      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    };
  }
  if (norm === 'medium' || norm === 'med') {
    return {
      label: 'Medium',
      className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    };
  }
  if (norm === 'low') {
    return {
      label: 'Low',
      className: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    };
  }
  // null, empty, 'unsure' or unknown values -> grey badge
  const displayLabel = !probability || !probability.trim() || norm === 'unsure'
    ? 'Unsure'
    : probability.trim();

  return {
    label: displayLabel,
    className: 'bg-muted text-muted-foreground border-border/60',
  };
}

function StockCard({
  stock,
  variant,
}: {
  stock: StockInfo;
  variant: 'gainer' | 'loser';
}) {
  const isGainer = variant === 'gainer';
  const colorClass = isGainer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const bgClass = isGainer
    ? 'bg-gradient-to-br from-green-50/90 to-card dark:from-green-950/25 dark:to-card'
    : 'bg-gradient-to-br from-red-50/90 to-card dark:from-red-950/25 dark:to-card';
  const borderClass = isGainer ? 'border-green-200 dark:border-green-900/40' : 'border-red-200 dark:border-red-900/40';
  const glowClass = isGainer ? 'hover:shadow-green-200/50 dark:hover:shadow-green-900/20' : 'hover:shadow-red-200/50 dark:hover:shadow-red-900/20';

  const probBadge = getProfitProbabilityBadge(stock.profit_probability);

  return (
    <div className={`flex flex-col justify-between rounded-2xl border-2 ${borderClass} ${bgClass} p-4 sm:p-5 transition-all hover:shadow-lg ${glowClass} hover:-translate-y-0.5 group gap-4`}>
      {/* Top Header: Full Name and Price/Change */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 pr-1">
          <p className="font-bold text-foreground text-base sm:text-lg leading-snug break-words group-hover:text-primary transition-colors">
            {stock.name}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-headline tracking-tight">
              {stock.price}
            </span>
          </div>
        </div>

        <div className={`text-right font-semibold ${colorClass} flex flex-col items-end gap-1.5 shrink-0 pt-0.5`}>
          <div className="flex items-center gap-1">
            {isGainer ? (
              <ArrowUp className="h-5 w-5 stroke-[2.5]" />
            ) : (
              <ArrowDown className="h-5 w-5 stroke-[2.5]" />
            )}
            <span className="text-base sm:text-lg font-bold">{stock.change}</span>
          </div>
          <span className="text-xs sm:text-sm font-bold bg-white/95 dark:bg-gray-900/90 shadow-xs border border-border/50 px-2.5 py-0.5 rounded-lg">
            {stock.changePercent}%
          </span>
        </div>
      </div>

      {/* Bottom Footer: Profit Probability Tag & More Link */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Profit Prob:
          </span>
          <span className={`inline-flex items-center text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full border ${probBadge.className}`}>
            {probBadge.label}
          </span>
        </div>

        {stock.report_url ? (
          <a
            href={stock.report_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors shrink-0 px-2 py-1 rounded-md hover:bg-primary/5"
          >
            <span>More</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function processStockList(data: any[], variant: 'gainer' | 'loser' = 'gainer'): StockInfo[] {
  const mapped = (data ?? []).map((row: any) => ({
    name: row.name,
    price: row.price,
    change: row.change,
    changePercent: row.change_percent,
    report_url: row.report_url ?? null,
    profit_probability: row.profit_probability ?? null,
    updated_at: row.updated_at,
  }));

  const map = new Map<string, StockInfo>();
  for (const item of mapped) {
    const key = item.name.toLowerCase();
    const prev = map.get(key);
    const prevTime = prev && (prev as any).updated_at ? new Date((prev as any).updated_at).getTime() : -Infinity;
    const currTime = (item as any).updated_at ? new Date((item as any).updated_at).getTime() : -Infinity;
    if (!prev || currTime > prevTime) {
      map.set(key, item);
    }
  }

  const list = Array.from(map.values());
  if (variant === 'loser') {
    return list
      .filter((stock) => stock.name.toLowerCase() !== 'hdfc bank ltd')
      .sort((a, b) => parseFloat(a.change) - parseFloat(b.change));
  }
  return list.sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
}

export function GainersLosersSection({
  sortedGainers,
  sortedLosers = [],
}: {
  sortedGainers: StockInfo[];
  sortedLosers?: StockInfo[];
}) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkedAuth, setCheckedAuth] = useState<boolean>(false);

  const [gainers, setGainers] = useState<StockInfo[]>(sortedGainers);
  const [losers, setLosers] = useState<StockInfo[]>(sortedLosers ?? []);
  const [isRefreshingGainers, setIsRefreshingGainers] = useState<boolean>(false);
  const [isRefreshingLosers, setIsRefreshingLosers] = useState<boolean>(false);
  const [lastRefreshedGainers, setLastRefreshedGainers] = useState<string | null>(null);
  const [lastRefreshedLosers, setLastRefreshedLosers] = useState<string | null>(null);

  useEffect(() => {
    setGainers(sortedGainers);
  }, [sortedGainers]);

  useEffect(() => {
    setLosers(sortedLosers ?? []);
  }, [sortedLosers]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!isMounted) return;
        const email = data.user?.email ?? null;
        setIsAdmin(email === ALLOWED_EMAIL);
      } catch {
        if (isMounted) setIsAdmin(false);
      } finally {
        if (isMounted) setCheckedAuth(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setIsAdmin(email === ALLOWED_EMAIL);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshGainers = async () => {
    setIsRefreshingGainers(true);
    try {
      const { data, error } = await supabase
        .from('top_gainers')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(25);

      if (error) {
        console.error('Error refreshing top gainers from Supabase:', error);
        return;
      }

      if (data) {
        const processed = processStockList(data, 'gainer');
        setGainers(processed);
        const now = new Date();
        setLastRefreshedGainers(
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Error refreshing top gainers:', err);
    } finally {
      setIsRefreshingGainers(false);
    }
  };

  const refreshLosers = async () => {
    setIsRefreshingLosers(true);
    try {
      const { data, error } = await supabase
        .from('top_losers')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(25);

      if (error) {
        console.error('Error refreshing top losers from Supabase:', error);
        return;
      }

      if (data) {
        const processed = processStockList(data, 'loser');
        setLosers(processed);
        const now = new Date();
        setLastRefreshedLosers(
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Error refreshing top losers:', err);
    } finally {
      setIsRefreshingLosers(false);
    }
  };

  // Only render for admin email user
  if (!checkedAuth || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* Top Losers (hidden by default) */}
      {losers && losers.length > 0 && (
        <Card className="lg:col-span-1 card-hover border-border/50 bg-card/90 backdrop-blur-sm shadow-xl hidden">
          <CardHeader className="pb-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-3 text-xl font-headline">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 shadow-md">
                  <ArrowDown className="h-6 w-6 text-red-600" />
                </div>
                Today&apos;s Losers
              </CardTitle>
              <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                {losers.length} {losers.length === 1 ? 'Stock' : 'Stocks'}
              </span>
            </div>

            {/* Losers refresh button remains hidden */}
            <div className="mt-2.5 hidden items-center justify-between flex-wrap gap-2.5 pt-1 border-t border-border/40" aria-hidden="true">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshLosers}
                disabled={isRefreshingLosers}
                className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium gap-1.5 rounded-xl border-red-200 dark:border-red-900/40 bg-red-50/60 hover:bg-red-100/80 text-red-800 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-300 shadow-xs hover:shadow-sm transition-all"
              >
                <RotateCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshingLosers ? 'animate-spin' : ''}`} />
                <span>{isRefreshingLosers ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            {losers.map((stock) => (
              <StockCard key={`${stock.name}-${(stock as any).updated_at ?? ''}`} stock={stock} variant="loser" />
            ))}
          </CardContent>
        </Card>
      )}

      {gainers.length > 0 && (
        <Card className="lg:col-span-3 card-hover border-border/50 bg-card/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-headline">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950/40 shadow-md">
                  <ArrowUp className="h-6 w-6 text-green-600" />
                </div>
                Today&apos;s Gainers
              </CardTitle>
              <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                {gainers.length} {gainers.length === 1 ? 'Stock' : 'Stocks'}
              </span>
            </div>

            {/* Next line below Top gainer's heading: Responsive Refresh button */}
            <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2.5 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshGainers}
                disabled={isRefreshingGainers}
                className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium gap-1.5 rounded-xl border-green-200 dark:border-green-900/40 bg-green-50/60 hover:bg-green-100/80 text-green-800 dark:bg-green-950/30 dark:hover:bg-green-900/50 dark:text-green-300 shadow-xs hover:shadow-sm transition-all active:scale-95"
              >
                <RotateCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshingGainers ? 'animate-spin' : ''}`} />
                <span>{isRefreshingGainers ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              {lastRefreshedGainers && (
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                  Updated: {lastRefreshedGainers}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gainers.map((stock) => (
              <StockCard key={`${stock.name}-${(stock as any).updated_at ?? ''}`} stock={stock} variant="gainer" />
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
