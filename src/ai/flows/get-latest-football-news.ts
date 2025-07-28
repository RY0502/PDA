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
  clubsWithLogos: z.array(ClubWithLogoSchema).describe('A list of clubs mentioned in the news, with their generated logos.'),
  totalClubs: z.number().describe('The total number of unique clubs mentioned in the summary.')
});
export type GetLatestFootballNewsOutput = z.infer<
  typeof GetLatestFootballNewsOutputSchema
>;

export async function getLatestFootballNews(): Promise<GetLatestFootballNewsOutput> {
  const fallbackResponse = {
    summary: '**Network Error**\n* There was an error fetching the news. Please check your connection or API key.',
    clubsWithLogos: [],
    totalClubs: 0,
  };

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return {
      summary:
        '**Configuration Error**\n* The Gemini API key is not configured. Please set it in your environment variables.',
      clubsWithLogos: [],
      totalClubs: 0,
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
        totalClubs: 0,
      };
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.error('No summary found in API response:', data);
      return {
        summary: '**API Error**\n* No news summary was returned from the API.',
        clubsWithLogos: [],
        totalClubs: 0,
      };
    }
    
    const clubNameRegex = /\*\*(.*?)\*\*/g;
    const matches = summary.match(clubNameRegex) || [];
    const allUniqueClubNames = Array.from(new Set(matches.map(name => name.replace(/\*\*/g, '').trim().replace(/:$/, ''))));
    const totalClubs = allUniqueClubNames.length;
    const topClubNames = allUniqueClubNames.slice(0, 6);
    
    const logoPromises = topClubNames.map(name => 
      generateClubLogo({ clubName: name }).then(result => ({
        name: name,
        logoUrl: result.logoUrl,
      }))
    );

    const clubsWithLogos = await Promise.all(logoPromises);

    return { summary, clubsWithLogos, totalClubs };
  } catch (error: any) {
    console.error('Error fetching football news:', error.message || error);
    return fallbackResponse;
  }
}
