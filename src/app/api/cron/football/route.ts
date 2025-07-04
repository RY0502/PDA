import { updateFootballNewsCache } from '@/lib/data-cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await updateFootballNewsCache();
    return NextResponse.json({ success: true, message: 'Football news cache updated.' });
  } catch (error: any) {
    console.error('Cron job for football news failed:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
