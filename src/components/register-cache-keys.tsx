'use client';

import { useEffect } from 'react';

export function RegisterCacheKeys({ keys }: { keys: string[] }) {
  useEffect(() => {
    const run = async () => {
      try {
        const unique = Array.from(new Set((keys || []).filter((k) => typeof k === 'string' && k.trim().length > 0)));
        if (unique.length === 0) return;
        await fetch('/api/cache/medium/register-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: unique }),
        });
      } catch {}
    };
    run();
  }, [keys]);
  return null;
}
