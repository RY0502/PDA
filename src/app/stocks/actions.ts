'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateWatchedStock(newCode: string) {
  const cleanCode = newCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: 'Empty stock code' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    return { success: false, error: 'Supabase configuration missing' };
  }

  try {
    // 1. Upsert stock code via Supabase Edge Function
    const upsertRes = await fetch(
      `${supabaseUrl}/functions/v1/upsert-stock-code?stockcode=${cleanCode}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Functions' }),
      }
    );

    if (!upsertRes.ok) {
      console.error('upsert-stock-code returned non-OK status:', upsertRes.status);
    }

    // 2. Trigger fetch-stock-price scraper to populate watched_stocks immediately
    // Wait up to 3 seconds for fresh data if available; otherwise let it complete in background
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch(`${supabaseUrl}/functions/v1/fetch-stock-price`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockCode: cleanCode }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Aborted or continuing in background
    }

    // 3. Invalidate caches on-demand specifically for this updated stock
    try {
      revalidatePath('/stocks');
      revalidatePath(`/stocks/${cleanCode}`);
      revalidatePath('/stocks/[code]', 'page');
      revalidateTag('watched-stock');
      revalidateTag(`watched-stock-${cleanCode}`);
    } catch (cacheErr) {
      console.error('Cache revalidation error:', cacheErr);
    }

    return { success: true, code: cleanCode };
  } catch (error: any) {
    console.error('Failed to update watched stock:', error);
    return { success: false, error: error?.message || 'Update failed' };
  }
}
