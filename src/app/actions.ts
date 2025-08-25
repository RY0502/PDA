'use server';

import { convertSummaryToLinks as originalConvertSummaryToLinks } from '@/ai/flows/convert-summary-to-links';

// Re-export the server action to make it available to client components.
export async function convertSummaryToLinks(input: { summaryHtml: string; }): Promise<{ linkedSummaryHtml: string; }> {
  return originalConvertSummaryToLinks(input);
}
