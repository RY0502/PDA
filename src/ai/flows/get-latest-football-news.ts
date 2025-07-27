'use server';

/**
 * @fileOverview Fetches the latest football news summary and club logos.
 *
 * - getLatestFootballNews - Retrieves news and logos.
 * - GetLatestFootballNewsOutput - The return type for the function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';
import {
  getClubLogoUrl,
  type GetClubLogoUrlOutput,
} from './get-club-logo-url';

const ClubWithLogoSchema = z.object({
  name: z.string(),
  logoUrl: z.string().optional(),
});
export type ClubWithLogo = z.infer<typeof ClubWithLogoSchema>;

const GetLatestFootballNewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest football news.'),
  clubsWithLogos: z
    .array(ClubWithLogoSchema)
    .describe('A list of clubs mentioned in the news with their logos.'),
});
export type GetLatestFootballNewsOutput = z.infer<
  typeof GetLatestFootballNewsOutputSchema
>;

// Helper to extract unique club names (and remove trailing colons)
function extractClubNames(summary: string): string[] {
  const clubNameRegex = /\*\*(.*?)\*\*/g;
  const matches = summary.match(clubNameRegex) || [];
  const uniqueNames = new Set(
    matches.map((name) => name.replace(/\*\*/g, '').replace(/:$/, '').trim())
  );
  return Array.from(uniqueNames).slice(0, 10);
}

export async function getLatestFootballNews(): Promise<GetLatestFootballNewsOutput> {
  const defaultResponse = {summary: '', clubsWithLogos: []};

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return {
      summary:
        '**Configuration Error**\n* The Gemini API key is not configured. Please set it in your environment variables.',
      clubsWithLogos: [],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [{text: 'Football transfer news and general football news today'}],
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
      const errorBody = await response.text();
      console.error('API request failed:', response.status, errorBody);
      return {
        summary: `**API Error**\n* Could not fetch news. Status: ${response.status}`,
        clubsWithLogos: [],
      };
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.error('No summary found in API response:', data);
      return {
        summary: '**API Error**\n* No news summary was returned from the API.',
        clubsWithLogos: [],
      };
    }

    const clubNames = extractClubNames(summary);
    const logoPromises = clubNames.map(
      (name) =>
        getClubLogoUrl({clubName: name}) as Promise<GetClubLogoUrlOutput>
    );
    const logoResults = await Promise.all(logoPromises);

    const clubsWithLogos = clubNames.map((name, index) => ({
      name,
      logoUrl: logoResults[index]?.imageUrl,
    }));

    return {summary, clubsWithLogos};
  } catch (error) {
    console.error('Error fetching football news:', error);
    return {
      summary: `**Network Error**\n* There was an error fetching the news. Please check your connection.`,
      clubsWithLogos: [],
    };
  }
}
