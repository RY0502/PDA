import { Suspense, cache } from 'react';
import StocksPageClient from '../stocks-client';
import PageSkeleton from '../skeleton';
import { GEMINI_API_KEY } from '@/lib/constants';
import type { StockMarketOverview } from '@/ai/flows/get-stock-market-overview';


export const revalidate = 3600; // Revalidate the page every 1 hour

function safeJsonParse(jsonString: string): any | null {
  try {
    const match = jsonString.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (error) {
    console.error('Failed to parse JSON string:', error, 'Original string:', jsonString);
    return null;
  }
}

async function getStockData(stockCode: string): Promise<StockMarketOverview | null> {
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

      1.  **watchedStock**: Get today's high and low price for the stock with the code: "${stockCode}". The object should contain 'name', 'high', and 'low'.
      2.  **topGainers**: A list of the top 10 gainers on the NSE today. For each stock, provide its 'name', current 'price', price 'change', and percentage 'changePercent'.
      3.  **topLosers**: A list of the top 10 losers on the NSE today. For each stock, provide its 'name', current 'price', price 'change', and percentage 'changePercent'.

      Ensure the output is a valid JSON object only, with no extra text or markdown. The final output should start with { and end with }.
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
      next: { revalidate: 3600 } // Cache for 1 hour
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

async function StocksData({ stockCode }: { stockCode: string }) {
  const initialData = await getStockData(stockCode);
  return <StocksPageClient initialData={initialData} stockCode={stockCode} />;
}

export default function StockCodePage({
  params,
}: {
  params: { code: string };
}) {
  const stockCode = params.code || 'PVRINOX';

  return (
    <Suspense fallback={<PageSkeleton />}>
      <StocksData stockCode={stockCode} />
    </Suspense>
  );
}
