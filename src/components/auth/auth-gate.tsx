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
    // // Skip if we're in SSR or during OAuth callback
    // if (typeof window === 'undefined' || isSupabaseReferrer() || isOAuthCallbackUrl()) {
    //   return;
    // }
    // let isMounted = true;
    // let authSubscription: { unsubscribe: () => void } | null = null;
    // let timeoutId: NodeJS.Timeout;
    // const checkAuth = async () => {
    //   try {
    //     // Check for existing session
    //     const { data: { session }, error } = await supabase.auth.getSession();
        
    //     if (!isMounted) return;
        
    //     if (error) {
    //       console.error('Error getting session:', error);
    //       return;
    //     }
    //     // If no session, initiate sign in
    //     if (!session) {
    //       // Clean redirect target (drop search/hash to avoid reusing old code/state)
    //       const redirectTo = `${window.location.origin}${window.location.pathname}`;
          
    //       const { error: signInError } = await supabase.auth.signInWithOAuth({
    //         provider: 'google',
    //         options: { redirectTo },
    //       });
          
    //       if (signInError) {
    //         console.error('Error signing in:', signInError);
    //       }
    //     }
    //   } catch (err) {
    //     console.error('Authentication error:', err);
    //   }
    // };
    // // Set up auth state change listener
    // authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
    //   if (event === 'SIGNED_IN' && session) {
    //     // User just signed in, no action needed as the app will handle the redirect
    //     return;
    //   }
      
    //   if (event === 'SIGNED_OUT') {
    //     // If user signs out, check auth again after a short delay
    //     // This handles the case where the session expires
    //     clearTimeout(timeoutId);
    //     timeoutId = setTimeout(checkAuth, 1000);
    //   }
    // }).data.subscription;
    // // Initial auth check with a small delay to allow for session restoration
    // timeoutId = setTimeout(checkAuth, 500);
    // return () => {
    //   isMounted = false;
    //   clearTimeout(timeoutId);
    //   if (authSubscription) {
    //     authSubscription.unsubscribe();
    //   }
    // };
  }, []);

  return null;
}
