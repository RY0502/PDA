
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { WatchlistManager } from './[code]/watchlist-manager';

export default function StocksLoading() {
  return (
    <div className="container animate-pulse py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="mt-4 h-10 w-3/5" />
        <Skeleton className="mt-4 h-6 w-4/5" />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="flex justify-around gap-4 text-center">
            <div className="flex-1 space-y-2">
              <Skeleton className="mx-auto h-8 w-24" />
              <Skeleton className="mx-auto h-5 w-20" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="mx-auto h-8 w-24" />
              <Skeleton className="mx-auto h-5 w-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-muted p-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="w-1/4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-muted p-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="w-1/4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      <WatchlistManager stockCode="PVRINOX" />

    </div>
  );
}
