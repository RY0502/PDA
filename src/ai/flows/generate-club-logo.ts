'use server';

/**
 * @fileOverview Generates a logo for a football club using AI.
 *
 * - generateClubLogo - A function that generates a club logo.
 * - GenerateClubLogoInput - The input type for the function.
 * - GenerateClubLogoOutput - The return type for the function.
 */

import { z } from 'genkit';
import { POLLINATIONS_API_KEY } from '@/lib/constants';

const GenerateClubLogoInputSchema = z.object({
  clubName: z.string().describe('The name of the football club.'),
});
export type GenerateClubLogoInput = z.infer<typeof GenerateClubLogoInputSchema>;

const GenerateClubLogoOutputSchema = z.object({
  logoUrl: z
    .string()
    .describe('The data URI of the generated logo image.')
    .optional(),
});
export type GenerateClubLogoOutput = z.infer<
  typeof GenerateClubLogoOutputSchema
>;

/**
 * Helper function to fetch logo with retry mechanism
 * @param url - The URL to fetch from
 * @param headers - Request headers
 * @param maxRetries - Maximum number of retries (default: 1)
 * @returns Response object
 */
async function fetchLogoWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries: number = 1
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { method: 'GET', headers });

      if (response.ok) {
        return response;
      }

      // If response is not ok, treat it as an error for retry purposes
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} failed, retrying...`, lastError.message);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} failed, retrying...`, lastError.message);
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new Error('Failed to fetch logo after retries');
}

export async function generateClubLogo(
  input: GenerateClubLogoInput
): Promise<GenerateClubLogoOutput> {
  // Some inputs might be like "Club A, Country". Use only the first segment for generation.
  const sanitizedClubName = input.clubName.split(',')[0].trim();
  const prompt = `Generate a logo for the football club/person: "${sanitizedClubName}". The design should be a modern, photorealistic,circular shaped that is as close as possible to the actual official club logo/person. The logo must be on a white background with the logo covering 95% of the image background area. Sometimes there could be additional text as well with the football club name/person. You will have to extract the football club name or the noun  before generating the logo. If there is any error during football club logo generation or you are unable to generate the logo for the football club, generate a logo of an actual football image instead in the same format.`;

  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://enter.pollinations.ai/api/generate/image/${encodedPrompt}?model=kontext&width=200&height=200`;
    const headers: Record<string, string> = {};
    if (POLLINATIONS_API_KEY) {
      headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    }

    // Use the retry mechanism
    const response = await fetchLogoWithRetry(url, headers, 1);

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const logoUrl = `data:${contentType};base64,${base64}`;

    if (!logoUrl) {
      console.error(`Failed to generate logo for ${sanitizedClubName}`);
      return { logoUrl: undefined };
    }

    return { logoUrl };
  } catch (error) {
    console.error(`Error generating logo for ${sanitizedClubName}:`, error);
    return { logoUrl: undefined };
  }
}
