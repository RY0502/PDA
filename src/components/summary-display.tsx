'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import { convertSummaryToLinks } from '@/ai/flows/convert-summary-to-links';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

export function SummaryDisplay({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [displayHtml, setDisplayHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const { toast } = useToast();
  const initialContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConvertClick = async () => {
    if (!initialContentRef.current) return;
    
    const initialHtml = ReactDOMServer.renderToStaticMarkup(
        <>{children}</>
    );
    
    setIsLoading(true);
    try {
      const result = await convertSummaryToLinks({ summaryHtml: initialHtml });
      // This is a workaround to make links open in a new tab.
      const finalHtml = result.linkedSummaryHtml.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
      setDisplayHtml(finalHtml);
      setIsConverted(true);
    } catch (error) {
      console.error('Failed to convert summary to links:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to convert to search links',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );

  if (!isClient) {
    return renderLoadingSkeleton();
  }

  const contentToShow = isConverted && displayHtml ? (
    <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
  ) : (
    <div ref={initialContentRef}>{children}</div>
  );

  return (
    <div>
      {!isConverted && !isLoading && (
        <div className="text-right mb-2">
          <Button variant="link" onClick={handleConvertClick} className="p-0 h-auto">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
              <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V4.204c0-.86.996-1.32 1.658-.753l5.482 4.796z"/>
            </svg>
            Search Links
          </Button>
        </div>
      )}
      
      {isLoading ? renderLoadingSkeleton() : contentToShow}
    </div>
  );
}
