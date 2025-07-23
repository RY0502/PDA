import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';

// Revalidate the page every hour
export const revalidate = 3600;

export default async function FootballPage() {
  const { summary } = await getLatestFootballNews({});

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <Newspaper className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Football News
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          The latest headlines and transfer talk from the world of football, powered by AI.
        </p>
      </section>

      <div className="mx-auto max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Today's Top Stories</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
               <p className="whitespace-pre-line text-sm text-muted-foreground">
                {summary}
              </p>
            ) : (
              <p className="text-muted-foreground">No news to display at the moment.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
