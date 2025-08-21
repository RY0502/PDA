'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function WatchlistManager({ stockCode }: { stockCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(stockCode);

  useEffect(() => {
    setCode(stockCode);
  }, [stockCode]);

  const handleUpdate = async () => {
    const newCode = code.trim().toUpperCase();
    if (newCode) {
      localStorage.setItem('lastStockCode', newCode);
      router.push(`/stocks/${newCode}`);

      try {
        const response = await fetch(
          `https://usdiugdjvlmeteiwsrwg.supabase.co/functions/v1/upsert-stock-code?stockcode=${newCode}`,
          {
            method: 'POST',
            headers: {
              Authorization:
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZGl1Z2RqdmxtZXRlaXdzcndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzg4MzQsImV4cCI6MjA2ODkxNDgzNH0.xUIStCZCHOrrS2iOIPCmA6OusJmmBs7nPc4kTxn2TQc',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Functions' }),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Supabase function call failed:', errorData);
        } else {
          const data = await response.json();
          console.log('Supabase function call successful:', data);
        }
      } catch (error) {
        console.error('Error calling Supabase function:', error);
      }
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
