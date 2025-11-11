-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- fetch-stock-price every hour from 8am to 6pm on weekdays
SELECT cron.schedule(
  'fetch-stock-price',
  '0 8-18 * * 1-5',
  $$
    SELECT net.http_post(
        url:='https://project-ref.supabase.co/functions/v1/fetch-stock-price',
        headers:='{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer ANON_KEY\"}',
        body:=json_build_object(
            'stockCode', 'PVRINOX'
        )
    ) AS "request_id";
  $$
);

-- fetch-top-gainers every hour from 8am to 6pm on weekdays
SELECT cron.schedule(
  'fetch-top-gainers',
  '0 8-18 * * 1-5',
  $$
    SELECT net.http_post(
        url:='https://project-ref.supabase.co/functions/v1/fetch-top-gainers',
        headers:='{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer ANON_KEY\"}'
    ) AS "request_id";
  $$
);

-- fetch-top-losers every hour from 8am to 6pm on weekdays
SELECT cron.schedule(
  'fetch-top-losers',
  '0 8-18 * * 1-5',
  $$
    SELECT net.http_post(
        url:='https://project-ref.supabase.co/functions/v1/fetch-top-losers',
        headers:='{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer ANON_KEY\"}'
    ) AS "request_id";
  $$
);