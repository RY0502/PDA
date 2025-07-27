'use server';

/**
 * @fileOverview A flow to get a club's logo URL using Google Search.
 *
 * - getClubLogoUrl - A function that returns a URL for a club's logo.
 * - GetClubLogoUrlInput - The input type for the getClubLogoUrl function.
 * - GetClubLogoUrlOutput - The return type for the getClubLogoUrl function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

const GetClubLogoUrlInputSchema = z.object({
  clubName: z.string().describe('The name of the football club.'),
});
export type GetClubLogoUrlInput = z.infer<typeof GetClubLogoUrlInputSchema>;

const GetClubLogoUrlOutputSchema = z.object({
  imageUrl: z.string().optional().describe('The URL of the club logo.'),
});
export type GetClubLogoUrlOutput = z.infer<typeof GetClubLogoUrlOutputSchema>;

export async function getClubLogoUrl(
  input: GetClubLogoUrlInput
): Promise<GetClubLogoUrlOutput> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return {imageUrl: undefined};
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          {text: `Find a transparent logo for the football club: ${input.clubName}`},
        ],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      console.error(
        'API request failed:',
        response.status,
        await response.text()
      );
      return {imageUrl: undefined};
    }

    const data = await response.json();
    console.log('API Response for', input.clubName, ':', JSON.stringify(data, null, 2));

    const imageUrl =
      data.candidates?.[0]?.content?.parts?.[0]?.tool_calls?.[0]?.google_search?.results?.[0]?.image?.uri;

    if (!imageUrl) {
      console.error(
        'No image URL found in API response for',
        input.clubName
      );
      return {imageUrl: undefined};
    }

    return {imageUrl};
  } catch (error) {
    console.error(`Error fetching logo for ${input.clubName}:`, error);
    return {imageUrl: undefined};
  }
}
