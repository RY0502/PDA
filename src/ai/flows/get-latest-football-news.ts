'use server';
/**
 * @fileOverview Fetches the latest football news articles from a Google search.
 *
 * - getLatestFootballNews - A function that retrieves and returns the latest football news articles.
 * - GetLatestFootballNewsInput - The input type for the getLatestFootballNews function (currently empty).
 * - GetLatestFootballNewsOutput - The return type for the getLatestFootballNews function.
 */

import {z} from 'genkit';
import { GEMINI_API_KEY } from '@/lib/constants';

const GetLatestFootballNewsInputSchema = z.object({});
export type GetLatestFootballNewsInput = z.infer<
  typeof GetLatestFootballNewsInputSchema
>;

const GetLatestFootballNewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest football news.'),
});
export type GetLatestFootballNewsOutput = z.infer<
  typeof GetLatestFootballNewsOutputSchema
>;

export async function getLatestFootballNews(
  input: GetLatestFootballNewsInput
): Promise<GetLatestFootballNewsOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: 'Latest football news' }],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY!,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('API call failed with status:', response.status);
      const errorBody = await response.text();
      console.error('Error body:', errorBody);
      return { summary: 'Could not fetch news at this time.' };
    }

    const data = await response.json();
    
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.log('No summary found in the response.');
      return { summary: 'No news summary available right now.' };
    }

    return { summary };

  } catch (error) {
    console.error('Error fetching football news:', error);
    return { summary: 'An error occurred while fetching the news.' };
  }
}
