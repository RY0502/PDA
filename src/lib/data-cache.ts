'use server';

import { getMediumArticles, MediumArticleResponse } from '@/services/email-service';
import { getLatestFootballNews, GetLatestFootballNewsOutput } from '@/ai/flows/get-latest-football-news';
import { fetchTrendingSearches, TrendingSearchesOutput } from '@/ai/flows/fetch-trending-searches';

let mediumArticlesCache: MediumArticleResponse | null = null;
let footballNewsCache: GetLatestFootballNewsOutput | null = null;
let trendingSearchesCache: TrendingSearchesOutput | null = null;

// Functions to update the cache
export async function updateMediumArticlesCache() {
  console.log('Updating Medium articles cache...');
  try {
    mediumArticlesCache = await getMediumArticles();
    console.log('Medium articles cache updated successfully.');
  } catch (error) {
    console.error('Failed to update Medium articles cache:', error);
  }
}

export async function updateFootballNewsCache() {
  console.log('Updating football news cache...');
  try {
    footballNewsCache = await getLatestFootballNews({});
    console.log('Football news cache updated successfully.');
  } catch (error) {
    console.error('Failed to update football news cache:', error);
  }
}

export async function updateTrendingSearchesCache() {
  console.log('Updating trending searches cache...');
  try {
    trendingSearchesCache = await fetchTrendingSearches();
    console.log('Trending searches cache updated successfully.');
  } catch (error) {
    console.error('Failed to update trending searches cache:', error);
  }
}

// Functions to get data from cache (with cold start handling)
export async function getCachedMediumArticles(): Promise<MediumArticleResponse> {
  if (!mediumArticlesCache) {
    await updateMediumArticlesCache();
  }
  return mediumArticlesCache!;
}

export async function getCachedFootballNews(): Promise<GetLatestFootballNewsOutput> {
  if (!footballNewsCache) {
    await updateFootballNewsCache();
  }
  return footballNewsCache!;
}

export async function getCachedTrendingSearches(): Promise<TrendingSearchesOutput> {
  if (!trendingSearchesCache) {
    await updateTrendingSearchesCache();
  }
  return trendingSearchesCache!;
}
