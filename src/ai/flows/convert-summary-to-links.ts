
'use server';

/**
 * @fileOverview Converts a given HTML summary into a version with Google search links.
 *
 * - convertSummaryToLinks - A function that takes a summary and returns a link-enhanced version.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

// Define types inside the function scope or in a separate file without 'use server'.
// For simplicity here, we'll validate inside the function.

export async function convertSummaryToLinks(
  input: any
): Promise<{ linkedSummaryHtml: string }> {

  const ConvertSummaryToLinksInputSchema = z.object({
    summaryHtml: z.string().describe('The HTML summary to convert.'),
  });
  
  const parsedInput = ConvertSummaryToLinksInputSchema.parse(input);

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };

  const prompt = `You are an expert in finding distinct news from html text. You are given summary of news in html form: ${parsedInput.summaryHtml}. You need to find distinct news with in each line item provided in the input and convert it into a link within the text with href as google search url with that news text. A line item can either have single news in each line or mutliple. For e.g. this news- 'Viral videos include an Odisha woman dancing to Hrithik Roshan's Dhoom Again and a Himachal nurse bravely crossing a raging stream to reach work'. have 2 distinct news so 'Odisha woman dancing to Hrithik Roshan's Dhoom Again' and 'Himachal nurse bravely crossing a raging stream to reach work' should becomes 2 distinct links with their texts in href for google search.

Always output the summary in the same html as the input with the only change of converting the summary text into links with href. Do not include any commentary of extra symbols.`;

  const body = JSON.stringify({
    contents: [{parts: [{text: prompt}]}],
  });

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('API request failed:', response.status, errorBody);
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const linkedSummaryHtml = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!linkedSummaryHtml) {
    console.error('No linked summary found in API response:', data);
    throw new Error('Failed to generate linked summary.');
  }

  return {linkedSummaryHtml};
}
