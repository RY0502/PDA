'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn, slugify } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export function MediumReadMoreButton({ url }: { url: string }) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  const handleClick = async () => {
    try {
      setActionLoading(true);
      const q = new URLSearchParams({ key: url }).toString();
      const r = await fetch(`/api/cache/medium/get?${q}`, { method: 'GET' });
      if (r.ok) {
        const data = await r.json();
        const value = data?.value;
        if (typeof value === 'string' && value.length > 0) {
          window.open(value, '_blank', 'noopener,noreferrer');
          setActionLoading(false);
          return;
        }
      }
    } catch {} finally {
      setActionLoading(false);
    }
    const anchorSlug = slugify(url || 'medium');
    router.push(`/medium/news/${anchorSlug}?url=${encodeURIComponent(url)}`);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={actionLoading}
        className={cn(
          buttonVariants({ size: 'sm' }),
          'flex-shrink-0 shadow-md hover:shadow-lg transition-all rounded-xl'
        )}
      >
        Read More
      </button>
      {actionLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-border/40 shadow-xl">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="text-sm font-medium">Processing...</div>
          </div>
        </div>
      )}
    </>
  );
}
