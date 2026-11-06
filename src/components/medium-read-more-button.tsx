'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn, slugify } from '@/lib/utils';
import {
  buildFreediumUrl,
  getStoredFreediumMode,
  FREEDIUM_MODE_CHANGE_EVENT,
  type FreediumMode,
} from '@/lib/freedium';

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
  const [, setOpenerMode] = useState<FreediumMode>('web');

  useEffect(() => {
    if (!mediumCacheInitPromise) {
      mediumCacheInitPromise = initMediumCacheSnapshot();
    }
    if (!freediumFlagPromise) {
      freediumFlagPromise = initFreediumFlag();
    }

    setOpenerMode(getStoredFreediumMode());

    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<FreediumMode>;
      if (customEvent.detail) {
        setOpenerMode(customEvent.detail);
      } else {
        setOpenerMode(getStoredFreediumMode());
      }
    };

    window.addEventListener(FREEDIUM_MODE_CHANGE_EVENT, handleModeChange);
    window.addEventListener('storage', handleModeChange);

    return () => {
      window.removeEventListener(FREEDIUM_MODE_CHANGE_EVENT, handleModeChange);
      window.removeEventListener('storage', handleModeChange);
    };
  }, []);

  const handleClick = async () => {
    // Ensure the flag has been fetched
    if (freediumFlagPromise) {
      await freediumFlagPromise;
    }

    // Always fetch latest mode from localStorage
    const mode = getStoredFreediumMode();

    // Freedium mode: open via selected freedium mechanism in a new tab
    if (freediumFlagValue || freediumFlagValue === null) {
      const targetUrl = buildFreediumUrl(url, mode);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Default fallback mode if freedium is explicitly disabled: check cache snapshot, then fallback to detail page
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
