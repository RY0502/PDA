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
      'https://www.example.com/football-news-1',
      'https://www.example.com/football-news-2',
    ];
  }
);

const getLatestFootballNewsPrompt = ai.definePrompt({
  name: 'getLatestFootballNewsPrompt',
  tools: [googleSearchTool],
  prompt: `Use the googleSearch tool to find the latest football news articles. The search query should be 'Latest football news'. Return a list of URLs for the articles.`,
});

const getLatestFootballNewsFlow = ai.defineFlow(
  {
    name: 'getLatestFootballNewsFlow',
    inputSchema: GetLatestFootballNewsInputSchema,
    outputSchema: GetLatestFootballNewsOutputSchema,
  },
  async input => {
    const {output} = await getLatestFootballNewsPrompt({});
    return {articles: output!};
  }
);
