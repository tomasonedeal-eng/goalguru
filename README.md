# GoalGuru

Pasaulio čempionato 2026 totalizatorius — **tik virtualūs taškai, jokių pinigų**.

## Prisijungimas

Tikras autentifikavimas per **Supabase**:

- **Google OAuth**
- **El. paštas + slaptažodis** (registracija ir prisijungimas)

### Nustatymas (vienkartinis)

1. Sukurk projektą [supabase.com/dashboard](https://supabase.com/dashboard)
2. Nukopijuok `.env.example` → `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
3. **SQL Editor** → paleisk `supabase/schema.sql`
4. **Authentication → Providers** → įjunk **Google** (Client ID + Secret iš Google Cloud Console)
5. **Authentication → URL Configuration** → pridėk:
   - `http://localhost:3000/auth/callback`
   - (production) `https://tavo-domenas.vercel.app/auth/callback`
6. Perkrauk dev serverį: `npm run dev`

### Google Cloud (OAuth)

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth Client ID (Web application)
3. Authorized redirect URI: `https://<tavo-supabase-project>.supabase.co/auth/v1/callback`
4. Įklijuok Client ID ir Secret į Supabase → Google provider

## Paleisti

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## Stack

- Next.js 16 + TypeScript + Tailwind
- Supabase Auth + PostgreSQL (profiles, leaderboard)
- Statymai: localStorage (per user), monetos/taškai: Supabase
