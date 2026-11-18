# Prestige Auto Group — Dealership Platform

A conversion-focused US car dealership website with a large, orderly inventory of **EV, Hybrid, Plug-in Hybrid, Gas and Diesel** vehicles — faceted search with live counts, monthly-payment-first shopping, vehicle detail pages with a payment calculator, lead capture, saved cars & alerts, comparison, and a role-based admin with CSV/JSON import, feed sync, CRM and runtime pricing controls.

> UX patterns were informed by leading dealer and marketplace sites; **no third-party text, images, logos or listings are used.** Inventory comes only from the dealership's own data (imports/feeds). Demo vehicles use AI-generated illustrative photos and placeholder data, and are flagged `is_demo` (hidden in production).

## Contents
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Pricing rules](#pricing-rules)
- [Inventory pipeline](#inventory-pipeline)
- [Search & SEO URLs](#search--seo-urls)
- [Auth & roles](#auth--roles)
- [Leads, email & compliance](#leads-email--compliance)
- [Testing](#testing)
- [Deploying to Vercel](#deploying-to-vercel)
- [Security, accessibility & performance](#security-accessibility--performance)
- [Pre-launch checklist](#pre-launch-checklist)
- [Project structure](#project-structure)

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC, ISR) + TypeScript (strict) |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Motion (Framer Motion), lucide icons, Inter + Sora fonts, dark mode |
| Data | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Search | Postgres full-text search + disjunctive faceted counts; optional Meilisearch adapter |
| Auth | NextAuth (Auth.js v5) credentials + JWT, roles: Admin / Sales / Finance / Customer |
| Forms & email | React Hook Form + Zod (shared client/server schemas), Resend |
| Analytics | GA4 + Meta Pixel hooks (consent-gated, GPC-aware), Vercel Analytics |
| Testing | Vitest (unit), Playwright (e2e) |
| Deploy | Vercel + managed Postgres (Neon / Supabase / Prisma Postgres free tiers) |

## Quick start

Prerequisites: **Node.js ≥ 20.19** (22 LTS recommended). No Docker required.

```bash
git clone https://github.com/Hubert24hrs/usa_car_dearlership.git
cd usa_car_dearlership
npm install
cp .env.example .env          # then edit AUTH_SECRET, CRON_SECRET, SEED_ADMIN_* (see below)
```

Start PostgreSQL in a second terminal (embedded Postgres binaries via npm — data in `./.data/postgres`):

```bash
npm run db
```

Prefer Docker? `docker compose up -d db` uses the same port (5433) and credentials.

Create the schema, seed demo data, and run the app:

```bash
npx prisma migrate dev --name init   # creates (first run) and applies the migrations
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in at `/account/sign-in` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and go to `/admin`.

- `npm run db:seed` creates **1,500 demo vehicles** across 302 models, all priced, using the spec's fuel mix (EV 25% · Hybrid 21% · PHEV 8% · Gas 38% · Diesel 8%).
- `npm run db:seed:small` creates the spec's original 120 (EV 30 · Hybrid 25 · PHEV 10 · Gas 45 · Diesel 10); any size works via `npx tsx prisma/seed.ts --count=3000` or `SEED_VEHICLE_COUNT`.
- `npx tsx prisma/seed.ts --no-demo` creates only the admin user (for production).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (pricing, importer, filters, finance…) |
| `npm run test:e2e` | Playwright end-to-end tests (search, filters, lead submit, mobile) |
| `npm run db` | Local embedded PostgreSQL (foreground) |
| `npm run db:migrate` | `prisma migrate dev` (create migrations while developing) |
| `npm run db:deploy` | `prisma migrate deploy` (apply migrations) |
| `npm run db:seed` / `db:seed:small` | Demo data (1,500 / 120 vehicles) |
| `npm run db:studio` | Prisma Studio |
| `npm run inventory:down-payment` | Set every vehicle to the standard down payment (30%, or `-- --percent=25`) and recalculate monthly payments |

## Environment variables

All variables are documented in [`.env.example`](.env.example). Only `DATABASE_URL` and `AUTH_SECRET` are required; every integration degrades gracefully when unset.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public base URL (canonical URLs, sitemap, emails) |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (`npx auth secret` or `openssl rand -base64 32`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First admin created by the seed |
| `SHOW_DEMO_INVENTORY` | `true` to show `is_demo` vehicles. Default: shown in dev, **hidden in production** |
| `CRON_SECRET` | Bearer secret for `/api/inventory/sync` and `/api/alerts/run` (Vercel Cron sends it automatically) |
| `INVENTORY_SYNC_SECRET` | Optional separate secret for feed pushes |
| `SEARCH_DRIVER`, `MEILISEARCH_*` | `postgres` (default) or `meilisearch` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `LEADS_NOTIFY_EMAIL` | Email delivery (logged to console when no key) |
| `STORAGE_DRIVER`, `CLOUDINARY_*`, `S3_*` | Vehicle photo uploads: `local` (dev), `cloudinary` or `s3` (incl. R2) |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Shared rate-limit store for serverless (in-memory otherwise) |
| `VIN_DECODER` | `nhtsa` (free NHTSA vPIC) or `none` |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Analytics (loaded only after consent) |

## Pricing rules

All business multipliers live in **one file: [`lib/pricing.config.ts`](lib/pricing.config.ts)**.

| Feed value (admin-only) | Public value | Rule |
|---|---|---|
| `base_price` | `display_price` | × **1.20**, rounded to nearest **$100** |
| `base_down_payment` | `display_down_payment` | × **1.20**, rounded to nearest **$50** |
| `base_monthly_payment` | `display_monthly_payment` | × **1.10**, rounded to nearest **$1** |

- Multipliers are applied **at import time** by the pipeline ([`lib/pricing.ts`](lib/pricing.ts), [`lib/inventory/importer/prepare.ts`](lib/inventory/importer/prepare.ts)); both base and display values are stored. Display values supplied by a feed are ignored and recomputed.
- Public pages, APIs and JSON-LD use [`lib/inventory/public.ts`](lib/inventory/public.ts) selects that **never include `base_*`** (enforced by a unit test). In the admin, base pricing is visible to Admin and Finance roles only.
- **Admin → Settings & pricing** changes multipliers (bounded 0.5–3) and the disclosed term/APR without a redeploy; saving re-prices every vehicle from its stored base values and is audit-logged.
- The standard down payment is **30% of the price** (`finance.defaultDownPaymentPercent`). Feeds that omit down/monthly payments get 30% down and the payment amortized at the disclosed APR/term; `npm run inventory:down-payment` resets every vehicle to it (prices unchanged, monthly payments recalculated).
- Every "Est. $X/mo" discloses the term, APR and down payment, with the legal disclaimer from the config.

> ⚠️ **Compliance note:** because the monthly multiplier (1.10) differs from the price multiplier (1.20), an advertised payment can be lower than the payment implied by the advertised price, APR and term. Truth-in-Lending advertising rules (Reg Z/M) and state laws require advertised credit terms to be accurate, and some states (e.g. CA, CO) require advertised prices to include dealer fees. Have counsel review the multipliers and disclaimers before launch. (The demo seed back-solves feed values so its displayed payments are internally consistent.)

Unit tests proving the rules: [`tests/unit/pricing.test.ts`](tests/unit/pricing.test.ts) and [`tests/unit/importer.test.ts`](tests/unit/importer.test.ts).

## Inventory pipeline

```
CSV/JSON upload ─┐
Feed pull/push ──┼─▶ provider adapter ─▶ canonical record ─▶ Zod validation & normalization
Manual form ─────┘                                            │
                                                              ▼
                               pricing multipliers (base_* → display_*) ─▶ upsert by VIN ─▶ ImportJob log
                                                              │
                                     "full snapshot" mode: missing vehicles → SOLD; caches revalidated
```

- **Admin → Import**: CSV or JSON, dry-run preview with row-level errors, optional snapshot mode, history.
- **Admin → Feeds**: HomeNet / vAuto / Dealer.com / CDK-style adapters ([`lib/inventory/importer/adapters.ts`](lib/inventory/importer/adapters.ts)). Credentials are referenced by env-var name, never stored. "Run now" or daily via Vercel Cron (`GET /api/inventory/sync`).
- **Push API**: `POST /api/inventory/sync` with `Authorization: Bearer <secret>` and a JSON `{ provider, sourceRef, markMissingAsSold, vehicles: [...] }` or a `text/csv` body.
- **Manual add/edit** with multi-image upload goes through the same pipeline.
- Spec field names (`vin`, `stock_number`, `body_style`, `ev_specs{range_miles…}`, `mpg{city…}`, `base_price`…) and common aliases ("Stock #", "Selling Price", "Miles", "Ext Color"…) are accepted. Messy values are normalized ("Pre-Owned", "4x4", "Gasoline", "Cabriolet", "Midnight Black Metallic" → color family "black").
- The **demo seed** ([`prisma/seed.ts`](prisma/seed.ts)) uses a catalog of **302 models / 843 trims** from the 19 requested makes (47 EV, 41 hybrid, 20 plug-in hybrid, 173 gas, 21 diesel) with approximate MSRPs, valid check-digit VINs, realistic mileage/depreciation and feature sets. Prices are set from those MSRPs and run through the pricing multipliers like any real import.

### Demo vehicle photos

Every catalog model has **two AI-generated studio photos in different paint colors (604 images)**. They were made with Higgsfield (`gpt_image_2_6`) from text prompts only; no third-party photos were used as input. Each demo vehicle takes its exterior color from the photo it uses. They are self-hosted as compressed JPEGs in `public/vehicles/` (about 60 KB each, 35 MB total) and listed in [`prisma/seed-data/vehicle-images.json`](prisma/seed-data/vehicle-images.json), keyed by `Make|Model`, with each original generation URL kept as `source`. A model without a photo falls back to the generated SVG artwork served at `/api/placeholder/vehicle`.

- These photos are **illustrative only**. Demo inventory is hidden in production unless `SHOW_DEMO_INVENTORY=true`; real listings must use photos of the actual unit.
- Serving small local files means the Next.js image optimizer never waits on a large remote download. The originals were 2 to 3 MB PNGs, and on slower connections they could exceed the optimizer's 7-second fetch limit and show up blank. [`scripts/optimize-vehicle-images.mjs`](scripts/optimize-vehicle-images.mjs) does the conversion; it runs from the manual **Optimize vehicle photos** GitHub Actions workflow.

## Search & SEO URLs

- Faceted filters: condition, make, model, trim, year, price, monthly payment, mileage, fuel, body, drivetrain, transmission, exterior/interior color family, features, EV range, MPG, location. Counts are **disjunctive** (each facet ignores its own selection) and update live.
- **Site search** (header magnifier, `/search`, or Ctrl+K) goes straight to a car's page when the VIN, stock number or search matches exactly one car in stock, to the matching inventory when several do, and to **similar cars in stock** when nothing does. Free text like "electric suv under 50k", "chevy silverado" or "porsche 911" is understood by [`lib/inventory/search-intent.ts`](lib/inventory/search-intent.ts) (makes, aliases, models, body style, fuel, condition, year, price and monthly budget). Similar cars are ranked by body style, fuel, make, price and year ([`lib/inventory/smart-search.ts`](lib/inventory/smart-search.ts)). The dialog shows live in-stock matches as you type.
- Keyword search uses Postgres full-text with prefix matching and English stemming over a denormalized `search_text` column; `SEARCH_DRIVER=meilisearch` swaps in Meilisearch with automatic fallback.
- Clean, canonical SEO URLs: `/inventory/{condition}/{fuel}/{body}/{make}/{model}?…` — e.g. `/inventory/electric/suv`, `/inventory/used/toyota/camry`. Vehicle pages are `/inventory/{year-make-model-trim-vin}` (ISR, revalidated on change).
- Sort: featured → newest (default), price, monthly payment, year, mileage, EV range, relevance.

## Auth & roles

| Role | Access |
|---|---|
| Admin | Everything: pricing multipliers, settings, users, imports, feeds, locations |
| Sales | Inventory edits, leads/CRM |
| Finance | Leads incl. finance applications, base (feed) pricing |
| Customer | Saved vehicles synced across devices, saved searches & alerts |

Every admin page and server action re-checks the role in the database ([`lib/auth/guards.ts`](lib/auth/guards.ts)); middleware is never relied on for auth.

## Leads, email & compliance

- Lead types: check availability, test drive, pre-qualification (no SSN/DOB), trade-in (VIN decode via free NHTSA vPIC + instant estimate from inventory comps), text-us, contact, service.
- Anti-spam: honeypot field, minimum fill time, per-IP rate limits, Zod validation on the server, Server Actions' built-in CSRF (Origin) checks. Stored IPs are HMAC-hashed.
- Emails: dealer notification + customer confirmation (Resend). Finance applicants' financial details are never emailed (GLBA) and are hidden from the Sales role.
- TCPA: SMS consent is a separate, unchecked-by-default checkbox; the exact consent text is stored with the lead.
- CCPA/CPRA: privacy choices page, consent banner (optional cookies off until accepted), Global Privacy Control honored.
- Saved-search alerts run daily (`GET /api/alerts/run`) with RFC 8058 one-click unsubscribe.

## Testing

```bash
npm test                      # unit tests
npx playwright install chromium
npm run test:e2e              # builds, starts on :3100 and runs e2e (needs a seeded DB)
```

Set `E2E_BASE_URL` to test an already-running server, or `E2E_SKIP_BUILD=1` to reuse an existing build.

**CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request. It does the type-check, lint and unit tests, then creates the schema on a Postgres 17 service, seeds the 1,500-vehicle demo inventory, makes a production build and runs the Playwright suite.

## Deploying to Vercel

1. **Database** — create a free Postgres on Neon, Supabase or Prisma Postgres. Copy the pooled connection string into `DATABASE_URL`.
2. **Import the repo** in Vercel. The `vercel-build` script runs `prisma generate && prisma migrate deploy && next build`, and `migrate deploy` only applies migrations that are committed. Run `npx prisma migrate dev --name init` locally once and commit `prisma/migrations/` before the first deploy.
3. **Environment variables** — set at least `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`. For production also: `RESEND_API_KEY` (verify your sending domain), `EMAIL_FROM`, `LEADS_NOTIFY_EMAIL`, `STORAGE_DRIVER=cloudinary` or `s3` (Vercel's filesystem is read-only), and `UPSTASH_REDIS_REST_*` for shared rate limits.
4. **Seed** once from your machine against the production DB: `DATABASE_URL=… npx tsx prisma/seed.ts --no-demo` (admin user only). For a staging site with demo inventory, run the normal seed and set `SHOW_DEMO_INVENTORY=true`.
5. **Custom domain (planned: `prestigeautosgroup.com`)**: in Vercel, open Project → Settings → Domains, add `prestigeautosgroup.com` and `www.prestigeautosgroup.com` (redirect one to the other), and create the DNS records Vercel shows at your registrar. Then set `NEXT_PUBLIC_SITE_URL=https://prestigeautosgroup.com` for Production and redeploy, which updates canonical links, the sitemap, share images and email links. Verify the domain in Resend before setting `EMAIL_FROM` / `LEADS_NOTIFY_EMAIL` to `@prestigeautosgroup.com` addresses, update the public email in Admin → Settings, and submit `https://prestigeautosgroup.com/sitemap.xml` in Google Search Console. Preview deployments are kept out of search engines automatically.
6. **Crons** — [`vercel.json`](vercel.json) schedules feed sync and alerts daily (Hobby plan limit); increase frequency on Pro.
7. Add your **real locations, dealer license number and policies** in Admin → Locations / Settings.

## Security, accessibility & performance

- Security headers in [`next.config.ts`](next.config.ts): CSP, HSTS, frame-ancestors none, nosniff, referrer and permissions policies. No secrets in the repo; `.env*` ignored except `.env.example`.
- Upload validation by MIME **and magic bytes**, 10 MB limit; CSV export guards against formula injection; JSON-LD is escaped.
- WCAG 2.2 AA: semantic landmarks, skip link, labelled controls with `aria-describedby` errors, visible focus, AA-contrast CTA color (`#C9441F`, a darker shade of brand accent `#E4572E` for white text), reduced-motion support, keyboard-operable galleries and 360° viewer.
- Performance: RSC by default, ISR for vehicle pages and landing pages, tag-based cache invalidation on inventory changes, `next/image` AVIF/WebP, lazy-loaded forms/maps, click-to-load map embed, no heavy client libraries.

## Pre-launch checklist

- [ ] Replace placeholder locations, phone numbers (555-01xx), dealer license, policies (returns, inspection) and team content. Confirm the delivery offer (free within 30 miles, discounted to all 50 states), which is set in Admin → Settings → Dealer profile.
- [ ] Counsel review: pricing/payment disclaimers, multipliers vs. Reg Z/M, state advertising rules (dealer fees), TCPA consent text, privacy policy, terms.
- [ ] Verify EV incentive information (placeholder on `/electric-hybrid`).
- [ ] Remove demo data (`SHOW_DEMO_INVENTORY` unset in production) and connect real inventory feeds. Never present the AI-generated demo photos as actual vehicles for sale.
- [ ] Configure Resend domain, storage driver, Upstash, analytics IDs.
- [ ] Optional paid integrations (ask before enabling): credit soft-pull provider, plate-to-VIN provider, trade-in valuation API, OEM incentives feed, live chat.

## Project structure

```
app/
  (site)/            public site — home, inventory (+ SEO browse + VDP), landing & legal pages, account, saved, compare
  admin/             role-protected admin — dashboard, inventory, import, feeds, leads, locations, users, settings
  api/               inventory sync & count, vehicles, alerts cron, unsubscribe, placeholder art, auth, CSV export
components/          ui (shadcn), layout, home, inventory, vehicle, forms, admin, seo, analytics
lib/
  pricing.config.ts  ← all pricing rules
  pricing.ts finance.ts
  inventory/         constants, filters (URL ⇄ state), query, search & facets, keyword search, importer/, feeds, cache
  auth/ leads/ email/ admin/ account/ trade-in/  server logic & actions
prisma/              schema, migrations, seed + demo catalog
tests/unit           Vitest   ·   tests/e2e   Playwright
scripts/db.mjs       embedded local PostgreSQL
```
