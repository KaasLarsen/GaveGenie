# GaveGenie

Dansk gavefinder: beskriv personen og anledningen, få forslag fra et produktkatalog med korte danske begrundelser.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · OpenAI (server-side)

> Sample-feedet er **udviklingsdata** (fiktive produkter på `example.com`). Opfind aldrig live produkter, priser eller URL’er.

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

### 3. Database + sample import

```bash
npx prisma migrate dev --name init
npm run import:feed
```

Importen markerer alle varer som `isSample` / **Eksempel · DEV**.

Admin-import (samme sample-feed):

```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"provider":"sample-dev"}'
```

### 4. Kør lokalt

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) → **Start gavefinder**.

### 5. Tests

```bash
npm test
```

Dækker normalize, rank og Zod-schemas.

## Scripts

| Script | Formål |
|---|---|
| `npm run dev` | Next.js udviklingsserver |
| `npm run build` / `npm start` | Produktion |
| `npm run import:feed` | Importer DEV sample-feed |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npx prisma studio` | Inspektion af DB |

## Arkitektur (kort)

- `data/feeds/sample-dev.json` — DEV feed (`isDevelopmentData: true`)
- `src/lib/feeds/` — adapter-interface + sample-adapter + upsert-import
- `src/lib/finder.ts` — DB-kandidater → tekst/budget-ranking → OpenAI “hvorfor” (kun rigtige IDs)
- `src/app/api/find` — gavefinder API
- `src/app/api/admin/import` — beskyttet re-import

## Deploy (Vercel + one.com)

1. Push repo til GitHub og importer projektet i [Vercel](https://vercel.com).
2. Sæt env vars i Vercel: `DATABASE_URL`, `OPENAI_API_KEY`, `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Brug en hostet Postgres (Vercel Postgres, Neon, Supabase, …).
4. Kør migrationer mod produktions-DB: `npx prisma migrate deploy`.
5. Importer sample-feed (eller senere rigtigt affiliate-feed) via `npm run import:feed` med prod-`DATABASE_URL`, eller `POST /api/admin/import`.
6. **one.com DNS (bruger):** peg domænet til Vercel — typisk A/CNAME iht. Vercels domain-instruktioner. SSL håndteres af Vercel.

## Hvad brugeren stadig skal levere

- OpenAI API-nøgle
- Postgres (`DATABASE_URL`)
- Rigtigt affiliate-feed (senere; erstat sample-adapter)
- one.com DNS → Vercel, når appen er live

## Sider

- `/` — forside (brand-first)
- `/finder` — gavefinder
- `/affiliate` — affiliate-disclosure
- `/privatliv` — privatlivsstub
