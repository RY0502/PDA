'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';

export function UrlOpener() {
  const [url, setUrl] = useState('');
  const router = useRouter();

  const handleGoClick = () => {
    if (url.trim()) {
      const anchorSlug = slugify(url.trim() || 'medium');
      router.push(`/medium/news/${anchorSlug}?url=${encodeURIComponent(url.trim())}`);
    }
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
          />
        </div>
        <Button onClick={handleGoClick}>Go</Button>
      </div>
    </div>
  );
}
