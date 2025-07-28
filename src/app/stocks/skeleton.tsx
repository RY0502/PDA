import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function PageSkeleton() {
    return (
      <div className="container py-8">
        <header className="mb-8 text-center">
          <Skeleton className="mx-auto h-12 w-48" />
          <Skeleton className="mx-auto mt-4 h-6 w-64" />
        </header>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Main Stock */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="flex justify-around gap-4 text-center">
              {[1, 2].map((i) => (
                <div key={i} className="flex-1">
                  <Skeleton className="mx-auto h-6 w-24" />
                  <Skeleton className="mx-auto mt-2 h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
          {/* Gainers and Losers */}
          {[...Array(2)].map((_, colIndex) => (
            <Card key={colIndex} className={colIndex === 0 ? 'lg:col-start-1 lg:col-span-2' : 'lg:col-span-1'}>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="w-1/2 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="w-1/4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  