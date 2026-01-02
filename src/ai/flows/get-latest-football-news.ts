
'use server';

/**
 * @fileOverview Fetches the latest football news summary and generates logos for mentioned clubs.
 *
 * - getLatestFootballNews - Retrieves news and club logos.
 * - GetLatestFootballNewsOutput - The return type for the function.
 */

import {z} from 'genkit';
import {FOOTBALL_KEY_URL} from '@/lib/constants';
import { generateClubLogo } from './generate-club-logo';

const ClubWithLogoSchema = z.object({
  name: z.string(),
  logoUrl: z.string().optional(),
});

const GetLatestFootballNewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the latest football news.'),
  clubsWithLogos: z.array(ClubWithLogoSchema).describe('A list of clubs mentioned in the news, with their generated logos.'),
  totalClubs: z.number().describe('The total number of unique clubs mentioned in the summary.')
});
export type GetLatestFootballNewsOutput = z.infer<
  typeof GetLatestFootballNewsOutputSchema
>;

// Simple sleep utility for retry backoff
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFootballApiKey(): Promise<string | null> {
  const base = FOOTBALL_KEY_URL || '';
  try {
    const u = new URL(base);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(u.toString(), { method: 'GET' });
        if (r.ok) {
          const data = await r.json();
          const key = data?.keys?.[0]?.vault_keys?.decrypted_value;
          if (typeof key === 'string' && key.length > 0) return key;
        }
      } catch (_e) {}
      await sleep(1000);
    }
    return null;
  } catch (_e) {
    return null;
  }
}

export async function getLatestFootballNews(): Promise<GetLatestFootballNewsOutput> {
  const fallbackResponse = {
    summary: '**Network Error**\n* There was an error fetching the news. Please check your connection or API key.',
    clubsWithLogos: [],
    totalClubs: 0,
  };

  const pageKey = await getFootballApiKey();
  const apiKey = pageKey;
  if (!apiKey) {
    console.error('Football API key could not be resolved.');
    return {
      summary:
        '**Configuration Error**\n* The API key for football could not be resolved from FOOTBALL_KEY_URL.',
      clubsWithLogos: [],
      totalClubs: 0,
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [{text: 'Football transfer news and general football news from the past 24 hours.Do not include any commentary or extra text other than the news.'}]
        //parts: [{text: 'Using ONLY real-time web results get me trending football stories from the past 24 hours from top 5 football leagues-English Premier League, Spanish La Liga, German Bundesliga, Italian Serie A and French Ligue 1. It is important to generate each news as it\'s own line item.Highlight the main part or noun in the news.Do not include any commentary, explanations.'}],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
     generationConfig: {
    thinkingConfig: {
      thinkingBudget: 0,
    },
  },
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API request failed (attempt ${attempt}/3):`, response.status, errorBody);
        if (attempt === 3) {
            return {
                summary: `**API Error**\n* Could not fetch news. Status: ${response.status}`,
                clubsWithLogos: [],
                totalClubs: 0,
            };
        }
        await sleep(5000); // Wait for 5 seconds before retrying
        continue;
      }

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!summary) {
        console.error(`No summary found in API response (attempt ${attempt}/3):`, data);
        if (attempt === 3) {
            return {
                summary: '**API Error**\n* No news summary was returned from the API.',
                clubsWithLogos: [],
                totalClubs: 0,
            };
        }
        await sleep(2000); // Wait for 2 seconds before retrying
        continue;
      }
      
      const clubNameRegex = /\*\*(.*?)\*\*/g;
      const matches = summary.match(clubNameRegex) || [];
      const allUniqueClubNames = Array.from(new Set(matches.map(name => name.replace(/\*\*/g, '').trim().replace(/:$/, ''))));
      const totalClubs = allUniqueClubNames.length;
      const topClubNames = allUniqueClubNames.slice(0, 5);
      
      const logoPromises = topClubNames.map(name => 
        generateClubLogo({ clubName: name }).then(result => ({
          name: name,
          logoUrl: result.logoUrl,
        }))
      );

      const clubsWithLogos = await Promise.all(logoPromises);

      // If we got here, it was successful, so we return.
      return { summary, clubsWithLogos, totalClubs };

    } catch (error: any) {
      console.error(`Error fetching football news (attempt ${attempt}/3):`, error.message || error);
      if (attempt === 3) {
        return fallbackResponse;
      }
      await sleep(2000); // Wait for 2 seconds before retrying
    }
  }

  // This part should not be reachable, but is here as a final fallback.
  return fallbackResponse;
}
