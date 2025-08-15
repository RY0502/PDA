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
    let mounted = true;
    (async () => {
      if (isSupabaseReferrer()) return;
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        const redirectTo = window.location.href;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
