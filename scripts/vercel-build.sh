#!/usr/bin/env bash
# Production build for Vercel. Never hang forever on DB — prefer a fast
# failure (or skip) so the deploy queue can clear and the app ships.
set -euo pipefail

echo "[vercel-build] starting…"

if [[ -n "${DATABASE_URL:-}" ]]; then
  case "$DATABASE_URL" in
    *connect_timeout=*) ;;
    *\?*) export DATABASE_URL="${DATABASE_URL}&connect_timeout=10&pool_timeout=10" ;;
    *) export DATABASE_URL="${DATABASE_URL}?connect_timeout=10&pool_timeout=10" ;;
  esac
fi

run_with_timeout() {
  local seconds="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout --signal=TERM --kill-after=10 "$seconds" "$@"
  else
    "$@"
  fi
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[vercel-build] prisma migrate deploy (max 60s)…"
  if ! run_with_timeout 60 npx prisma migrate deploy; then
    echo "[vercel-build] migrate failed or timed out — checking status…"
    if ! run_with_timeout 20 npx prisma migrate status; then
      echo "[vercel-build] migrate status also failed; continuing so next build can ship UI"
    fi
  fi
else
  echo "[vercel-build] DATABASE_URL missing — skip migrate"
fi

echo "[vercel-build] prisma generate…"
npx prisma generate

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[vercel-build] ensure-seo-on-build (max 50s)…"
  run_with_timeout 50 npx tsx scripts/ensure-seo-on-build.ts || \
    echo "[vercel-build] ensure-seo skipped/failed (ignored)"
fi

echo "[vercel-build] next build…"
npx next build
echo "[vercel-build] done"
