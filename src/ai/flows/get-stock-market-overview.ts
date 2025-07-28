
'use server';

/**
 * @fileOverview Fetches a complete overview of the stock market,
 * including a watched stock, top gainers, and top losers.
 *
 * - getStockMarketOverview - Fetches the market overview.
 * - StockMarketInput - The input type for the function.
 * - StockMarketOverview - The return type for the function.
 */

import {GEMINI_API_KEY} from '@/lib/constants';

export interface StockInfo {
  name: string;
  price: string;
  change: string;
  changePercent: string;
}

export interface WatchedStock {
  name: string;
  high: string;
  low: string;
}

export interface StockMarketOverview {
  watchedStock?: WatchedStock;
  topGainers?: StockInfo[];
  topLosers?: StockInfo[];
}

export interface StockMarketInput {
  stockCode: string;
}

function safeJsonParse(jsonString: string): any | null {
  try {
    // The AI may wrap the JSON in markdown backticks or other text, so we extract it.
    const match = jsonString.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null; // Return null if no JSON object is found
  } catch (error) {
    console.error(
      'Failed to parse JSON string:',
      error,
      'Original string:',
      jsonString
    );
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const headers = {
    'x-goog-api-key': GEMINI_API_KEY,
    'Content-Type': 'application/json',
  };

  const prompt = `
      Provide a comprehensive overview of the Indian stock market (NSE) today.
      I need the following information in a structured JSON format only:

      1.  **watchedStock**: Get today's high and low price for the stock with the code: "${input.stockCode}". The object should contain 'name', 'high', and 'low'.
      2.  **topGainers**: A list of the top 10 gainers on the NSE. For each stock, provide its 'name', current 'price', price 'change', and percentage 'changePercent'.
      3.  **topLosers**: A list of the top 10 losers on the NSE. For each stock, provide its 'name', current 'price', price 'change', and percentage 'changePercent'.

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

    const overview: StockMarketOverview = safeJsonParse(jsonText);
    
    if (!overview || typeof overview !== 'object') {
        console.error('Parsed JSON is not a valid object:', overview);
        return null;
    }

    console.log('Stock API Response:', JSON.stringify(overview, null, 2));

    // Basic manual validation to ensure the key properties exist
    if (overview.watchedStock && overview.topGainers && overview.topLosers) {
        return overview;
    } else {
        console.error('API response was missing one or more required fields (watchedStock, topGainers, topLosers).', overview);
        return null;
    }

  } catch (error) {
    console.error('Error fetching stock market overview:', error);
    return null;
  }
}
