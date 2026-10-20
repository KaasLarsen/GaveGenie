# GaveGenie

Dansk gavefinder: beskriv personen og anledningen, få forslag fra et produktkatalog med korte danske begrundelser.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · OpenAI (server-side)

> Live katalog kommer fra **Partner Ads**-feeds. Sample-feedet (`IMPORT_SAMPLE=1`) er **udviklingsdata** (fiktive produkter på `example.com`). Opfind aldrig live produkter, priser eller URL’er.

## Kom i gang

### 1. Afhængigheder

```bash
npm install
cp .env.example .env
```

### 2. Miljøvariabler

| Variabel | Påkrævet | Beskrivelse |
|---|---|---|
| `DATABASE_URL` | Ja (katalog/finder) | Postgres connection string |
| `OPENAI_API_KEY` | Til AI-“hvorfor” | Server-side only |
| `OPENAI_MODEL` | Nej | Default `gpt-4o-mini` |
| `ADMIN_SECRET` | Til admin-import | `Authorization: Bearer …` |
| `NEXT_PUBLIC_SITE_URL` | SEO | Fx `http://localhost:3000` |

Uden OpenAI-nøgle virker finderen stadig med skabelon-begrundelser. Uden Postgres kan appen bygges, men import/finder kræver DB.

### 3. Database + feed-import

```bash
npx prisma migrate dev --name init
npm run import:feed
```

`npm run import:feed` synkroniserer Partner Ads-feeds fra registry’et ([`src/lib/feeds/partner-ads-registry.ts`](src/lib/feeds/partner-ads-registry.ts)) til Postgres (`isSample=false`).

**Vigtigt om omkostninger:** Gavefinderen læser **kun Postgres**. Partner Ads-XML hentes kun ved eksplicit import. Standard TTL er **24 timer** (`FEED_CACHE_TTL_HOURS`) — inden for vinduet springes både netværkshentning og DB-import over. XML caches også lokalt under `data/feeds/cache/`. Brug `FORCE_FEED_REFRESH=1` kun når du bevidst vil hente igen.

Til lokal DEV med sample-data:

```bash
IMPORT_SAMPLE=1 npm run import:feed
```

Én shop / tvungen refresh:

```bash
FEED_ID=2437 npm run import:feed
FORCE_FEED_REFRESH=1 npm run import:feed
```

Admin-import:

```bash
# Alle Partner Ads-feeds (store feeds kan time out på serverless — foretræk CLI)
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"provider":"partner-ads"}'

# Én feed
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"provider":"partner-ads-2437"}'

# DEV sample
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"provider":"sample-dev"}'
```

Når live produkter findes, ekskluderer gavefinderen automatisk sample-varer.

### 4. Kør lokalt

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) → **Start gavefinder**.

### 5. Tests

```bash
npm test
```

Dækker normalize, rank, Zod-schemas, Partner Ads-mapping og finder-prefilter.

## Scripts

| Script | Formål |
|---|---|
| `npm run dev` | Next.js udviklingsserver |
| `npm run build` / `npm start` | Produktion |
| `npm run import:feed` | Importer Partner Ads-feeds (eller sample med `IMPORT_SAMPLE=1`) |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npx prisma studio` | Inspektion af DB |

## Arkitektur (kort)

- `src/lib/feeds/partner-ads-registry.ts` — liste over Partner Ads feedid/bannerid (tilføj flere her)
- `src/lib/feeds/partner-ads-adapter.ts` — XML-fetch/parse → normaliserede produkter
- `data/feeds/sample-dev.json` — DEV feed (`isDevelopmentData: true`)
- `src/lib/feeds/` — adapter-interface + upsert-import (batch + stale cleanup)
- `src/lib/finder.ts` — token-prefilter → tekst/budget-ranking → OpenAI “hvorfor” (kun rigtige IDs)
- `src/app/api/find` — gavefinder API
- `src/app/api/admin/import` — beskyttet re-import

## Deploy (Vercel + one.com)

1. Push repo til GitHub og importer projektet i [Vercel](https://vercel.com).
2. Sæt env vars i Vercel: `DATABASE_URL`, `OPENAI_API_KEY`, `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Brug en hostet Postgres (Vercel Postgres, Neon, Supabase, …).
4. Kør migrationer mod produktions-DB: `npx prisma migrate deploy`.
5. Importer Partner Ads-feeds via `npm run import:feed` med prod-`DATABASE_URL` (anbefalet for Booktok m.fl.), eller `POST /api/admin/import`.
6. **one.com DNS (bruger):** peg domænet til Vercel — typisk A/CNAME iht. Vercels domain-instruktioner. SSL håndteres af Vercel.

## Hvad brugeren stadig skal levere

- OpenAI API-nøgle
- Postgres (`DATABASE_URL`)
- Evt. flere Partner Ads-feeds (tilføjes i registry)
- one.com DNS → Vercel, når appen er live

## Sider

- `/` — forside (brand-first)
- `/finder` — gavefinder
- `/affiliate` — affiliate-disclosure
- `/privatliv` — privatlivsstub
