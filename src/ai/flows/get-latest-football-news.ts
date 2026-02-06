
'use server';
import {z} from 'genkit';
import {FOOTBALL_KEY_URL} from '@/lib/constants';
import { generateClubLogo } from './generate-club-logo';
import { fetchGeminiApiKey, generateSummaryWithRetry } from '@/ai/gemini';

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

export async function getLatestFootballNews(): Promise<GetLatestFootballNewsOutput> {
  const fallbackResponse = {
    summary: '**Network Error**\n* There was an error fetching the news. Please check your connection or API key.',
    clubsWithLogos: [],
    totalClubs: 0,
  };

  const pageKey = await fetchGeminiApiKey(FOOTBALL_KEY_URL || '', 3, 1000);
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

  const prompt =
    'Using ONLY real-time web results get me trending football stories from the past 24 hours from top 5 football leagues-English Premier League, Spanish La Liga, German Bundesliga, Italian Serie A and French Ligue 1. It is important to generate each news as it\'s own line item.Highlight the main part or noun in the news.Do not include any commentary, explanations.'
    //'Football transfer news and general football news from the past 24 hours.Do not include any commentary or extra text other than the news.';
  const summary = await generateSummaryWithRetry(apiKey, prompt, 3, 3000);
  if (!summary) {
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
      const topClubNames = allUniqueClubNames.slice(0, 5);
      
      const logoPromises = topClubNames.map(name => 
        generateClubLogo({ clubName: name }).then(result => ({
          name: name,
          logoUrl: result.logoUrl,
        }))
      );

      const clubsWithLogos = await Promise.all(logoPromises);

  return { summary, clubsWithLogos, totalClubs };
}
