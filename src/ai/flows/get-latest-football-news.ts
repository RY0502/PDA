'use server';
/**
 * @fileOverview Fetches the latest football news articles from a Google search.
 *
 * - getLatestFootballNews - A function that retrieves and returns the latest football news articles.
 * - GetLatestFootballNewsInput - The input type for the getLatestFootballNews function (currently empty).
 * - GetLatestFootballNewsOutput - The return type for the getLatestFootballNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {runTool} from 'genkit/experimental/tool';

const GetLatestFootballNewsInputSchema = z.object({});
export type GetLatestFootballNewsInput = z.infer<typeof GetLatestFootballNewsInputSchema>;

const GetLatestFootballNewsOutputSchema = z.object({
  articles: z.array(z.string()).describe('List of URLs for the latest football news articles.'),
});
export type GetLatestFootballNewsOutput = z.infer<typeof GetLatestFootballNewsOutputSchema>;

export async function getLatestFootballNews(
  input: GetLatestFootballNewsInput
): Promise<GetLatestFootballNewsOutput> {
  return getLatestFootballNewsFlow(input);
}

const googleSearchTool = ai.defineTool({
  name: 'googleSearch',
  description: 'Performs a google search and returns a list of article URLs.',
  inputSchema: z.object({
    query: z.string().describe('The search query to use for the google search.'),
  }),
  outputSchema: z.array(z.string()).describe('A list of URLs returned from the google search.'),
},
async (input) => {
    // TODO: Implement google search here.
    // Placeholder implementation returns hardcoded URLs.
    return [
      'https://www.theguardian.com/football/2024/may/20/erik-ten-hag-insists-he-has-no-doubt-he-will-stay-as-manchester-united-manager',
      'https://www.espn.com/soccer/story/_/id/40186985/ten-hag-no-doubt-remain-man-united-manager-next-season',
      'https://www.goal.com/en-us/news/erik-ten-hag-man-utd-future-sir-jim-ratcliffe-ineos-thomas-tuchel-mauricio-pochettino/bltc9a848a60a7e6e5b',
      'https://talksport.com/football/1880416/erik-ten-hag-man-utd-future-latest-news-mauricio-pochettino-available/',
    ];
  }
);

const getLatestFootballNewsFlow = ai.defineFlow(
  {
    name: 'getLatestFootballNewsFlow',
    inputSchema: GetLatestFootballNewsInputSchema,
    outputSchema: GetLatestFootballNewsOutputSchema,
  },
  async input => {
    // Directly call the tool to ensure we get a valid array of URLs.
    const articles = await runTool(googleSearchTool, { query: 'Latest football news' });
    return {articles};
  }
);
