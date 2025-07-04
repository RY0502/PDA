import { updateTrendingSearchesCache } from '@/lib/data-cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await updateTrendingSearchesCache();
    return NextResponse.json({ success: true, message: 'Trending searches cache updated.' });
  } catch (error: any) {
    console.error('Cron job for trending searches failed:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
