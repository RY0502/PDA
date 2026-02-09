import { getMediumArticles } from '@/services/email-service';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Image as ImageIcon, Newspaper } from 'lucide-react';
import type { MediumArticle } from '@/services/email-service';
import { UrlOpener } from '@/components/url-opener';
import { registerKey } from '@/lib/global-cache';
import { MediumReadMoreButton } from '@/components/medium-read-more-button';
import { cn, slugify } from '@/lib/utils';
import Image from 'next/image';

// Revalidate the page every 6 hours
export const revalidate = 21600;

function ArticleCard({ article }: { article: MediumArticle }) {
  const truncatedAuthor =
    article.author && article.author.length > 25
      ? `${article.author.substring(0, 25)}...`
      : article.author;
  const anchorSlug = slugify(article.url || article.title || article.id);

  return (
    <Card id={`item-${anchorSlug}`} className="overflow-hidden card-hover border-border/50 bg-card/90 backdrop-blur-sm scroll-mt-16 shadow-lg hover:shadow-xl">
      <CardContent className="p-5 sm:p-6">
        <div className="flex gap-5 sm:gap-6">
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-muted to-muted/50 shadow-md ring-1 ring-border/50">
            {article.imageUrl ? (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-300 hover:scale-110"
                sizes="(max-width: 640px) 104px, 136px"
                data-ai-hint="article cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <div className="flex flex-grow flex-col">
            <div className="flex-grow">
              <CardTitle className="mb-1.5 sm:mb-2.5 line-clamp-3 text-base sm:text-lg leading-snug font-headline text-foreground hover:text-primary transition-colors">
                {article.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {article.description}
              </CardDescription>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                {article.author && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/60"></div>
                    <span className="font-semibold text-foreground/80">{truncatedAuthor}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MediumReadMoreButton url={article.url} />
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
  // Server-side batch register once per revalidation window
  try {
    (articles || []).forEach((a) => {
      if (a?.url) registerKey(a.url);
    });
  } catch {}

  return (
    <div className="container py-8 sm:py-12 md:py-16">
      <header className="mb-8 sm:mb-12 md:mb-14 text-center max-w-3xl mx-auto">
        <div className="relative mt-1 mb-6 inline-block">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-5 rounded-2xl shadow-lg ring-1 ring-primary/20">
            <Newspaper className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="font-headline gradient-text mb-5 text-5xl md:text-6xl font-bold">
          Your Daily Brief
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed text-balance max-w-2xl mx-auto">
          Discover the latest articles from Medium, curated and powered by AI technology.
        </p>
      </header>

      {isMock && (
        <Alert className="mb-12 max-w-3xl mx-auto border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg rounded-2xl">
          <Terminal className="h-5 w-5 text-primary" />
          <AlertTitle className="text-base font-semibold">Displaying Mock Data</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            The Gmail API is not configured. To see your latest Medium
            articles, please follow the setup instructions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 sm:gap-7 md:grid-cols-2 lg:gap-8 max-w-6xl mx-auto">
        {articles?.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {response && articles?.length === 0 && (
        <div className="py-20 text-center">
          <div className="inline-block p-6 rounded-2xl bg-muted/50 mb-4">
            <Newspaper className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          </div>
          <p className="text-lg text-muted-foreground font-medium">
            No articles found in your latest Medium email.
          </p>
        </div>
      )}

      <UrlOpener />
    </div>
  );
}
