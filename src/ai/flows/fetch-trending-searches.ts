'use server';
import {z} from 'genkit';
import {TRENDS_KEY_URL} from '@/lib/constants';
import { fetchGeminiApiKey, generateSummaryWithRetry } from '@/ai/gemini';

const TrendingSearchesOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest trending searches.'),
});

export type TrendingSearchesOutput = z.infer<
  typeof TrendingSearchesOutputSchema
>;

export async function fetchTrendingSearches(): Promise<TrendingSearchesOutput> {
  const pageKey = await fetchGeminiApiKey(TRENDS_KEY_URL || '', 3, 1000);
  const apiKey = pageKey;
  if (!apiKey) {
    console.error('Trends API key could not be resolved.');
    return {
      summary:
        '**Configuration Error**\n* The API key for trends could not be resolved from TRENDS_KEY_URL.',
    };
  }

  const prompt =
    "Using ONLY real-time web results get me trending stories in India from the past 24 hours.It is important to generate each news as it's own line item.Aim for atleast 10-15 trending news.Highlight the main part or noun in the news.Do not include any commentary, explanations.";
  const summary = await generateSummaryWithRetry(apiKey, prompt, 3, 3000);
  if (!summary) {
    return {
      summary: '**API Error**\n* No trends summary was returned from the API.',
    };
  }
  return { summary };
}
