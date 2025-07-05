'use server';

import schedule from 'node-schedule';
import {
  updateFootballNewsCache,
  updateMediumArticlesCache,
  updateTrendingSearchesCache,
} from '@/lib/data-cache';

/**
 * This file initializes background jobs to periodically refresh the application's data cache.
 * It uses a global flag to ensure that the schedulers are only initialized once,
 * which is crucial in a development environment with hot-reloading.
 */
function initializeSchedulers() {
  const globalWithScheduler = global as typeof global & {
    __schedulersInitialized?: boolean;
  };

  if (globalWithScheduler.__schedulersInitialized) {
    return;
  }
  globalWithScheduler.__schedulersInitialized = true;

  console.log('Initializing schedulers...');

  // Perform an initial data fetch on server startup to populate the cache.
  console.log('Performing initial data fetch...');
  Promise.all([
    updateMediumArticlesCache(),
    updateFootballNewsCache(),
    updateTrendingSearchesCache(),
  ]).catch((error) => {
    console.error('Initial data fetch on startup failed:', error);
  });

  // Schedule hourly updates for football news and trends.
  // The cron string '0 * * * *' means "at the 0th minute of every hour".
  schedule.scheduleJob('0 * * * *', () => {
    console.log('Running hourly job: updating football and trends cache...');
    updateFootballNewsCache();
    updateTrendingSearchesCache();
  });

  // Schedule updates for Medium articles every 6 hours.
  // The cron string '0 */6 * * *' means "at the 0th minute of every 6th hour".
  schedule.scheduleJob('0 */6 * * *', () => {
    console.log('Running 6-hourly job: updating medium articles cache...');
    updateMediumArticlesCache();
  });

  console.log('Schedulers initialized successfully.');
}

initializeSchedulers();
