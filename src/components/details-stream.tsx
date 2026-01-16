"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, AlertCircle } from 'lucide-react';

export function DetailsStream({ tab, title }: { tab: 'football' | 'trends' | 'medium'; title: string }) {
  const [content, setContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title) return;
    setIsStreaming(true);
    setError(null);
    setContent('');
    const encodedTitle = encodeURIComponent(title);
    const es = new EventSource(`/api/gemini/stream?tab=${tab}&title=${encodedTitle}`);
    let hasReceived = false;

    es.onmessage = (event) => {
      const data = event.data;
      if (data === '[DONE]') {
        es.close();
        setIsStreaming(false);
        return;
      }
      try {
        const json = JSON.parse(data);
        let chunk = '';
        const c = json?.candidates?.[0];
        if (c?.content?.parts) {
          chunk = c.content.parts.map((p: any) => p.text || '').join('');
        } else if (json?.modelOutput?.outputText) {
          chunk = json.modelOutput.outputText;
        }
        if (chunk) {
          hasReceived = true;
          setContent((prev) => prev + chunk);
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
      if (!hasReceived) {
        setError('Unable to stream summary. Please try later.');
      }
    };

    return () => {
      es.close();
    };
  }, [tab, title]);

  // Format content with better typography
  const formatContent = (text: string) => {
    const sections = text.split('\n\n').filter(Boolean);
    const renderWithBold = (t: string) => {
      const parts = t.split(/(\*\*.*?\*\*)/g).filter(Boolean);
      return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-bold text-primary">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      );
    };
    
    return sections.map((section, idx) => {
      // Check if it's a heading (starts with # or is all caps short text)
      if (section.startsWith('#')) {
        const level = section.match(/^#+/)?.[0].length || 1;
        const headingText = section.replace(/^#+\s*/, '');
        const HeadingTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag 
            key={idx} 
            className="font-headline font-bold text-foreground mt-8 mb-4 first:mt-0"
          >
            {headingText}
          </HeadingTag>
        );
      }
      
      // Check if it's a list item
      if (section.match(/^[-*•]\s/)) {
        const items = section.split('\n').filter(Boolean);
        return (
          <ul key={idx} className="space-y-3 my-6">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80 leading-relaxed">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5"></span>
                <span className="flex-1">{renderWithBold(item.replace(/^[-*•]\s/, ''))}</span>
              </li>
            ))}
          </ul>
        );
      }
      
      // Regular paragraph
      return (
        <p key={idx} className="text-base md:text-lg leading-relaxed text-foreground/80 mb-6">
          {renderWithBold(section)}
        </p>
      );
    });
  };

  return (
    <div className="relative">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      
      <Card className="relative border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
        
        <CardContent className="p-8 md:p-12">
          {error ? (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold mb-2">Unable to Load Content</AlertTitle>
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {content ? (
                <div className="animate-in fade-in duration-500">
                  {formatContent(content)}
                  {isStreaming && (
                    <div className="inline-flex items-center gap-2 text-primary/60 animate-pulse">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">Generating...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 md:py-24">
                  {isStreaming ? (
                    <div className="space-y-6 w-full max-w-2xl">
                      {/* Modern skeleton loader */}
                      <div className="flex items-center gap-4 mb-8">
                        <div className="relative">
                          <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-foreground">Streaming details...</p>                        </div>
                      </div>
                      
                      {/* Skeleton content */}
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-muted rounded-full w-3/4"></div>
                        <div className="h-4 bg-muted rounded-full w-full"></div>
                        <div className="h-4 bg-muted rounded-full w-5/6"></div>
                        <div className="h-4 bg-muted rounded-full w-2/3 mt-8"></div>
                        <div className="h-4 bg-muted rounded-full w-full"></div>
                        <div className="h-4 bg-muted rounded-full w-4/5"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-2">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg text-muted-foreground font-medium">No content available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
