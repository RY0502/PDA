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
  // Use a more specific global property to avoid potential conflicts.
  const globalWithScheduler = global as typeof global & {
    _schedulerInitialized?: boolean;
  };

  if (process.env.NODE_ENV === 'development') {
    if (globalWithScheduler._schedulerInitialized) {
      return;
    }
    globalWithScheduler._schedulerInitialized = true;
  }

  console.log('Initializing schedulers...');

  // A single function to perform all data fetches.
  const fetchAllData = async () => {
    console.log('Refreshing all data caches...');
    try {
      await Promise.all([
        updateMediumArticlesCache(),
        updateFootballNewsCache(),
        updateTrendingSearchesCache(),
      ]);
      console.log('All data caches refreshed successfully.');
    } catch (error) {
      console.error('Error during scheduled data fetch:', error);
    }
  };

  // Perform an initial data fetch on server startup.
  fetchAllData();

  // Schedule a single job to run hourly to refresh all data.
  // The cron string '0 * * * *' means "at the 0th minute of every hour".
  schedule.scheduleJob('0 * * * *', fetchAllData);

  console.log('Schedulers initialized successfully. Caches will be refreshed hourly.');
}

initializeSchedulers();
