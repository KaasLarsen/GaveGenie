/** Provider-independent normalized product used by adapters and ranking. */
export type NormalizedProduct = {
  provider: string;
  externalId: string;
  retailerSlug: string;
  retailerName: string;
  retailerWebsite?: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  tags: string[];
  /** Price in øre (1 DKK = 100 øre). Null when unknown. */
  priceOre: number | null;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  /** null = stock unknown (never invent stock status) */
  inStock: boolean | null;
  isSample: boolean;
};

export type GiftPreferences = {
  query: string;
  recipient?: string;
  occasion?: string;
  budgetMinOre?: number;
  budgetMaxOre?: number;
  style?: string;
};

export type RankedCandidate = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  tags: string[];
  priceOre: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
  inStock: boolean | null;
  isSample: boolean;
  retailerName: string;
  score: number;
};

/** User-facing recommendation — no merchant/feed prose (description/brand/category). */
export type GiftRecommendation = {
  productId: string;
  title: string;
  priceOre: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
  inStock: boolean | null;
  isSample: boolean;
  retailerName: string;
  why: string;
  score: number;
};
