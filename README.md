# Nutrition & Weight (Weighthawk)

A small, opinionated personal app to log weighings and meals. Calories and macros are pulled from Open Food Facts (UK-biased, branded items) and USDA FoodData Central (raw / whole foods). Built for Railway with a Postgres plugin.

## Features

- **Daily dashboard** — calorie progress vs goal, macro bars, latest weight with delta vs previous, quick weigh-in, quick-add favorites.
- **Food log** — one search box queries Open Food Facts (Tesco / Sainsbury's / M&S branded items work well) and USDA in parallel. Pick grams, calories and macros scale automatically. Manual entry fallback for anything missing.
- **Weight tracker** — history list, 7-day moving average chart, goal weight reference line.
- **Favorites** — save foods you eat often for one-tap logging.
- **Settings** — daily calorie / protein / carbs / fat goals; body stats (height, weight, birth year, sex); activity level; weekly rate target; target date.
- **Intelligence**
  - Auto-suggest a calorie goal from BMR (Mifflin–St Jeor) × activity multiplier minus your weekly rate target. One click applies the suggested kcal and macro split.
  - Weekly summary card: avg kcal, avg weight, delta vs previous week, projected monthly change.
  - Trend detection on the last 21–28 days flags plateau, slow, on-track, fast, or wrong-direction vs your target rate.
  - ETA to goal weight based on the actual trend, compared against your target date.
  - Rule-based macro hints ("protein under goal 5/7 days").
  - Streak counter and 30-day adherence percentage.
- **Simple password protection** — single shared password via env var, signed cookie session for 30 days.

## Tech

Next.js 14 (App Router) · Prisma · Postgres · Tailwind · Recharts · Open Food Facts API · USDA FoodData Central API.

## Local development

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL, APP_PASSWORD, SESSION_SECRET, USDA_API_KEY
npm run dev
```

Visit http://localhost:3000 and log in with your `APP_PASSWORD`. Schema changes are pushed at boot via `prisma db push` (no migration files to manage).

### Getting a USDA API key

Free, takes about a minute: <https://fdc.nal.usda.gov/api-key-signup.html>. Drop it into `USDA_API_KEY`. (The `DEMO_KEY` works for a few requests/hour but will rate-limit fast.) Open Food Facts has no key.

## Deploying to Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**.
3. Add a **Postgres** plugin. Reference its `DATABASE_URL` from your service variables.
4. Under the service **Variables**, add:
   - `APP_PASSWORD` — your login password
   - `SESSION_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
   - `USDA_API_KEY` — your USDA key
5. Build runs `npm ci && prisma generate && next build`. Start runs `prisma db push --accept-data-loss && npm start`.
6. The app listens on `$PORT` (Railway provides it). Open the generated public URL.

## Schema

| Model    | Purpose                                                                          |
|----------|----------------------------------------------------------------------------------|
| Weighing | One row per weigh-in (one per day, upsert by date).                              |
| FoodLog  | Each food entry with source ("usda" / "off" / null), nutrients, date.            |
| Favorite | Saved foods for quick logging — same nutrient fields as FoodLog.                 |
| Settings | Single-row table (id=1) holding goals, body stats, activity, target date / rate. |

## Intelligence math

- **BMR** (Mifflin–St Jeor): `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female).
- **TDEE** = BMR × activity multiplier (sedentary 1.2 → very active 1.9).
- **Suggested kcal** = TDEE + (weeklyRateKg × 7700 / 7), floored at 1200 kcal.
- **Trend** = linear regression of weight against time over the last 28 days, expressed in kg/week.
- **Plateau** = |trend| < 0.05 kg/week over 21 days.
- **Adherence** = % of logged days in the last 30 where total kcal ≤ goal × 1.05.

## Possible additions

- Photo upload for food entries (Railway has volumes).
- Weekly email digest (Cron + Resend).
- Barcode scanner using device camera (already querying Open Food Facts by barcode under the hood).
- Export to CSV.

## License

Personal use.
