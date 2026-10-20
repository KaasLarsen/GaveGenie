import type { NormalizedProduct } from "../types";

export type FeedLoadResult = {
  provider: string;
  source: string;
  products: NormalizedProduct[];
  isDevelopmentData: boolean;
};

/** Provider-independent feed adapter. */
export interface FeedAdapter {
  readonly provider: string;
  load(): Promise<FeedLoadResult>;
}
