'use server';

/**
 * @fileOverview Fetches the latest football news summary and generates logos for mentioned clubs.
 *
 * - getLatestFootballNews - Retrieves news and club logos.
 * - GetLatestFootballNewsOutput - The return type for the function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';
import { generateClubLogo } from './generate-club-logo';

const ClubWithLogoSchema = z.object({
  name: z.string(),
  logoUrl: z.string(),
});

const GetLatestFootballNewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest football news.'),
  clubsWithLogos: z.array(ClubWithLogoSchema).describe('A list of clubs mentioned in the news, with their generated logos.')
});
export type GetLatestFootballNewsOutput = z.infer<
  typeof GetLatestFootballNewsOutputSchema
>;

export async function getLatestFootballNews(): Promise<GetLatestFootballNewsOutput> {
  const fallbackResponse = {
    summary: 'Could not fetch news at this time.',
    clubsWithLogos: [],
  };

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
    
    const clubNameRegex = /\*\*(.*?)\*\*/g;
    const matches = summary.match(clubNameRegex) || [];
    const uniqueClubNames = Array.from(new Set(matches.map(name => name.replace(/\*\*/g, '').trim().replace(/:$/, '')))).slice(0, 4);
    
    const logoPromises = uniqueClubNames.map(name => 
      generateClubLogo({ clubName: name }).then(result => ({
        name: name,
        logoUrl: result.logoUrl,
      }))
    );

    const clubsWithLogos = await Promise.all(logoPromises);

    return { summary, clubsWithLogos };
  } catch (error) {
    console.error('Error fetching football news:', error);
    return {
      summary: `**Network Error**\n* There was an error fetching the news. Please check your connection.`,
      clubsWithLogos: [],
    };
  }
}
