'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn, slugify } from '@/lib/utils';

let mediumCacheSnapshot: Record<string, string> | null = null;
let mediumCacheInitPromise: Promise<void> | null = null;

async function initMediumCacheSnapshot() {
  try {
    const r = await fetch('/api/cache/medium/list', { method: 'GET' });
    if (!r.ok) return;
    const j = await r.json().catch(() => null);
    const entries = Array.isArray(j?.entries) ? j.entries : [];
    const map: Record<string, string> = {};
    for (const e of entries) {
      const k = typeof e?.key === 'string' ? e.key : '';
      const v = typeof e?.value === 'string' ? e.value : '';
      if (k && v) {
        map[k] = v;
      }
    }
    mediumCacheSnapshot = map;
  } catch {
    // ignore
  }
}

export function MediumReadMoreButton({ url }: { url: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!mediumCacheInitPromise) {
      mediumCacheInitPromise = initMediumCacheSnapshot();
    }
  }, []);

  const handleClick = async () => {
    const val =
      mediumCacheSnapshot && typeof url === 'string'
        ? mediumCacheSnapshot[url]
        : undefined;
    if (typeof val === 'string' && val.length > 0) {
      window.open(val, '_blank', 'noopener,noreferrer');
      return;
    }
    const anchorSlug = slugify(url || 'medium');
    router.push(`/medium/news/${anchorSlug}?url=${encodeURIComponent(url)}`);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          buttonVariants({ size: 'sm' }),
          'flex-shrink-0 shadow-md hover:shadow-lg transition-all rounded-xl'
        )}
      >
        Read More
      </button>
    </>
  );
}
