# Deploy: Vercel + one.com

## Vercel

1. Import `KaasLarsen/GaveGenie` in Vercel (Framework: Next.js).
2. Add environment variables:
   - `DATABASE_URL` — hosted Postgres
   - `OPENAI_API_KEY`
   - `ADMIN_SECRET`
   - `NEXT_PUBLIC_SITE_URL` — production URL (fx `https://gavegenie.dk`)
3. Build command (allerede i `npm run build`): `prisma migrate deploy` → `ensure-seo-on-build` (hurtig SEO-tag backfill + landing sync, max ~45s, fejler aldrig build) → `next build`. Partner Ads-download kører **ikke** i build (det blokerede deploys).
4. Partner Ads-import: Vercel Cron (`vercel.json`) kalder `/api/cron/import-feeds` dagligt. Cron retagger også produkter uden `seo:*` tags, så `/gaver`-menuen får indhold uden force-refresh. Sæt env `CRON_SECRET` i Vercel — Cron sender den automatisk som Bearer. `ADMIN_SECRET` virker også til manuel trigger:

```bash
curl -X GET "https://www.gavegenie.dk/api/cron/import-feeds" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Manuel fuld sync (CLI, anbefalet første gang / store feeds):

```bash
DATABASE_URL="postgresql://…" npm run import:feed
```

`npm run import:feed` synkroniserer feeds i `src/lib/feeds/partner-ads-registry.ts` og regenererer Postgres `searchVector` (FTS) på hvert produkt. Feeds springes over hvis de er importeret inden for `FEED_CACHE_TTL_HOURS` (default 24h). Gavefinderen downloader aldrig feeds — kun cron/CLI/admin. `FORCE_FEED_REFRESH=1` kun ved bevidst refresh.

Alternativt admin-API (mindre feeds / enkelt shop):

```bash
curl -X POST "https://YOUR_DOMAIN/api/admin/import" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"provider":"partner-ads-2437"}'
```

Til lokal/dev sample: `IMPORT_SAMPLE=1 npm run import:feed` eller `{"provider":"sample-dev"}`.

## one.com DNS

Når Vercel-appen er live:

1. Tilføj domænet under Vercel → Project → Settings → Domains.
2. I one.com DNS: opret de A/CNAME-records Vercel viser (typisk CNAME for `www` → `cname.vercel-dns.com`, og A/ALIAS for apex).
3. Vent på DNS-propagering; Vercel udsteder SSL automatisk.

GaveGenie-koden ændrer ikke DNS — det er et manuelt bruger-trin.
