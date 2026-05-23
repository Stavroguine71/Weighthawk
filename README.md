# Nutrition & Weight

A small, opinionated personal app to log weighings and meals — calories and macros are pulled from the USDA FoodData Central API. Designed to deploy on Railway with a Postgres plugin.

## Features

- **Daily dashboard** – calorie progress vs goal, macro bars (protein/carbs/fat), latest weight with delta vs previous, quick weigh-in, quick-add favorites.
- **Food log** – search USDA database for any food, set grams, calories/macros computed automatically. Manual entry fallback for anything not in the database.
- **Weight tracker** – history list, 7-day moving average chart, goal weight reference line, period change.
- **Favorites** – save foods you eat often for one-tap logging.
- **Settings** – daily calorie / protein / carbs / fat goals, body stats (height, start/goal weight).
- **Simple password protection** – single shared password via env var, signed cookie session for 30 days.

## Tech

Next.js 14 (App Router) · Prisma · Postgres · Tailwind · Recharts · USDA FoodData Central API.

## Local development (optional - you can skip straight to Railway)

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL (local Postgres), APP_PASSWORD, SESSION_SECRET, USDA_API_KEY
npx prisma db push
npm run dev
```

Visit http://localhost:3000 and log in with your `APP_PASSWORD`.

No local Postgres? Skip this section and deploy straight to Railway below.

### Getting a USDA API key

Free, takes about a minute: <https://fdc.nal.usda.gov/api-key-signup.html>. Drop it into `USDA_API_KEY`. (The `DEMO_KEY` works for a few requests/hour but will rate-limit fast.)

## Deploying to Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**.
3. Add a **Postgres** plugin. Railway sets `DATABASE_URL` automatically.
4. Under the service **Variables**, add:
   - `APP_PASSWORD` – your login password
   - `SESSION_SECRET` – any long random string (e.g. `openssl rand -hex 32`)
   - `USDA_API_KEY` – your USDA key
5. Railway uses `nixpacks.toml` / `railway.json` here:
   - **Build** runs `npm ci`, `prisma generate`, `next build`
   - **Start** runs `npx prisma db push --accept-data-loss && npm start` (syncs the schema to Postgres on every boot - no migration files needed)
6. The app listens on `$PORT` (Railway provides it). Open the generated public URL.

That's it. First request will hit `/login`.

## Schema

| Model    | Purpose                                                        |
|----------|----------------------------------------------------------------|
| Weighing | One row per weigh-in (one per day, upsert by date).            |
| FoodLog  | Each food entry with calories + macros + date.                 |
| Favorite | Saved foods for quick logging.                                 |
| Settings | Single-row table (id=1) holding goals and body stats.          |

## Possible additions

- Photo upload for food entries (Railway has volumes).
- Weekly email digest (Cron + Resend).
- Barcode scanner using device camera + Open Food Facts as fallback.
- Export to CSV.
- BMR/TDEE-based goal suggestion using height + weight + age.

## License

Personal use.
