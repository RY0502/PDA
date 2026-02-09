'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export function UrlOpener() {
  const [url, setUrl] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const handleGoClick = async () => {
    const link = url.trim();
    if (!link) return;
    try {
      setActionLoading(true);
      const q = new URLSearchParams({ url: link }).toString();
      const r = await fetch(`/api/cache/medium/resolve?${q}`, { method: 'GET' });
      if (r.ok) {
        const j = await r.json();
        const value = j?.value;
        if (typeof value === 'string' && value.length > 0) {
          window.open(value, '_blank', 'noopener,noreferrer');
          setActionLoading(false);
          return;
        }
      }
    } catch {} finally {
      setActionLoading(false);
    }
    const anchorSlug = slugify(link || 'medium');
    router.push(`/medium/news/${anchorSlug}?url=${encodeURIComponent(link)}`);
  };

  return (
    <div className="mt-12 max-w-xl mx-auto">
      <div className="flex w-full items-end space-x-2 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-1 items-center space-x-2">
          <Label htmlFor="url-input">Link:</Label>
          <Input
            id="url-input"
            type="url"
            placeholder="Paste a link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleGoClick();
              }
            }}
            disabled={actionLoading}
          />
        </div>
        <Button onClick={handleGoClick} disabled={actionLoading}>Go</Button>
      </div>
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
    </div>
  );
}
