CREATE TABLE watched_stocks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT,
  high NUMERIC,
  low NUMERIC,
  code TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE top_gainers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT,
  price NUMERIC,
  change NUMERIC,
  change_percent NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE top_losers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT,
  price NUMERIC,
  change NUMERIC,
  change_percent NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);