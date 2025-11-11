SELECT cron.schedule(
  'fetch-stock-data-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url:='https://<project_ref>.supabase.co/functions/v1/fetch-stock-data',
    headers:_jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT raw_app_meta_data->>'api_key' FROM auth.users WHERE email = 'cron@supabase.io')
    )
  ) WHERE EXTRACT(HOUR FROM now()) NOT IN (1, 2, 3, 4, 5, 6, 7, 8);
  $$
);