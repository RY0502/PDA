'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';

type Entry = { key: string; value: string; expiresAt: number };

const ALLOWED_EMAIL = 'ravi.y0102@gmail.com';

export default function MaintenancePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const isAllowed = email === ALLOWED_EMAIL;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
      setToken(data.session?.access_token ?? null);
    })();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch('/api/cache/medium/list', { method: 'GET' });
      if (!r.ok) throw new Error('Failed to fetch entries');
      const j = await r.json();
      setEntries((j?.entries ?? []) as Entry[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const postWithAuth = async (url: string) => {
    if (!token) throw new Error('Missing session token');
    setActionLoading(true);
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || 'Request failed');
    }
    await loadEntries();
    setActionLoading(false);
  };

  return (
    <div className="container py-8 max-w-5xl">
      <Card className="border-border/50 bg-card/90 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAllowed ? (
            <Alert className="mb-6">
              <AlertTitle>Access Restricted</AlertTitle>
              <AlertDescription>
                This page is only available to the specified user.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
              <Button
                className="w-full sm:w-auto"
                variant="destructive"
                disabled={actionLoading}
                onClick={() => {
                  setError(null);
                  postWithAuth('/api/cache/medium/clear-all').catch((e) => {
                    setError(e.message);
                    setActionLoading(false);
                  });
                }}
              >
                Clear Cache Entries
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="secondary"
                disabled={actionLoading}
                onClick={() => {
                  setError(null);
                  postWithAuth('/api/cache/medium/clear-values').catch((e) => {
                    setError(e.message);
                    setActionLoading(false);
                  });
                }}
              >
                Clear Values Only
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={actionLoading}
                onClick={async () => {
                  setError(null);
                  try {
                    setActionLoading(true);
                    await fetch('/api/cache/medium/populate', { method: 'GET' });
                    setTimeout(() => loadEntries(), 1500);
                  } catch (e: any) {
                    setError(e?.message || 'Failed to populate cache');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Populate
              </Button>
            </div>
          )}
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
          {error && (
            <Alert className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="mb-3 text-xs text-muted-foreground">
            Total entries: {entries.length}
          </div>
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3">Key</th>
                  <th className="text-left p-3">Value</th>
                  <th className="text-left p-3">Expires At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-3" colSpan={3}>Loading...</td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td className="p-3" colSpan={3}>No entries</td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.key} className="border-t">
                      <td className="p-3 break-all">{e.key}</td>
                      <td className="p-3 break-all">{e.value || ''}</td>
                      <td className="p-3">{new Date(e.expiresAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
