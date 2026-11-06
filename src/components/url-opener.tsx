'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn, slugify } from '@/lib/utils';
import { Sparkles, Globe } from 'lucide-react';
import {
  buildFreediumUrl,
  getStoredFreediumMode,
  setStoredFreediumMode,
  FREEDIUM_MODE_CHANGE_EVENT,
  FREEDIUM_WEB_BASE_URL,
  FREEDIUM_PREPEND_BASE_URL,
  type FreediumMode,
} from '@/lib/freedium';

export function UrlOpener() {
  const [url, setUrl] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [freediumEnabled, setFreediumEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<FreediumMode>('web');
  const router = useRouter();

  // Load mode from localStorage and subscribe to changes
  useEffect(() => {
    setMode(getStoredFreediumMode());

    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<FreediumMode>;
      if (customEvent.detail) {
        setMode(customEvent.detail);
      } else {
        setMode(getStoredFreediumMode());
      }
    };

    window.addEventListener(FREEDIUM_MODE_CHANGE_EVENT, handleModeChange);
    window.addEventListener('storage', handleModeChange);

    return () => {
      window.removeEventListener(FREEDIUM_MODE_CHANGE_EVENT, handleModeChange);
      window.removeEventListener('storage', handleModeChange);
    };
  }, []);

  // Fetch freedium flag on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/settings/freedium', { method: 'GET' });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          setFreediumEnabled(!!j?.enabled);
        } else {
          setFreediumEnabled(false);
        }
      } catch {
        setFreediumEnabled(false);
      }
    })();
  }, []);

  const handleToggleMode = (newMode: FreediumMode) => {
    setMode(newMode);
    setStoredFreediumMode(newMode);
  };

  const handleGoClick = async () => {
    const link = url.trim();
    if (!link) return;

    // Freedium mode: open via active freedium mechanism
    if (freediumEnabled || freediumEnabled === null) {
      const activeMode = getStoredFreediumMode();
      const targetUrl = buildFreediumUrl(link, activeMode);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Fallback mode if freedium is explicitly disabled: existing proxy-resolve flow
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

      {/* Toggle below the medium article url opener */}
      <div className="mt-3 rounded-lg border bg-card/60 p-3 shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>Medium Opener Mode:</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleToggleMode('web')}
              className={cn(
                'rounded px-2.5 py-1 text-xs transition-all cursor-pointer',
                mode === 'web'
                  ? 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Web Mirror
            </button>

            <Switch
              id="medium-opener-toggle"
              checked={mode === 'prepend'}
              onCheckedChange={(checked) => handleToggleMode(checked ? 'prepend' : 'web')}
              aria-label="Toggle between Web Mirror and Direct Mirror opener"
            />

            <button
              type="button"
              onClick={() => handleToggleMode('prepend')}
              className={cn(
                'rounded px-2.5 py-1 text-xs transition-all cursor-pointer',
                mode === 'prepend'
                  ? 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Direct Mirror
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
          <span>
            Active pattern:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {mode === 'web'
                ? `${FREEDIUM_WEB_BASE_URL.replace(/\/+$/, '')}/read?url=<article>`
                : `${FREEDIUM_PREPEND_BASE_URL.replace(/\/+$/, '')}/<article>`}
            </code>
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {mode === 'web' ? 'Default (/read?url=)' : 'Prepend mechanism'}
          </span>
        </div>
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
