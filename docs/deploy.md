# Deploy: Vercel + one.com

## Vercel

1. Import `KaasLarsen/GaveGenie` in Vercel (Framework: Next.js).
2. Add environment variables:
   - `DATABASE_URL` — hosted Postgres
   - `OPENAI_API_KEY`
   - `ADMIN_SECRET`
   - `NEXT_PUBLIC_SITE_URL` — production URL (fx `https://gavegenie.dk`)
3. Build command: `prisma generate && next build` (allerede i `npm run build`).
4. Efter første deploy: kør migrationer og Partner Ads-import mod prod-DB:

```bash
DATABASE_URL="postgresql://…" npx prisma migrate deploy
DATABASE_URL="postgresql://…" npm run import:feed
```

`npm run import:feed` synkroniserer alle feeds i `src/lib/feeds/partner-ads-registry.ts`. Booktok er stort (~99k produkter) — kør importen via CLI (ikke kun serverless admin), så den ikke timeouts.

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
