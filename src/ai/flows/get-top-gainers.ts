'use server';

/**
 * @fileOverview Fetches the top 10 stock market gainers from NSE within a specified price range.
 *
 * - getTopGainers - A function that retrieves the list of top gainers.
 * - TopGainer - The type for a single gainer stock.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

export const GainerSchema = z.object({
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: "List today's top 10 stock market gainers on NSE with a share price between 400 and 950 INR. For each, provide the company name, its current price, and its price change.",
          },
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
      console.error('API request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text found in API response:', data);
      return [];
    }

    const gainers: TopGainer[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('* **')) {
        const parts = line.split(':**');
        const name = parts[0].replace('* **', '').trim();
        const details = parts[1] || '';
        const priceMatch = details.match(/Price:.*?([\d,]+\.\d+)/);
        const changeMatch = details.match(/Change:.*?([\d,]+\.\d+)/);

        if (name && priceMatch && changeMatch) {
          gainers.push({
            name,
            price: priceMatch[1],
            change: `+${changeMatch[1]}`,
          });
        }
      }
    }
    return gainers;
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    return [];
  }
}
