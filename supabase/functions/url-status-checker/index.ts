// Edge Function: url-status-checker
// Checks a list of URLs and logs their status to the `url_status_logs` table.
// Logging is performed only during allowed IST windows for specific URLs.
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// Base URLs to check
const BASE_URLS = [
  "https://pda-wine.vercel.app/football",
  "https://pda-wine.vercel.app/stocks/",
  "https://pda-wine.vercel.app/trends",
  "https://pda-wine.vercel.app",
  // Added URL — only allowed 08:00–09:00 IST
  "https://pda-wine.vercel.app/api/cache/medium/populate"
];

// Helper: current time in IST (Asia/Kolkata)
function getISTDate() {
  // Using toLocaleString forces the timezone conversion
  const istString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata"
  });
  return new Date(istString);
}

// Checks if the current IST time is within the allowed window for the stocks endpoint
function isStocksTimeValid() {
  const now = getISTDate();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const start = 8 * 60 + 45; // 08:45
  const end = 23 * 60 + 30; // 23:30
  return totalMinutes >= start && totalMinutes <= end;
}

// Checks if the current IST time is within the allowed window for the main site
function isMainSiteTimeValid() {
  const now = getISTDate();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const start = 8 * 60; // 08:00
  const end = 23 * 60 + 30; // 23:30
  return totalMinutes >= start && totalMinutes <= end;
}

// Checks if the current IST time is **outside** the restricted window 01:00‑09:00 for football/trends
function isEarlyMorningAllowed() {
  const now = getISTDate();
  const hour = now.getHours(); // 0‑23
  // Restricted between 01:00 (inclusive) and 09:00 (exclusive)
  // The original code inverted this; keep behavior: return false if between 1 and 9 (exclusive 1? original used >1 && <=9)
  // We'll preserve previous semantics: restricted when hour > 1 && hour <= 9
  return !(hour > 1 && hour <= 9);
}

/**
 * Logs the status of a URL to `url_status_logs`.
 * If `shouldLog` is false the function returns early (used for time‑window checks).
 */
async function logUrlStatus(supabase: any, url: string, shouldLog = true) {
  if (!shouldLog) {
    console.log(`Skipping log for ${url} due to time constraints`);
    return;
  }
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "GET"
    });
    const endTime = Date.now();
    const logEntry = {
      url,
      status_code: response.status,
      response_time_ms: endTime - startTime,
      checked_at: new Date().toISOString()
    };
    // Insert log entry
    const { error: insertError } = await supabase.from("url_status_logs").insert(logEntry);
    if (insertError) throw insertError;
    // Remove logs older than 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const { error: deleteError } = await supabase.from("url_status_logs").delete().lt("checked_at", twoDaysAgo.toISOString());
    if (deleteError) throw deleteError;
    console.log(`Logged status for ${url}: ${response.status}`);
  } catch (err) {
    console.error(`Error checking ${url} or cleaning logs:`, err);
  }
}

console.info("url-status-checker started");

Deno.serve(async (req: Request) => {
  // Initialise Supabase client with service role key (bypasses RLS)
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // Get the most recent stock code, if any
  const { data: stockCodeData, error: stockCodeError } = await supabase
    .from("stock_code")
    .select("code")
    .order("updatedAt", { ascending: false })
    .limit(1)
    .single();

  if (stockCodeError && stockCodeError.code !== "PGRST116") {
    // PGRST116 = No rows returned – that's fine, we just won't have a code.
    console.error("Error fetching latest stock code:", stockCodeError);
  }

  // Build final URL list – append the latest stock code to the stocks endpoint when available
  const urlsToCheck = BASE_URLS.map((base) => {
    if (base.includes("/stocks/") && stockCodeData) {
      return `${base}${stockCodeData.code}`;
    }
    return base;
  });

  // Process all URLs in parallel with the appropriate time‑window checks
  await Promise.all(
    urlsToCheck.map((url) => {
      // Football & trends – only log when not in the 01:00‑09:00 IST window
      if (url.includes("/football") || url.includes("/trends")) {
        return logUrlStatus(supabase, url, isEarlyMorningAllowed());
      }

      // Stocks endpoint – conditional based on isStocksTimeValid()
      if (url.includes("/stocks/")) {
        return logUrlStatus(supabase, url, isStocksTimeValid());
      }

      // Main site – conditional based on isMainSiteTimeValid()
      if (url === "https://pda-wine.vercel.app") {
        return logUrlStatus(supabase, url, isMainSiteTimeValid());
      }

      // New scheduled URL: /api/cache/medium/populate
      // Only run between 08:00 (inclusive) and 09:00 (inclusive) IST.
      if (url.includes("/api/cache/medium/populate")) {
        // Check hour and minutes explicitly — allow from 08:00 to 09:00 inclusive
        const now = getISTDate();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const start = 8 * 60; // 08:00
        const end = 9 * 60; // 09:00
        const allowed = totalMinutes >= start && totalMinutes <= end;
        return logUrlStatus(supabase, url, allowed);
      }

      // Fallback – log unconditionally
      return logUrlStatus(supabase, url);
    })
  );

  return new Response("URL status check completed", {
    status: 200
  });
});