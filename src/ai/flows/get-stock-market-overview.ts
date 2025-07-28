
'use server';

/**
 * @fileOverview Defines the data structure for the stock market overview.
 * The fetching logic has been moved to the page component for caching.
 *
 * - StockMarketOverview - The main data structure.
 * - StockInfo - Information for a single stock.
 * - WatchedStock - Information for the user's watched stock.
 */

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
