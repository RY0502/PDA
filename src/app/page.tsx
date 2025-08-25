
import { getMediumArticles } from '@/services/email-service';
import { Button, buttonVariants } from '@/components/ui/button';
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
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Revalidate the page every 4 hours
export const revalidate = 14400;

function ArticleCard({ article }: { article: MediumArticle }) {
  const truncatedAuthor =
    article.author && article.author.length > 25
      ? `${article.author.substring(0, 25)}...`
      : article.author;

  return (
    <Card className="overflow-hidden rounded-lg transition-shadow duration-300 hover:shadow-xl">
      <CardContent className="p-3">
        <div className="flex gap-4">
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {article.imageUrl ? (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                sizes="96px"
                data-ai-hint="article cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex flex-grow flex-col">
            <div className="flex-grow">
              <CardTitle className="mb-1 line-clamp-3 text-base leading-tight">
                {article.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-sm">
                {article.description}
              </CardDescription>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                {article.author && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{truncatedAuthor}</span>
                  </div>
                )}
              </div>
              <Link
                href={`https://freedium.cfd/${article.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: 'sm' }), 'flex-shrink-0')}
              >
                Read More
              </Link>
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
          The latest articles from Medium, powered by AI.
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
