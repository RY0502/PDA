'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function WatchlistManager({ stockCode }: { stockCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(stockCode);

  const handleUpdate = () => {
    if (code.trim()) {
      router.push(`/stocks/${code.trim().toUpperCase()}`);
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
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              />
            </div>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
