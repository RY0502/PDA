'use server';

/**
 * @fileOverview Fetches the current, high, and low price for a given stock symbol from NSE.
 *
 * - getStockPrice - A function that retrieves the stock price information.
 * - StockPriceInput - The input type for the getStockPrice function.
 * - StockPriceOutput - The return type for the getStockPrice function.
 */

import {z} from 'genkit';
import {GEMINI_API_KEY} from '@/lib/constants';

const StockPriceInputSchema = z.object({
  stockCode: z.string().describe('The NSE stock symbol, e.g., "PVRINOX".'),
});
export type StockPriceInput = z.infer<typeof StockPriceInputSchema>;

const StockPriceOutputSchema = z.object({
  stockCode: z.string(),
  currentPrice: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
  companyName: z.string(),
});
export type StockPriceOutput = z.infer<typeof StockPriceOutputSchema>;

export async function getStockPrice(
  input: StockPriceInput
): Promise<StockPriceOutput> {
  const fallbackResponse = {
    stockCode: input.stockCode,
    currentPrice: 'N/A',
    highPrice: 'N/A',
    lowPrice: 'N/A',
    companyName: 'Could not fetch data',
  };

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return fallbackResponse;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };
  
  const prompt = `
    What is the current, today's high, and today's low price for the stock with symbol ${input.stockCode} on the NSE? Also provide the full company name.
    
    Please provide the output in a clean JSON format like this:
    {
      "stockCode": "PVRINOX",
      "companyName": "PVR INOX Limited",
      "currentPrice": "1430.00",
      "highPrice": "1450.00",
      "lowPrice": "1420.00"
    }
    Do not include any other text, just the JSON object.
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
      return fallbackResponse;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text found in API response:', data);
      return fallbackResponse;
    }

    try {
      const cleanedJsonString = text.replace(/```json\n|```/g, '').trim();
      const parsedData: StockPriceOutput = JSON.parse(cleanedJsonString);
      return parsedData;
    } catch (e) {
      console.error('Error parsing JSON from stock price API:', e);
      return fallbackResponse;
    }
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return fallbackResponse;
  }
}
