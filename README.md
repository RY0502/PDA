# YourDailyBrief

This is a Next.js starter.

## Supabase Google OAuth Setup

1. Create a Supabase project and go to Authentication → URL Configuration
   - Set Site URL to your local/dev URL, e.g. `http://localhost:9002`
2. Enable Google provider under Authentication → Providers and add your Google OAuth credentials.
3. Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start dev server: `npm run dev`

Notes:
- Header navigation requires login; it will open Supabase Google OAuth and then redirect back to the clicked page.
- The user initials avatar shows at top-right with a dropdown to Logout. On logout, the avatar disappears.
- Auth checks are skipped if the referrer is a Supabase domain (post-OAuth redirects).

Relevant files:
- `src/lib/supabaseClient.ts`
- `src/components/layout/header.tsx`
