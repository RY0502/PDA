import { getLatestFootballNews } from '@/ai/flows/get-latest-football-news';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Newspaper } from 'lucide-react';

// Revalidate the page every hour
export const revalidate = 3600;

export default async function FootballPage() {
  const { articles } = await getLatestFootballNews({});

  return (
    <div className="container py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <Newspaper className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Football News
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Top football headlines from across the web, powered by AI.
        </p>
      </section>

      <div className="grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Card key={article.url} className="flex flex-col">
            <CardHeader className="flex-grow">
              <CardTitle className="text-lg leading-snug">{article.title}</CardTitle>
              <CardDescription className="break-all">{article.url}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  Read Full Story
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
