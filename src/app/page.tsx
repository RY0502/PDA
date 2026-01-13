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
import { Terminal, Image as ImageIcon, FileText } from 'lucide-react';
import type { MediumArticle } from '@/services/email-service';
import { UrlOpener } from '@/components/url-opener';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Revalidate the page every 6 hours
export const revalidate = 21600;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function ArticleCard({ article }: { article: MediumArticle }) {
  const truncatedAuthor =
    article.author && article.author.length > 25
      ? `${article.author.substring(0, 25)}...`
      : article.author;
  const anchorSlug = slugify(article.url || article.title || article.id);

  return (
    <Card id={`item-${anchorSlug}`} className="overflow-hidden card-hover border-border/50 bg-card/80 backdrop-blur-sm scroll-mt-16">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted/50">
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
              <CardTitle className="mb-2 line-clamp-3 text-lg leading-tight font-headline">
                {article.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                {article.description}
              </CardDescription>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                {article.author && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="font-semibold text-foreground/80">{truncatedAuthor}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/medium/news/${anchorSlug}?url=${encodeURIComponent(article.url)}`}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'flex-shrink-0 hover:bg-primary/10 text-primary'
                  )}
                  aria-label="Summary"
                >
                  <FileText className="h-4 w-4" />
                </Link>
                <Link
                  href={`https://freedium.cfd/${article.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: 'sm' }), 
                    'flex-shrink-0 shadow-sm hover:shadow-md transition-all'
                  )}
                >
                  Read More
                </Link>
              </div>
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
    <div className="container py-12 md:py-12">
      <header className="mb-12 text-center max-w-3xl mx-auto">
        <h1 className="font-headline gradient-text mb-4">
          Your Daily Brief
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed text-balance">
          Discover the latest articles from Medium, curated and powered by AI.
        </p>
      </header>

      {isMock && (
        <Alert className="mb-10 max-w-3xl mx-auto border-primary/20 bg-primary/5">
          <Terminal className="h-5 w-5 text-primary" />
          <AlertTitle className="text-base font-semibold">Displaying Mock Data</AlertTitle>
          <AlertDescription className="text-sm">
            The Gmail API is not configured. To see your latest Medium
            articles, please follow the setup instructions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 max-w-6xl mx-auto">
        {articles?.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {response && articles?.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">
            No articles found in your latest Medium email.
          </p>
        </div>
      )}

      <UrlOpener />
    </div>
  );
}
