'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn, slugify } from '@/lib/utils';

const FREEDIUM_BASE_URL = process.env.NEXT_PUBLIC_FREEDIUM_BASE_URL || 'https://freedium-mirror.cfd/';

let mediumCacheSnapshot: Record<string, string> | null = null;
let mediumCacheInitPromise: Promise<void> | null = null;

let freediumFlagValue: boolean | null = null;
let freediumFlagPromise: Promise<void> | null = null;

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

async function initFreediumFlag() {
  try {
    const r = await fetch('/api/settings/freedium', { method: 'GET' });
    if (!r.ok) return;
    const j = await r.json().catch(() => null);
    freediumFlagValue = !!j?.enabled;
  } catch {
    freediumFlagValue = false;
  }
}

export function MediumReadMoreButton({ url }: { url: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!mediumCacheInitPromise) {
      mediumCacheInitPromise = initMediumCacheSnapshot();
    }
    if (!freediumFlagPromise) {
      freediumFlagPromise = initFreediumFlag();
    }
  }, []);

  const handleClick = async () => {
    // Ensure the flag has been fetched
    if (freediumFlagPromise) {
      await freediumFlagPromise;
    }

    // Freedium mode: open via freedium mirror in a new tab
    if (freediumFlagValue) {
      const freediumUrl = `${FREEDIUM_BASE_URL}${url}`;
      window.open(freediumUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Default mode: check cache snapshot, then fallback to detail page
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
