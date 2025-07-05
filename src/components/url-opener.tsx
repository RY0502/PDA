'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function UrlOpener() {
  const [url, setUrl] = useState('');

  const handleGoClick = () => {
    if (url.trim()) {
      const fullUrl = `https://freedium.cf/${url.trim()}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mt-12 max-w-xl mx-auto">
      <div className="flex w-full items-end space-x-2 rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid flex-1 items-center gap-1.5">
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
