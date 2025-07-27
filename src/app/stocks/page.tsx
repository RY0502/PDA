'use client';

import { getStockPrice, type StockPriceOutput } from '@/ai/flows/get-stock-price';
import { getTopGainers, type TopGainer } from '@/ai/flows/get-top-gainers';
import { getTopLosers, type TopLoser } from '@/ai/flows/get-top-losers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

export const revalidate = 7200; // Revalidate every 2 hours

function StockPriceCard({
  price,
  stockCode,
}: {
  price: StockPriceOutput;
  stockCode: string;
}) {
  const router = useRouter();
  const [newStockCode, setNewStockCode] = useState(stockCode);

  const handleUpdate = () => {
    if (newStockCode.trim()) {
      router.push(`/stocks?stockcode=${newStockCode.trim().toUpperCase()}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {price.companyName} ({price.stockCode})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-bold">{price.currentPrice}</p>
            <p className="text-sm text-muted-foreground">Current Price</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{price.highPrice}</p>
            <p className="text-sm text-muted-foreground">Day's High</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{price.lowPrice}</p>
            <p className="text-sm text-muted-foreground">Day's Low</p>
          </div>
        </div>
        <Separator className="my-6" />
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Label htmlFor="stock-code">Watch Code</Label>
            <Input
              id="stock-code"
              value={newStockCode}
              onChange={(e) => setNewStockCode(e.target.value)}
              placeholder="e.g. PVRINOX"
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
            />
          </div>
          <Button onClick={handleUpdate}>Update</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StockTable({
  stocks,
  title,
  variant,
}: {
  stocks: (TopGainer | TopLoser)[];
  title: string;
  variant: 'gainer' | 'loser';
}) {
  const isGainer = variant === 'gainer';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock) => (
              <TableRow key={stock.name}>
                <TableCell className="font-medium">{stock.name}</TableCell>
                <TableCell className="text-right">{stock.price}</TableCell>
                <TableCell
                  className={`flex items-center justify-end gap-1 text-right font-medium ${
                    isGainer ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isGainer ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  {stock.change}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StocksPageContent() {
  const searchParams = useSearchParams();
  const stockCode = searchParams.get('stockcode') || 'PVRINOX';
  
  const [price, setPrice] = useState<StockPriceOutput | null>(null);
  const [gainers, setGainers] = useState<TopGainer[]>([]);
  const [losers, setLosers] = useState<TopLoser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [priceData, gainersData, losersData] = await Promise.all([
        getStockPrice({ stockCode }),
        getTopGainers(),
        getTopLosers(),
      ]);
      setPrice(priceData);
      setGainers(gainersData);
      setLosers(losersData);
      setLoading(false);
    }
    fetchData();
  }, [stockCode]);

  if (loading) {
    return (
      <div className="container py-8">
        <p className="text-center text-muted-foreground">Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 pb-8 text-center">
        <LineChart className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Stock Market Overview
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Today's market snapshot, powered by AI.
        </p>
      </section>

      <div className="mx-auto max-w-3xl space-y-8">
        {price && <StockPriceCard price={price} stockCode={stockCode} />}
        {gainers.length > 0 && <StockTable stocks={gainers} title="Top 10 Gainers" variant="gainer" />}
        {losers.length > 0 && <StockTable stocks={losers} title="Top 10 Losers" variant="loser" />}
      </div>
    </div>
  );
}


export default function StocksPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StocksPageContent />
        </Suspense>
    )
}
