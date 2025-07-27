'use server';

/**
 * @fileOverview Fetches the top 10 stock market gainers from NSE.
 *
 * - getTopGainers - A function that retrieves the list of top gainers.
 * - TopGainer - The type for a single gainer stock.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

const GainerSchema = z.object({
  name: z.string(),
  price: z.string(),
  change: z.string(),
});
export type TopGainer = z.infer<typeof GainerSchema>;

export async function getTopGainers(): Promise<TopGainer[]> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return [];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };
  
  const prompt = `
    List today's top 10 stock market gainers on NSE.
    
    Provide the output as a clean JSON array like this:
    [
      { "name": "Company A", "price": "550.20", "change": "+12.30" },
      { "name": "Company B", "price": "780.90", "change": "+8.55" }
    ]
    Do not include any other text, just the JSON array. Ensure the change value is a string starting with a '+'.
  `;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      console.error('API request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text found in API response:', data);
      return [];
    }

    try {
      const cleanedJsonString = text.replace(/```json\n|```/g, '').trim();
      const parsedData: TopGainer[] = JSON.parse(cleanedJsonString);
      return parsedData;
    } catch (e) {
      console.error('Error parsing JSON from top gainers API:', e);
      return [];
    }
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    return [];
  }
}
