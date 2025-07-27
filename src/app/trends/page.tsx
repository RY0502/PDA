import { fetchTrendingSearches } from '@/ai/flows/fetch-trending-searches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

// Revalidate the page every hour
export const revalidate = 14400;

function TrendContent({ summary }: { summary: string }) {
  const parts = summary.split(/(\*\*.*?\*\*)/g).filter(part => part);

  return (
    <div className="whitespace-pre-line text-base text-muted-foreground">
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </div>
  );
}

export default async function TrendsPage() {
  const { summary } = await fetchTrendingSearches();

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <TrendingUp className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Daily Trends
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Today's top Google search trends, powered by AI.
        </p>
      </section>

      <div className="mx-auto max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Today's Top Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <TrendContent summary={summary} />
            ) : (
              <p className="text-muted-foreground">
                Could not fetch trending topics at this time.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
