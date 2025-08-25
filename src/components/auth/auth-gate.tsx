"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

function isSupabaseReferrer() {
  if (typeof document === "undefined") return false;
  const ref = document.referrer || "";
  return /supabase\.(co|com)/i.test(ref);
}

export function AuthGate() {
  useEffect(() => {
    // Avoid triggering OAuth immediately after returning from Supabase
    if (isSupabaseReferrer()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Wait for Supabase to recover the persisted session from storage.
      // This fires once on mount with the current (possibly recovered) session.
      if (event === "INITIAL_SESSION") {
        if (!session) {
          const redirectTo = window.location.href;
          await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
