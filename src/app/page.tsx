import { getMediumArticles } from '@/services/email-service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Image as ImageIcon } from 'lucide-react';
import type { MediumArticle } from '@/services/email-service';
import { UrlOpener } from '@/components/url-opener';
import Image from 'next/image';

// Revalidate the page every hour
export const revalidate = 3600;

function ArticleCard({ article }: { article: MediumArticle }) {
  return (
    <Card className="overflow-hidden rounded-lg transition-shadow duration-300 hover:shadow-xl">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {article.imageUrl ? (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                sizes="96px"
                className="object-cover"
                data-ai-hint="article cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex flex-grow flex-col justify-between">
            <div>
              <CardTitle className="mb-2 line-clamp-2 text-base leading-tight">
                {article.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-sm">
                {article.description}
              </CardDescription>
            </div>
            <div className="mt-3 flex justify-center">
              <Button asChild size="sm">
                <a
                  href={`https://freedium.cfd/${article.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read More
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  const response = await getMediumArticles();

  const articles = response?.articles;
  const isMock = response?.isMock;

  return (
    <div className="container py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Your Daily Brief
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The latest articles from your Medium digest, powered by AI.
        </p>
      </header>

      {isMock && (
        <Alert className="mb-8">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Displaying Mock Data</AlertTitle>
          <AlertDescription>
            The Gmail API is not configured. To see your latest Medium
            articles, please follow the setup instructions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {articles?.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {response && articles?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No articles found in your latest Medium email.
          </p>
        </div>
      )}

      <UrlOpener />
    </div>
  );
}
