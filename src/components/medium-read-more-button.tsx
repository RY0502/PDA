'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn, slugify } from '@/lib/utils';

export function MediumReadMoreButton({ url }: { url: string }) {
  const router = useRouter();

  useEffect(() => {
    const register = async () => {
      try {
        const r = await fetch('/api/cache/medium/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: url }),
        });
        r.ok;
      } catch {}
    };
    if (url) register();
  }, [url]);

  const handleClick = async () => {
    try {
      const q = new URLSearchParams({ key: url }).toString();
      const r = await fetch(`/api/cache/medium/get?${q}`, { method: 'GET' });
      if (r.ok) {
        const data = await r.json();
        const value = data?.value;
        if (typeof value === 'string' && value.length > 0) {
          window.open(value, '_blank', 'noopener,noreferrer');
          return;
        }
      }
    } catch {}
    const anchorSlug = slugify(url || 'medium');
    router.push(`/medium/news/${anchorSlug}?url=${encodeURIComponent(url)}`);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        buttonVariants({ size: 'sm' }),
        'flex-shrink-0 shadow-md hover:shadow-lg transition-all rounded-xl'
      )}
    >
      Read More
    </button>
  );
}
