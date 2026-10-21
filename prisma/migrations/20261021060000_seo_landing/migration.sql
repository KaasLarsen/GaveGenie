-- CreateTable
CREATE TABLE "SeoLanding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pathPattern" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "minPriceOre" INTEGER,
    "maxPriceOre" INTEGER,
    "indexed" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoLanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoLanding_slug_key" ON "SeoLanding"("slug");

-- CreateIndex
CREATE INDEX "SeoLanding_indexed_idx" ON "SeoLanding"("indexed");
