'use server';

/**
 * @fileOverview Fetches and returns the top trending Google searches for India.
 *
 * - fetchTrendingSearches - A function that retrieves the trending searches.
 * - TrendingSearchesOutput - The return type for the fetchTrendingSearches function.
 */

import {z} from 'genkit';
import {TRENDS_KEY_URL} from '@/lib/constants';

const TrendingSearchesOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest trending searches.'),
});

export type TrendingSearchesOutput = z.infer<
  typeof TrendingSearchesOutputSchema
>;

// Simple sleep utility for retry backoff
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTrendsApiKey(): Promise<string | null> {
  const base = TRENDS_KEY_URL || '';
  try {
    const u = new URL(base);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(u.toString(), { method: 'GET' });
        if (r.ok) {
          const data = await r.json();
          const key = data?.keys?.[0]?.vault_keys?.decrypted_value;
          if (typeof key === 'string' && key.length > 0) return key;
        }
      } catch (_e) {}
      await sleep(1000);
    }
    return null;
  } catch (_e) {
    return null;
  }
}

export async function fetchTrendingSearches(): Promise<TrendingSearchesOutput> {
  const pageKey = await getTrendsApiKey();
  const apiKey = pageKey;
  if (!apiKey) {
    console.error('Trends API key could not be resolved.');
    return {
      summary:
        '**Configuration Error**\n* The API key for trends could not be resolved from TRENDS_KEY_URL.',
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [{text: 'Using ONLY real-time web results get me trending stories in India from the past 24 hours.It is important to generate each news as it\'s own line item.Aim for atleast 10-15 trending news.Highlight the main part or noun in the news.Do not include any commentary, explanations.'}],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
     generationConfig: {
    thinkingConfig: {
      thinkingBudget: 0,
    },
  },
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `API request failed (attempt ${attempt}/3):`,
          response.status,
          errorBody
        );
        if (attempt === 3) {
          return {
            summary: `**API Error**\n* Could not fetch trends. Status: ${response.status}`,
          };
        }
        await sleep(5000); // Wait for 5 seconds before retrying
        continue;
      }

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!summary) {
        console.error(
          `No summary found in API response (attempt ${attempt}/3):`,
          data
        );
        if (attempt === 3) {
          return {
            summary:
              '**API Error**\n* No trends summary was returned from the API.',
          };
        }
        await sleep(2000); // Wait for 2 seconds before retrying
        continue;
      }
      
      // If we got here, it was successful, so we return.
      return {summary};
      
    } catch (error: any) {
      console.error(
        `Error fetching trending searches (attempt ${attempt}/3):`,
        error.message || error
      );
      if (attempt === 3) {
        return {
          summary: `**Network Error**\n* There was an error fetching the trends. Please check your connection.`,
        };
      }
      await sleep(2000); // Wait for 2 seconds before retrying
    }
  }

  // This part should not be reachable, but is here as a final fallback.
  return {
    summary: `**Network Error**\n* There was an error fetching the trends. Please check your connection.`,
  };
}
