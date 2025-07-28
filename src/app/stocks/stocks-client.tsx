
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getStockMarketOverview,
  type StockMarketOverview,
} from '@/ai/flows/get-stock-market-overview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AreaChart, ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import PageSkeleton from './skeleton';

function StockCard({
  stock,
}: {
  stock: {
    name: string;
    price: string;
    change: string;
    changePercent: string;
  };
}) {
  const changeValue = stock.change || '';
  const isGainer = changeValue.startsWith('+');
  const isLoser = changeValue.startsWith('-');
  const colorClass = isGainer
    ? 'text-green-600'
    : isLoser
    ? 'text-red-600'
    : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between rounded-md bg-muted p-3">
      <div>
        <p className="font-semibold text-foreground">{stock.name}</p>
        <p className="text-sm text-muted-foreground">{stock.price}</p>
      </div>
      <div className={`text-right text-sm font-medium ${colorClass}`}>
        <p>{changeValue}</p>
        <p>{stock.changePercent}</p>
      </div>
    </div>
  );
}

function WatchlistManager({ stockCode }: { stockCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(stockCode);

  const handleUpdate = () => {
    if (code.trim()) {
      router.push(`/stocks?code=${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Watch Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label htmlFor="stock-code-input">Stock Code</Label>
              <Input
                id="stock-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., RELIANCE"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              />
            </div>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StocksPageClient({
  initialData,
  stockCode,
}: {
  initialData: StockMarketOverview | null;
  stockCode: string;
}) {
  const [overview, setOverview] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const currentCode = searchParams.get('code') || 'PVRINOX';

  useEffect(() => {
    if (currentCode !== stockCode) {
      setLoading(true);
      getStockMarketOverview({ stockCode: currentCode })
        .then(data => {
          setOverview(data);
        })
        .catch(() => {
          setOverview(null);
        })
        .finally(() => {
            setLoading(false);
        });
    } else {
        setOverview(initialData)
    }
  }, [currentCode, stockCode, initialData]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!overview) {
     return (
        <div className="container py-8">
             <Alert variant="destructive" className="mx-auto max-w-2xl">
              <LineChart className="h-4 w-4" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>
                Could not fetch stock market data. The service may be temporarily unavailable or you have exceeded your API quota. Please try again later.
              </AlertDescription>
            </Alert>
            <WatchlistManager stockCode={stockCode} />
        </div>
    )
  }

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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {overview.watchedStock && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>
                Watching: <span className="text-primary">{overview.watchedStock.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around gap-4 text-center">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Today's High</p>
                <p className="text-2xl font-bold text-green-600">
                  {overview.watchedStock.high}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Today's Low</p>
                <p className="text-2xl font-bold text-red-600">
                  {overview.watchedStock.low}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {overview.topGainers && (
          <Card className="md:col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUp className="h-6 w-6 text-green-600" />
                Top 10 Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {overview.topGainers.map((stock) => (
                <StockCard key={stock.name} stock={stock} />
              ))}
            </CardContent>
          </Card>
        )}

        {overview.topLosers && (
          <Card className="md:col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDown className="h-6 w-6 text-red-600" />
                Top 10 Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {overview.topLosers.map((stock) => (
                <StockCard key={stock.name} stock={stock} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <WatchlistManager stockCode={currentCode} />
    </div>
  );
}
