'use server';
/**
 * @fileOverview Fetches the latest football news articles from a Google search.
 *
 * - getLatestFootballNews - A function that retrieves and returns the latest football news articles.
 * - GetLatestFootballNewsInput - The input type for the getLatestFootballNews function (currently empty).
 * - GetLatestFootballNewsOutput - The return type for the getLatestFootballNews function.
 */

// Import the shared ai instance and the shared googleAiPlugin instance.
import {ai} from '@/ai/genkit';
import {googleSearchTool} from '@genkit-ai/googleai';
import {z} from 'genkit';

const GetLatestFootballNewsInputSchema = z.object({});
export type GetLatestFootballNewsInput = z.infer<typeof GetLatestFootballNewsInputSchema>;

const ArticleSchema = z.object({
  title: z.string().describe('The title of the news article.'),
  url: z.string().describe('The direct URL to the news article.'),
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

const getLatestFootballNewsFlow = ai.defineFlow(
  {
    name: 'getLatestFootballNewsFlow',
    inputSchema: GetLatestFootballNewsInputSchema,
    outputSchema: GetLatestFootballNewsOutputSchema,
  },
  async () => {
    // Directly call the googleSearchTool to get the latest news.
    const searchResult = await googleSearchTool({
      query: 'Latest football news',
    });

    // The tool can return a single object or an array of objects. We'll handle both cases.
    const results = Array.isArray(searchResult) ? searchResult : [searchResult];

    // Map the tool's output to the required Article schema.
    const articles =
      results[0]?.results?.map(article => ({
        title: article.title || 'No title available',
        url: article.url,
      })) || [];

    return {articles};
  }
);
