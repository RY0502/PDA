'use server';

/**
 * @fileOverview Fetches a complete overview of the stock market,
 * including a watched stock, top gainers, and top losers.
 *
 * - getStockMarketOverview - Fetches the market overview.
 * - StockMarketInput - The input type for the function.
 * - StockMarketOverview - The return type for the function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

const StockInfoSchema = z.object({
  name: z.string().describe('The name of the stock or index.'),
  price: z.string().describe('The current price of the stock.'),
  change: z.string().describe('The change in price (e.g., "+5.50").'),
  changePercent: z.string().describe('The percentage change (e.g., "+1.25%").'),
});

const WatchedStockSchema = z.object({
  name: z.string().describe('The name of the watched stock.'),
  high: z.string().describe("Today's high price for the stock."),
  low: z.string().describe("Today's low price for the stock."),
});

const StockMarketOverviewSchema = z.object({
  watchedStock: WatchedStockSchema.describe(
    'The details for the user-watched stock.'
  ),
  topGainers: z
    .array(StockInfoSchema)
    .describe('A list of the top 10 gainer stocks from NSE.'),
  topLosers: z
    .array(StockInfoSchema)
    .describe('A list of the top 10 loser stocks from NSE.'),
});

export type StockMarketOverview = z.infer<typeof StockMarketOverviewSchema>;
export interface StockMarketInput {
  stockCode: string;
}

function safeJsonParse(jsonString: string): any | null {
  try {
    // The AI may wrap the JSON in markdown backticks, so we strip them
    const sanitizedString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(sanitizedString);
  } catch (error) {
    console.error('Failed to parse JSON string:', error, 'Original string:', jsonString);
    return null;
  }
}

export async function getStockMarketOverview(
  input: StockMarketInput
): Promise<StockMarketOverview | null> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };

  const prompt = `
      Provide a comprehensive overview of the Indian stock market (NSE) today.
      I need the following information in a structured JSON format only:

      1.  **Watched Stock**: Get today's high and low price for the stock with the code: "${input.stockCode}".
      2.  **Top 10 Gainers**: A list of the top 10 gainers on the NSE. For each stock, provide its name, current price, price change, and percentage change.
      3.  **Top 10 Losers**: A list of the top 10 losers on the NSE. For each stock, provide its name, current price, price change, and percentage change.

      Ensure the output is a valid JSON object only, with no extra text or markdown. The final output should start with { and end with }.
    `;

  const body = JSON.stringify({
    contents: [
      {
        parts: [{text: prompt}],
      },
    ],
    tools: [
      {
        google_search: {},
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
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
      return null;
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      console.error('No JSON text found in API response:', data);
      return null;
    }

    const overview = safeJsonParse(jsonText);
    if (!overview) {
      return null;
    }

    const parsed = StockMarketOverviewSchema.safeParse(overview);
    if (parsed.success) {
      return parsed.data;
    } else {
      console.error('Failed to parse API response into schema:', parsed.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching stock market overview:', error);
    return null;
  }
}
