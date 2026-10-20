-- Full-text search vector for gift finder (simple config; app normalizes text on import)
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector;

-- Best-effort backfill from existing columns (re-import refreshes with accent-normalized text)
UPDATE "Product"
SET "searchVector" =
  setweight(to_tsvector('simple', lower(coalesce("title", ''))), 'A')
  || setweight(
    to_tsvector(
      'simple',
      lower(
        trim(
          both ' '
          from
            coalesce("brand", '')
            || ' '
            || coalesce("category", '')
            || ' '
            || coalesce(array_to_string("tags", ' '), '')
        )
      )
    ),
    'B'
  )
  || setweight(to_tsvector('simple', lower(coalesce("description", ''))), 'C');

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
