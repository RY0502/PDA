'use server';

/**
 * @fileOverview Generates a logo for a football club using AI.
 *
 * - generateClubLogo - A function that generates a club logo.
 * - GenerateClubLogoInput - The input type for the function.
 * - GenerateClubLogoOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

export async function generateClubLogo(
  input: GenerateClubLogoInput
): Promise<GenerateClubLogoOutput> {
  // Some inputs might be like "Club A, Country". Use only the first segment for generation.
  const sanitizedClubName = input.clubName.split(',')[0].trim();
  const prompt = `Generate a logo for the football club: "${sanitizedClubName}". The design should be a modern, minimalist, circular interpretation that is as close as possible to the actual official club logo. The logo must be on a transparent background. Sometimes there could be additional text as well with the football club name. You will have to extract the football club name before generating the logo. If there is any error during football club logo generation or you are unable to generate the logo for the football club, generate a logo of an actual football image instead in the same format.`;

  try {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const logoUrl = media?.url;

    if (!logoUrl) {
      console.error(`Failed to generate logo for ${sanitizedClubName}`);
      return {logoUrl: undefined};
    }

    return {logoUrl};
  } catch (error) {
    console.error(`Error generating logo for ${sanitizedClubName}:`, error);
    return {logoUrl: undefined};
  }
}
