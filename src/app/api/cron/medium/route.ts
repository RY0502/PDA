import { updateMediumArticlesCache } from '@/lib/data-cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await updateMediumArticlesCache();
    return NextResponse.json({ success: true, message: 'Medium articles cache updated.' });
  } catch (error: any) {
    console.error('Cron job for medium articles failed:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
