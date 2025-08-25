'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-trend.ts';
import '@/ai/flows/get-latest-football-news.ts';
import '@/ai/flows/fetch-trending-searches.ts';
import '@/ai/flows/generate-club-logo.ts';
import '@/ai/flows/get-stock-market-overview.ts';
