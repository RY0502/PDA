'use server';
/**
 * @fileOverview A flow that converts a summary HTML into a version with search links.
 *
 * - convertSummaryToLinks - A function that takes HTML and adds search links to it.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConvertSummaryInputSchema = z.object({
  summaryHtml: z.string().describe('The HTML content of the summary.'),
});

const ConvertSummaryOutputSchema = z.object({
  linkedSummaryHtml: z
    .string()
    .describe('The HTML content with important terms converted to search links.'),
});

const conversionPrompt = ai.definePrompt({
  name: 'conversionPrompt',
  input: {schema: ConvertSummaryInputSchema},
  output: {schema: ConvertSummaryOutputSchema},
  prompt: `
    You are an AI assistant that enhances text by converting important people, places, and topics into Google search links.
    For the given HTML, identify key terms and wrap them in anchor tags that link to a Google search for that term.
    
    IMPORTANT: 
    - Only link the text part of the summary.
    - Ensure the response is a single, valid JSON object.
    - The final HTML should be wrapped in a single root element, like a <div>.
    - The output should be a JSON object with a single key "linkedSummaryHtml".
    - Every link must be underlined using inline styles: style="text-decoration: underline;".

    Original HTML:
    \`\`\`html
    {{{summaryHtml}}}
    \`\`\`
  `,
});

export const convertSummaryToLinks = ai.defineFlow(
  {
    name: 'convertSummaryToLinksFlow',
    inputSchema: ConvertSummaryInputSchema,
    outputSchema: ConvertSummaryOutputSchema,
  },
  async input => {
    const {output} = await conversionPrompt(input);
    return output!;
  }
);
