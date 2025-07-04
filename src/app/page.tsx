'use client';

import { Suspense, useEffect, useState } from 'react';
import { getMediumArticles, MediumArticle, MediumArticleResponse } from '@/services/email-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

function ArticleCard({ article }: { article: MediumArticle }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="line-clamp-2 text-xl">{article.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="line-clamp-3">{article.description}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <a href={`https://freedium.cfd/${article.url}`} target="_blank" rel="noopener noreferrer">
            Read More
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ArticleSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-lg">
      <CardHeader>
        <Skeleton className="h-7 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

function HomePageContent() {
  const [response, setResponse] = useState<MediumArticleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await getMediumArticles();
        setResponse(res);
      } catch (e: any) {
        console.error('Failed to fetch articles:', e);
        setError('An unexpected error occurred while fetching articles.');
      }
    }
    fetchArticles();
  }, []);

  const articles = response?.articles;
  const isMock = response?.isMock;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Your Daily Brief</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The latest articles from your Medium digest, powered by AI.
        </p>
      </header>

      {isMock && (
        <Alert className="mb-8">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Displaying Mock Data</AlertTitle>
          <AlertDescription>
            The Gmail API is not configured. To see your latest Medium articles, please follow the setup instructions.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-8">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!response && !error
          ? Array.from({ length: 8 }).map((_, i) => <ArticleSkeleton key={i} />)
          : articles?.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>

      {!error && response && articles?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No articles found in your latest Medium email.</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
