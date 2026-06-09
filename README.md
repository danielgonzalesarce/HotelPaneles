<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/87946739-77c2-4baf-a8db-fe14b9dcaa19

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey)
   - `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe test key (optional, for simulated checkout)
3. **(Optional) Supabase** — persistent database instead of browser localStorage:
   1. Create a project at [supabase.com](https://supabase.com)
   2. Open **SQL Editor** and run the script [`supabase/schema.sql`](supabase/schema.sql)
   3. In **Project Settings → API**, copy **Project URL** and **anon public** key
   4. Add to `.env.local`:
      ```
      VITE_SUPABASE_URL=https://xxxx.supabase.co
      VITE_SUPABASE_ANON_KEY=eyJ...
      ```
   5. Restart the dev server. You should see a green “Supabase conectado” badge when it works.
4. **(Optional) Google Sign-In** — secure login via Supabase Auth:
   1. Follow [`supabase/google-auth-setup.md`](supabase/google-auth-setup.md)
   2. Enable Google provider in Supabase and add redirect URL `http://localhost:3000/auth/callback`
5. Run the app:
   `npm run dev`

> **Windows note:** If `npm run dev` fails because the folder name contains `&`, run:
> `node .\node_modules\tsx\dist\cli.mjs .\server.ts`
