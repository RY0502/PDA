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

const ArticleSchema = z.object({
  title: z.string().describe('The title of the news article.'),
  url: z.string().describe('The direct, full, and clean URL to the news article.'),
});

const GetLatestFootballNewsOutputSchema = z.object({
  articles: z
    .array(ArticleSchema)
    .describe('A list of 10 recent football news articles.'),
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
      return { articles: [] };
    }

    const data = await response.json();
    
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    if (!groundingMetadata || !groundingMetadata.groundingChunks) {
      console.log('No grounding metadata found in the response.');
      return { articles: [] };
    }

    const articles = groundingMetadata.groundingChunks
      .map((chunk: any) => {
        if (chunk.web && chunk.web.title && chunk.web.uri) {
          return {
            title: chunk.web.title,
            url: chunk.web.uri,
          };
        }
        return null;
      })
      .filter((article: any): article is { title: string; url: string } => article !== null);

    // Limit to 10 articles to match original intent
    return { articles: articles.slice(0, 10) };

  } catch (error) {
    console.error('Error fetching football news:', error);
    return { articles: [] };
  }
}
