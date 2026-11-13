'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateWatchedStock } from '@/app/stocks/actions';

export function WatchlistManager({ stockCode = '' }: { stockCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(stockCode);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (stockCode) {
      setCode(stockCode);
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastStockCode');
      if (saved) setCode(saved);
    }
  }, [stockCode]);

  // Clean fresh query parameter from URL after initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('fresh=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleUpdate = async () => {
    const newCode = code.trim().toUpperCase();
    if (!newCode || isUpdating) return;

    setIsUpdating(true);
    try {
      localStorage.setItem('lastStockCode', newCode);

      // Call server action to upsert stock code, trigger fetch, and invalidate cache tags
      await updateWatchedStock(newCode);

      // Navigate to the new URL with fresh=true to bypass Next.js cache for this navigation
      window.location.href = `/stocks/${newCode}?fresh=true`;
    } catch (error) {
      console.error('Error updating watched stock:', error);
      // Ensure we navigate to the new stock URL even if server action threw an exception
      window.location.href = `/stocks/${newCode}?fresh=true`;
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Watch Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label htmlFor="stock-code-input">Stock Code</Label>
              <Input
                id="stock-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., RELIANCE"
                disabled={isUpdating}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              />
            </div>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
