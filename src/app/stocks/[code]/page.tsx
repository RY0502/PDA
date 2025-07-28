import { Suspense, cache } from 'react';
import { getStockMarketOverview } from '@/ai/flows/get-stock-market-overview';
import StocksPageClient from '../stocks-client';
import PageSkeleton from '../skeleton';

export const revalidate = 3600; // Revalidate the page every 1 hour

const getCachedStockMarketOverview = cache(getStockMarketOverview);

async function StocksData({ stockCode }: { stockCode: string }) {
  const initialData = await getCachedStockMarketOverview({ stockCode });
  return <StocksPageClient initialData={initialData} stockCode={stockCode} />;
}

export default function StockCodePage({
  params,
}: {
  params: { code: string };
}) {
  const stockCode = params.code || 'PVRINOX';

  return (
    <Suspense fallback={<PageSkeleton />}>
      <StocksData stockCode={stockCode} />
    </Suspense>
  );
}
