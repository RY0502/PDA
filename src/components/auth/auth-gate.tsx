"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

function isSupabaseReferrer() {
  if (typeof document === "undefined") return false;
  const ref = document.referrer || "";
  return /supabase\.(co|com)/i.test(ref);
}

function isOAuthCallbackUrl() {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    // Supabase PKCE returns code & state in query when coming back
    const hasCode = url.searchParams.has("code");
    const hasError = url.searchParams.has("error") || url.searchParams.has("error_description");
    return hasCode || hasError;
  } catch {
    return false;
  }
}

export function AuthGate() {
  useEffect(() => {
    // Avoid triggering during OAuth callback handling
    if (isSupabaseReferrer() || isOAuthCallbackUrl()) return;

    const RATE_LIMIT_KEY = "auth_in_progress_at";
    const RATE_LIMIT_MS = 60_000; // 1 minute guard to prevent loops

    let isMounted = true;

    // Subscribe to clear rate-limit flag on successful sign-in
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        try {
          localStorage.removeItem(RATE_LIMIT_KEY);
        } catch {}
      }
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (data.session) return; // already signed in

        // Simple rate limit to avoid rapid re-entries
        const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
        const now = Date.now();
        if (now - last < RATE_LIMIT_MS) return;

        localStorage.setItem(RATE_LIMIT_KEY, String(now));

        // Clean redirect target (drop search/hash to avoid reusing old code/state)
        const redirectTo = `${window.location.origin}${window.location.pathname}`;

        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
      } catch {
        // noop; avoid throwing in effect
      }
    })();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

