import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMediumArticles } from '@/services/email-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function Home() {
  const { articles, isMock } = await getMediumArticles();

  return (
    <div className="container max-w-screen-2xl py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 text-center md:pb-8">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
          Your Daily Briefing
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Latest articles curated for you from Medium.
        </p>
        {isMock && (
          <Alert className="mt-4 text-left">
            <Info className="h-4 w-4" />
            <AlertTitle>Displaying Mock Data</AlertTitle>
            <AlertDescription>
              To fetch live articles from your inbox, please add your Gmail API credentials to the <code>.env</code>{' '}
              file.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {articles.length > 0 ? (
        <div className="grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {articles.map((article) => (
            <Card key={article.id} className="flex flex-col">
              <CardHeader className="flex-grow">
                <CardTitle className="text-lg leading-snug">{article.title}</CardTitle>
                <CardDescription>From: {article.source}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/view?url=${encodeURIComponent(article.url)}`}>
                    Read Article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-lg text-muted-foreground">
            {isMock
              ? 'There was an issue fetching articles, and no mock data is available.'
              : 'No new Medium articles found in your Gmail account.'}
          </p>
        </div>
      )}
    </div>
  );
}
