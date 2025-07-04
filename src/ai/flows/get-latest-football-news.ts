'use server';
/**
 * @fileOverview Fetches the latest football news articles from a Google search.
 *
 * - getLatestFootballNews - A function that retrieves and returns the latest football news articles.
 * - GetLatestFootballNewsInput - The input type for the getLatestFootballNews function (currently empty).
 * - GetLatestFootballNewsOutput - The return type for the getLatestFootballNews function.
 */

// Import the shared ai instance and the shared googleAiPlugin instance.
import {ai, googleAiPlugin} from '@/ai/genkit';
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

const getLatestFootballNewsPrompt = ai.definePrompt({
  name: 'getLatestFootballNewsPrompt',
  model: 'googleai/gemini-2.5-flash',
  // The googleSearch tool is available globally from the googleAiPlugin registered in genkit.ts.
  // The prompt below instructs the model to use it.
  input: {schema: GetLatestFootballNewsInputSchema},
  output: {schema: GetLatestFootballNewsOutputSchema},
  prompt: `Use Google Search to find the 10 latest football news articles. The search query should be 'football transfer news'.
  
  Return the result EXACTLY in the required JSON format. Do not add any conversational text or formatting around it.`,
});

const getLatestFootballNewsFlow = ai.defineFlow(
  {
    name: 'getLatestFootballNewsFlow',
    inputSchema: GetLatestFootballNewsInputSchema,
    outputSchema: GetLatestFootballNewsOutputSchema,
  },
  async (input) => {
    const {output} = await getLatestFootballNewsPrompt(input);
    // If the tool fails or the model returns a faulty response, return an empty array.
    return output || {articles: []};
  }
);
