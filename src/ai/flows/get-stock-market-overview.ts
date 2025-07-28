'use server';

/**
 * @fileOverview Fetches a complete overview of the stock market,
 * including a watched stock, top gainers, and top losers.
 *
 * - getStockMarketOverview - Fetches the market overview.
 * - StockMarketInput - The input type for the function.
 * - StockMarketOverview - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StockInfoSchema = z.object({
  name: z.string().describe('The name of the stock or index.'),
  price: z.string().describe('The current price of the stock.'),
  change: z.string().describe('The change in price (e.g., "+5.50").'),
  changePercent: z.string().describe('The percentage change (e.g., "+1.25%").'),
});

const WatchedStockSchema = z.object({
    name: z.string().describe("The name of the watched stock."),
    high: z.string().describe("Today's high price for the stock."),
    low: z.string().describe("Today's low price for the stock.")
});

const StockMarketOverviewSchema = z.object({
  watchedStock: WatchedStockSchema.describe('The details for the user-watched stock.'),
  topGainers: z.array(StockInfoSchema).describe('A list of the top 10 gainer stocks from NSE.'),
  topLosers: z.array(StockInfoSchema).describe('A list of the top 10 loser stocks from NSE.'),
});

export type StockMarketOverview = z.infer<typeof StockMarketOverviewSchema>;

export interface StockMarketInput {
  stockCode: string;
}

const getStockMarketOverviewFlow = ai.defineFlow(
  {
    name: 'getStockMarketOverviewFlow',
    inputSchema: z.object({ stockCode: z.string() }),
    outputSchema: StockMarketOverviewSchema,
  },
  async (input) => {
    const prompt = `
      Provide a comprehensive overview of the Indian stock market (NSE) today.
      I need the following information in a structured JSON format:

      1.  **Watched Stock**: Get today's high and low price for the stock with the code: "${input.stockCode}".
      2.  **Top 10 Gainers**: A list of the top 10 gainers on the NSE. For each stock, provide its name, current price, price change, and percentage change.
      3.  **Top 10 Losers**: A list of the top 10 losers on the NSE. For each stock, provide its name, current price, price change, and percentage change.

      Ensure the output is a valid JSON object matching the defined schema.
    `;
    
    const { output } = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-flash',
      output: {
        format: 'json',
        schema: StockMarketOverviewSchema,
      },
      config: {
        // High temperature for potentially more creative/accurate data synthesis
        temperature: 0.8,
      },
    });

    return output!;
  }
);


export async function getStockMarketOverview(input: StockMarketInput): Promise<StockMarketOverview | null> {
  try {
    const overview = await getStockMarketOverviewFlow(input);
    return overview;
  } catch(e) {
    console.error("Error fetching stock market overview", e);
    return null;
  }
}
