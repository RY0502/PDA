'use server';

/**
 * @fileOverview Fetches and returns the top trending Google searches for India.
 *
 * - fetchTrendingSearches - A function that retrieves the trending searches.
 * - TrendingSearchesOutput - The return type for the fetchTrendingSearches function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

const TrendingSearchesOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest trending searches.'),
});

export type TrendingSearchesOutput = z.infer<
  typeof TrendingSearchesOutputSchema
>;

export async function fetchTrendingSearches(): Promise<TrendingSearchesOutput> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return {
      summary:
        '**Configuration Error**\n* The Gemini API key is not configured. Please set it in your environment variables.',
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [{text: 'Trending today in india'}],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API request failed:', response.status, errorBody);
      return {
        summary: `**API Error**\n* Could not fetch trends. Status: ${response.status}`,
      };
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.error('No summary found in API response:', data);
      return {
        summary: '**API Error**\n* No trends summary was returned from the API.',
      };
    }

    return {summary};
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    return {
      summary: `**Network Error**\n* There was an error fetching the trends. Please check your connection.`,
    };
  }
}
