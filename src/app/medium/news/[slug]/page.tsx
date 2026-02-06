import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { DetailsStream } from '@/components/details-stream';

export default function MediumArticleDetail({ searchParams }: { searchParams: { url?: string } }) {
  const urlParam = searchParams?.url || '';
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80);

  const anchorSlug = slugify(urlParam || 'medium');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container py-6 md:py-12 relative">
        <div className="mx-auto max-w-4xl">
          <Button 
            asChild 
            variant="ghost" 
            className="mb-8 group hover:bg-primary/10 transition-all duration-300 hover:scale-105"
          >
            <Link href={`/#item-${anchorSlug}`}>
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Back to News</span>
            </Link>
          </Button>

          <div className="mb-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
              
              <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.05),transparent_50%)]"></div>
                
                <div className="relative space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Medium Article</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{urlParam}</p>
                </div>
              </div>
            </div>
          </div>

          <DetailsStream tab="medium" title={urlParam} />

          <div className="mt-12 flex justify-center">
            <Button 
              asChild 
              size="lg" 
              className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
              aria-label="Back to list"
            >
              <Link href={`/#item-${anchorSlug}`}>
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
