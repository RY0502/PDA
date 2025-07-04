'use server';

/**
 * @fileOverview Fetches and returns the top trending Google searches for India.
 *
 * - fetchTrendingSearches - A function that retrieves the trending searches.
 * - TrendingSearch - The type for a single trending search item.
 * - TrendingSearchesOutput - The return type for the fetchTrendingSearches function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrendSchema = z.object({
  query: z.string().describe('The trending search query.'),
  url: z.string().describe('The direct URL to the Google search results for the trend.'),
});
export type TrendingSearch = z.infer<typeof TrendSchema>;

const TrendingSearchesOutputSchema = z.array(TrendSchema);
export type TrendingSearchesOutput = z.infer<typeof TrendingSearchesOutputSchema>;

export async function fetchTrendingSearches(): Promise<TrendingSearchesOutput> {
  return fetchTrendingSearchesFlow();
}

const trendingSearchesPrompt = ai.definePrompt({
  name: 'trendingSearchesPrompt',
  model: 'googleai/gemini-2.5-flash',
  output: {schema: TrendingSearchesOutputSchema},
  prompt: `Use Google Search to find the top 10 daily search trends from Google Trends for India (geo=IN). For each trend, provide the search query and the full Google search URL for that query.
  
  Return the result EXACTLY in the required JSON format. Do not add any conversational text or formatting around it.`,
});

const fetchTrendingSearchesFlow = ai.defineFlow(
  {
    name: 'fetchTrendingSearchesFlow',
    inputSchema: z.void(),
    outputSchema: TrendingSearchesOutputSchema,
  },
  async () => {
    const {output} = await trendingSearchesPrompt({});
    return output || [];
  }
);
