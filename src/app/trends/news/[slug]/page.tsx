"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';

export default function TrendsNewsDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const titleParam = searchParams.get('title') || '';

  const [content, setContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!titleParam) return;

    setIsStreaming(true);
    setError(null);

    const encodedTitle = encodeURIComponent(titleParam);
    const es = new EventSource(`/api/gemini/stream?tab=trends&title=${encodedTitle}`);
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
      } catch (e) {
        // ignore non-JSON lines
      }
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
  }, [titleParam]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          {/* Back Button with Modern Styling */}
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="mb-8 group hover:bg-primary/10 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" /> 
            <span className="font-medium">Back to Trends</span>
          </Button>

          {/* Hero Title Section */}
          <div className="mb-8">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-50"></div>
              <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-headline leading-tight">
                  {titleParam
                    ? titleParam
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
                        )
                    : 'Trend Detail'}
                </h1>
              </div>
            </div>
          </div>

          {/* Content Card */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl overflow-hidden">
            <CardContent className="p-8 md:p-10">
              {error ? (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTitle className="text-lg font-semibold mb-2">Unable to Load Content</AlertTitle>
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              ) : (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  {content ? (
                    <div className="text-foreground/90 leading-relaxed space-y-4">
                      {content.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-base md:text-lg leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      {isStreaming ? (
                        <>
                          <div className="relative mb-4">
                            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                          </div>
                          <p className="text-muted-foreground text-lg font-medium">Loading content...</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-lg">No content available.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Navigation */}
          <div className="mt-10 flex justify-center">
            <Button 
              onClick={() => router.back()} 
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              aria-label="Back to list"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Trends
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}