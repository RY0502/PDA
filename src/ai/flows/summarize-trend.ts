'use server';

/**
 * @fileOverview Summarizes a trending search topic.
 *
 * - summarizeTrend - A function that summarizes a trending search topic.
 * - SummarizeTrendInput - The input type for the summarizeTrend function.
 * - SummarizeTrendOutput - The return type for the summarizeTrend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTrendInputSchema = z.object({
  query: z.string().describe('The trending search query to summarize.'),
});
export type SummarizeTrendInput = z.infer<typeof SummarizeTrendInputSchema>;

const SummarizeTrendOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the trending search topic.'),
});
export type SummarizeTrendOutput = z.infer<typeof SummarizeTrendOutputSchema>;

export async function summarizeTrend(input: SummarizeTrendInput): Promise<SummarizeTrendOutput> {
  return summarizeTrendFlow(input);
}

const summarizeTrendPrompt = ai.definePrompt({
  name: 'summarizeTrendPrompt',
  input: {schema: SummarizeTrendInputSchema},
  output: {schema: SummarizeTrendOutputSchema},
  prompt: `Summarize the following trending search query in a concise manner:\n\n{{{query}}}`,
});

const summarizeTrendFlow = ai.defineFlow(
  {
    name: 'summarizeTrendFlow',
    inputSchema: SummarizeTrendInputSchema,
    outputSchema: SummarizeTrendOutputSchema,
  },
  async input => {
    const {output} = await summarizeTrendPrompt(input);
    return output!;
  }
);
