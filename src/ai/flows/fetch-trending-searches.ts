// src/ai/flows/fetch-trending-searches.ts
'use server';

/**
 * @fileOverview Fetches and returns the top trending Google searches for the day.
 *
 * - fetchTrendingSearches - A function that retrieves the trending searches.
 * - TrendingSearchesOutput - The return type for the fetchTrendingSearches function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrendingSearchesOutputSchema = z.array(z.string());
export type TrendingSearchesOutput = z.infer<typeof TrendingSearchesOutputSchema>;

export async function fetchTrendingSearches(): Promise<TrendingSearchesOutput> {
  return fetchTrendingSearchesFlow();
}

const getTrendingSearches = ai.defineTool(
  {
    name: 'getTrendingSearches',
    description: 'Retrieves the top trending Google searches for the day.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.string()),
  },
  async () => {
    // Placeholder implementation - replace with actual logic to fetch trending searches
    return ['Trending Search 1', 'Trending Search 2', 'Trending Search 3'];
  }
);

const trendingSearchesPrompt = ai.definePrompt({
  name: 'trendingSearchesPrompt',
  tools: [getTrendingSearches],
  prompt: `What are the top trending Google searches for the day? Use the getTrendingSearches tool to find out.`,
});

const fetchTrendingSearchesFlow = ai.defineFlow(
  {
    name: 'fetchTrendingSearchesFlow',
    inputSchema: z.void(),
    outputSchema: TrendingSearchesOutputSchema,
  },
  async () => {
    const {text} = await trendingSearchesPrompt({});
    // Since the tool returns the trending searches directly, we can just return the tool's output.
    // If the tool returned a string that contained the searches, we would need to parse it here.
    return await getTrendingSearches({});
  }
);
