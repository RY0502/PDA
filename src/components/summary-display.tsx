'use client';

import { useState, useRef, type ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { convertSummaryToLinks } from '@/ai/flows/convert-summary-to-links';
import { PlayIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryDisplayProps {
  initialContent: ReactNode;
  title: string;
}

export function SummaryDisplay({ initialContent, title }: SummaryDisplayProps) {
  const [content, setContent] = useState<ReactNode>(initialContent);
  const [isConverted, setIsConverted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConvertClick = async () => {
    if (!isClient) return;

    setIsLoading(true);
    if (!contentRef.current) {
      setIsLoading(false);
      return;
    }

    const initialHtml = contentRef.current.innerHTML;

    try {
      const result = await convertSummaryToLinks({ summaryHtml: initialHtml });
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
    } catch (error) {
      console.error('Error converting summary:', error);
      toast({
        title: 'Error',
        description: 'Unable to convert to search links.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {!isConverted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConvertClick}
            disabled={isLoading || !isClient}
          >
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <>
                <PlayIcon className="mr-1 h-3 w-3 rotate-90" />
                <span className="text-xs">To Search Links</span>
              </>
            )}
          </Button>
        )}
      </div>
      <div ref={contentRef} className="mt-2 space-y-2">
        {content}
      </div>
    </>
  );
}
