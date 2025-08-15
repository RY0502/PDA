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
  const prompt = `
Goal: Generate a club-style logo image for the football club: "${sanitizedClubName}".

Primary style requirements:
- Modern, minimalist, vector-like, circular badge layout.
- Flat shapes, clean geometry, high contrast; avoid photorealism and textures.
- Centered composition, balanced spacing, 8–12% inward padding.
- Transparent background (no solid fills behind artwork).
- OUTPUT MUST BE CIRCULAR: use an alpha mask so everything outside a perfect circle is fully transparent. The opaque content must be fully contained within the circle. Recommended canvas 1024x1024, but only the inscribed circle should contain non-transparent pixels.
- Avoid text unless essential; if used, keep it minimal and legible.

Brand guidance:
- Aim for a tasteful, abstracted interpretation inspired by the club’s identity (colors/shapes/symbols) without copying trademarked assets exactly.
- No official crests or copyrighted wordmarks; produce an original design that evokes the club.

Absolute constraints (must follow):
- Output: a single image only. No captions, no borders, no watermarks.
- Background: fully transparent (PNG preferred) with clean anti-aliased edges.
- Do not include photography, stock images, or complex small text.

Fallback behavior (must execute if the club-specific design is blocked, unsafe, or uncertain):
1) Generate a generic football-themed circular badge with neutral colors and abstract elements (ball panels, laurel, stripes, or star), fully original.
2) If that still fails, generate a minimalist vector football icon (simple ball or abstract hex/stripe motif) in a circular badge.

Quality checks before returning:
- Ensure the image uses a perfect circular alpha mask: no stray/non-transparent pixels outside the circle.
- Ensure the design is centered within the circle, with transparent background elsewhere.
- Ensure strong edge contrast against both light and dark themes.
- Ensure no unwanted text, watermarks, or photographic elements.

Return only the image.`;

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
