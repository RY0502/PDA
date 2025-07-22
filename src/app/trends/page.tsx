import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp } from 'lucide-react';
import type { TrendingSearch } from '@/ai/flows/fetch-trending-searches';

// Revalidate the page every hour
export const revalidate = 3600;

export default async function TrendsPage() {
  const trendingTopics: TrendingSearch[] = await fetchTrendingSearches();

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <TrendingUp className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Daily Trends
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Today's top Google search trends in India.
        </p>
      </section>

      <div className="mx-auto max-w-2xl py-10">
        <div className="flex flex-col gap-4">
          {trendingTopics.length > 0 ? (
            trendingTopics.map((item, index) => (
              <Card key={index}>
                <CardContent className="flex items-center justify-between p-4">
                  <span className="text-lg font-medium">{item.query}</span>
                  <Button asChild variant="ghost" size="sm">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      View Trend
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Could not fetch trending topics at this time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
