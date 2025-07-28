import { Suspense } from 'react';
import {
  getStockMarketOverview,
  type StockMarketOverview,
} from '@/ai/flows/get-stock-market-overview';
import StocksPageClient from './stocks-client';
import PageSkeleton from './skeleton';

async function StocksData({ stockCode }: { stockCode: string }) {
  const initialData = await getStockMarketOverview({ stockCode });
  return <StocksPageClient initialData={initialData} stockCode={stockCode} />;
}

export default function StocksPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const stockCode = (searchParams?.code as string) || 'PVRINOX';

  return (
    <Suspense fallback={<PageSkeleton />}>
      <StocksData stockCode={stockCode} />
    </Suspense>
  );
}
