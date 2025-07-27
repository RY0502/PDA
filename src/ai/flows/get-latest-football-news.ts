'use server';

/**
 * @fileOverview Fetches the latest football news summary.
 *
 * - getLatestFootballNews - Retrieves news.
 * - GetLatestFootballNewsOutput - The return type for the function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

const GetLatestFootballNewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest football news.'),
});
export type GetLatestFootballNewsOutput = z.infer<
  typeof GetLatestFootballNewsOutputSchema
>;

export async function getLatestFootballNews(): Promise<GetLatestFootballNewsOutput> {
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
        parts: [{text: 'Football transfer news and general football news today'}],
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
        summary: `**API Error**\n* Could not fetch news. Status: ${response.status}`,
      };
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.error('No summary found in API response:', data);
      return {
        summary: '**API Error**\n* No news summary was returned from the API.',
      };
    }

    return {summary};
  } catch (error) {
    console.error('Error fetching football news:', error);
    return {
      summary: `**Network Error**\n* There was an error fetching the news. Please check your connection.`,
    };
  }
}
