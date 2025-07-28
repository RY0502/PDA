import { Suspense } from 'react';
import { getStockMarketOverview } from '@/ai/flows/get-stock-market-overview';
import StocksPageClient from '../stocks-client';
import PageSkeleton from '../skeleton';

export const revalidate = 3600; // Revalidate the page every 1 hour

async function StocksData({ stockCode }: { stockCode: string }) {
  const initialData = await getStockMarketOverview({ stockCode });
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
