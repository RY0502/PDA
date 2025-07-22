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
  return getLatestFootballNewsFlow(input);
}

const getLatestFootballNewsPrompt = ai.definePrompt({
  name: 'footballNewsPrompt',
  input: {schema: GetLatestFootballNewsInputSchema},
  output: {schema: GetLatestFootballNewsOutputSchema},
  prompt:
    'Use Google Search to find the top 10 latest football news articles. For each article, provide the title and the direct, full, absolute URL to the story. Ensure the URL is clean and does not contain any tracking parameters or redirects from the search results.',
});

const getLatestFootballNewsFlow = ai.defineFlow(
  {
    name: 'getLatestFootballNewsFlow',
    inputSchema: GetLatestFootballNewsInputSchema,
    outputSchema: GetLatestFootballNewsOutputSchema,
  },
  async input => {
    const {output} = await getLatestFootballNewsPrompt(input);
    return output || {articles: []};
  }
);
