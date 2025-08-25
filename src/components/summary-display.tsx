'use client';

import { useState, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { convertSummaryToLinks } from '@/app/actions';
import { PlayIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryDisplayProps {
  initialContent: ReactNode;
  title: string;
}

export function SummaryDisplay({
  initialContent,
  title,
}: SummaryDisplayProps) {
  const [content, setContent] = useState<ReactNode>(initialContent);
  const [isConverted, setIsConverted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleConvertClick = async () => {
    setIsLoading(true);
    if (!contentRef.current) {
      setIsLoading(false);
      return;
    }

    const initialHtml = contentRef.current.innerHTML;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 30000)
    );

    try {
      const result = (await Promise.race([
        convertSummaryToLinks({ summaryHtml: initialHtml }),
        timeoutPromise,
      ])) as { linkedSummaryHtml: string };

      if (result.linkedSummaryHtml) {
        setContent(
          <div
            dangerouslySetInnerHTML={{ __html: result.linkedSummaryHtml }}
            onClick={(e) => {
              const target = e.target as HTMLAnchorElement;
              if (target.tagName === 'A' && target.href) {
                e.preventDefault();
                window.open(target.href, '_blank', 'noopener,noreferrer');
              }
            }}
          />
        );
        setIsConverted(true);
      } else {
        throw new Error('Conversion failed to return content.');
      }
    } catch (error: any) {
      if (error.message === 'timeout') {
        toast({
          title: 'Error',
          description: 'Timed out. Please try later',
          variant: 'destructive',
        });
        setContent(initialContent); // Revert to original content
      } else {
        console.error('Error converting summary:', error);
        toast({
          title: 'Error',
          description: 'Unable to convert to search links.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {!isConverted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConvertClick}
            disabled={isLoading}
            className="text-primary hover:text-primary"
          >
            <PlayIcon className="h-3 w-3 fill-current mr-0.5" />
            <span className="text-xs">To Search Links</span>
          </Button>
        )}
      </div>
      <div
        ref={contentRef}
        className="px-6 pb-6 pt-0 space-y-2"
      >
        {content}
      </div>
       {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full h-full p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-6 w-2/4" />
                <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
            </div>
        </div>
      )}
    </div>
  );
}
