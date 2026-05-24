# Nutrition & Weight (Weighthawk)

A small, opinionated personal app to log weighings and meals. Calories and macros come from Open Food Facts (UK-biased, branded items) and USDA FoodData Central (raw / whole foods). Optional Claude integration adds natural-language logging, photo logging, a weekly recap, a coaching chat, and quarterly target review. Built for Railway.

## Features

- **Daily dashboard** — calorie progress vs goal, macro bars, latest weight with delta, quick weigh-in, quick-add favorites.
- **Food log** — one search box queries Open Food Facts (Tesco / Sainsbury's / M&S branded items) and USDA in parallel. Pick grams, nutrients scale automatically. Manual entry fallback.
- **Weight tracker** — history list, 7-day moving average chart, goal weight reference line.
- **Favorites** — save foods you eat often for one-tap logging.
- **Settings** — targets (goal weight, target date, weekly rate), body stats (height, birth year, sex, activity level), and daily kcal/macro goals.
- **Intelligence (deterministic, no API key needed)**
  - Auto-suggest a calorie goal from BMR × activity multiplier minus your weekly rate.
  - Weekly summary card: avg kcal, avg weight, delta vs previous week, projected monthly change.
  - Trend detection flags plateau, slow, on-track, fast, or wrong-direction.
  - ETA to goal weight based on actual regression, compared against target date.
  - Rule-based macro hints, streak counter, 30-day adherence %.
- **AI features (require `ANTHROPIC_API_KEY`)**
  - **Quick AI entry** card on the dashboard with four modes:
    - **Describe** — type "chicken caesar wrap, flat white, two squares of dark chocolate", get parsed rows you can check off and log.
    - **Photo** — snap a plate, get one row per visible food with estimated portions.
    - **Label** — snap a nutrition label (per-100g column), get the values transcribed; pick grams to log.
    - **Recipe** — paste a recipe and your portion count, get a single combined log entry.
  - **Weekly recap** card writes an honest 80–140 word paragraph about your last 7 days vs the prior week. Cached per ISO week in `localStorage`.
  - **Coach** page (`/coach`) — chat anchored to your last 30 days. Ask "why am I plateauing", "what should I change this weekend", etc. No medical advice; refers you to a pro for clinical questions.
  - **Target review** button (Settings) — reads last 90 days, compares actual rate to target, proposes adjusted weekly rate + kcal + macros. One-click apply.
- **Password protection** — single shared password via env var, signed cookie session for 30 days.

## Tech

Next.js 14 (App Router) · Prisma · Postgres · Tailwind · Recharts · Open Food Facts · USDA FoodData Central · `@anthropic-ai/sdk` (optional, AI features).

## Local development

```bash
npm install
cp .env.example .env
# edit .env: DATABASE_URL, APP_PASSWORD, SESSION_SECRET, USDA_API_KEY, ANTHROPIC_API_KEY (optional)
npm run dev
```

Visit http://localhost:3000 and log in with `APP_PASSWORD`. Schema changes are pushed at boot via `prisma db push`.

### API keys

- **USDA**: free, takes ~1 min — <https://fdc.nal.usda.gov/api-key-signup.html>. `DEMO_KEY` works briefly but rate-limits.
- **Open Food Facts**: no key.
- **Anthropic** (optional): get one at <https://console.anthropic.com>. Without it, the AI cards/page hide themselves automatically.

## Deploying to Railway

1. Push to GitHub, create a Railway project from the repo.
2. Add a **Postgres** plugin; reference its `DATABASE_URL` from your service variables.
3. Set service **Variables**:
   - `APP_PASSWORD`
   - `SESSION_SECRET` (e.g. `openssl rand -hex 32`)
   - `USDA_API_KEY`
   - `ANTHROPIC_API_KEY` (optional — leave blank to disable AI features)
4. Build runs `npm ci && prisma generate && next build`. Start runs `prisma db push --accept-data-loss && npm start`. App listens on `$PORT`.

## Cost notes (AI features)

All routes use **Claude Haiku 4.5** except the weekly recap, coach, and target review which use **Sonnet 4.6**. For solo personal use, expect total spend well under £1/month even with daily use.

## Schema

| Model    | Purpose                                                                          |
|----------|----------------------------------------------------------------------------------|
| Weighing | One row per weigh-in (one per day).                                              |
| FoodLog  | Each food entry with source ("usda" / "off" / null), nutrients, date.            |
| Favorite | Saved foods for quick logging.                                                   |
| Settings | Single-row table (id=1) holding goals, body stats, activity, targets.            |

## Intelligence math

- **BMR** (Mifflin–St Jeor): `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female).
- **TDEE** = BMR × activity multiplier (sedentary 1.2 → very active 1.9).
- **Suggested kcal** = TDEE + (weeklyRateKg × 7700 / 7), floored at 1200.
- **Trend** = linear regression of weight vs time over last 28 days, in kg/week.
- **Plateau** = |trend| < 0.05 kg/week over 21 days.
- **Adherence** = % of logged days where total kcal ≤ goal × 1.05.

## Possible additions

- Streaming responses for the coach chat (currently blocks until complete).
- Photo upload for food entries (Railway has volumes).
- Barcode scanner using device camera (OFF already supports barcode lookup).
- Export to CSV.

## License

Personal use.
