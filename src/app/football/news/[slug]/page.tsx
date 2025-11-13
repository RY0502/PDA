import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { DetailsStream } from '@/components/details-stream';

export default function FootballNewsDetail({ searchParams }: { searchParams: { title?: string } }) {
  const titleParam = searchParams?.title || '';

  // Parse title for bold formatting
  const formatTitle = (title: string) => {
    return title
      .split(/(\*\*.*?\*\*)/g)
      .filter((p) => p)
      .map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <span key={i} className="text-primary font-bold">
            {part.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container py-8 md:py-12 relative">
        <div className="mx-auto max-w-4xl">
          {/* Back button with modern styling */}
          <Button 
            asChild 
            variant="ghost" 
            className="mb-8 group hover:bg-primary/10 transition-all duration-300 hover:scale-105"
          >
            <Link href="/football">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Back to News</span>
            </Link>
          </Button>

          {/* Hero section with modern card design */}
          <div className="mb-10">
            <div className="relative group">
              {/* Animated gradient border effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
              
              <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.05),transparent_50%)]"></div>
                
                {/* Content */}
                <div className="relative space-y-4">
                  {/* Category badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
                    <Newspaper className="h-3.5 w-3.5" />
                    <span>Football News</span>
                  </div>

                  {/* Title with enhanced typography */}
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-headline leading-tight text-balance">
                    {titleParam ? formatTitle(titleParam) : (
                      <span className="text-muted-foreground">News Detail</span>
                    )}
                  </h1>

                  {/* Decorative divider */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent rounded-full"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-accent/25 ring-1 ring-accent/25 opacity-80"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content stream */}
          <DetailsStream tab="football" title={titleParam} />

          {/* Bottom navigation with enhanced styling */}
          <div className="mt-12 flex justify-center">
            <Button 
              asChild 
              size="lg" 
              className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
              aria-label="Back to list"
            >
              <Link href="/football">
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to All News
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}