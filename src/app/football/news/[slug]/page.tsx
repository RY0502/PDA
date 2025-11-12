"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';

export default function FootballNewsDetail() {
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
    const es = new EventSource(`/api/gemini/stream?tab=football&title=${encodedTitle}`);
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
        // Try to extract text from different possible response shapes
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
        // Ignore lines that aren't JSON; SSE may include comments
      }
    };

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
      // If the stream closed but we already received content, treat it as a normal finish
      if (!hasReceived) {
        setError('Unable to stream summary. Please try later.');
      }
    };

    return () => {
      es.close();
    };
  }, [titleParam]);

  return (
    <div className="container py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <Card className="card-hover border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-headline">
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
                : 'News Detail'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle className="text-base font-semibold">Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                {content ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
                ) : (
                  <p className="text-muted-foreground">{isStreaming ? 'Streaming summary...' : 'No content available.'}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => router.back()} aria-label="Back to list">Back</Button>
        </div>
      </div>
    </div>
  );
}