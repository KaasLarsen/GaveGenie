/**
 * Partner Ads product feeds for GaveGenie.
 * Add new shops by appending to PARTNER_ADS_FEEDS — no other wiring needed.
 */

export type PartnerAdsFeedConfig = {
  feedId: string;
  bannerId: string;
  /** Human-readable shop label (for logs / docs) */
  label: string;
};

export const PARTNER_ADS_PARTNER_ID = "57802";

export const PARTNER_ADS_FEEDS: readonly PartnerAdsFeedConfig[] = [
  { feedId: "2437", bannerId: "92392", label: "Justcool.dk" },
  { feedId: "4278", bannerId: "116608", label: "Klodshelten" },
  { feedId: "1748", bannerId: "76492", label: "KÆRE BØRN" },
  { feedId: "1318", bannerId: "65841", label: "Backpackerlife.dk" },
  { feedId: "4330", bannerId: "117056", label: "Booktok" },
  { feedId: "3590", bannerId: "109615", label: "Designplakater.dk" },
] as const;

export function partnerAdsProviderKey(feedId: string): string {
  return `partner-ads-${feedId}`;
}

export function buildPartnerAdsFeedUrl(
  feed: PartnerAdsFeedConfig,
  partnerId: string = PARTNER_ADS_PARTNER_ID,
): string {
  const params = new URLSearchParams({
    partnerid: partnerId,
    bannerid: feed.bannerId,
    feedid: feed.feedId,
  });
  return `https://www.partner-ads.com/dk/feed_udlaes.php?${params.toString()}`;
}

export function getPartnerAdsFeedById(
  feedId: string,
): PartnerAdsFeedConfig | undefined {
  return PARTNER_ADS_FEEDS.find((f) => f.feedId === feedId);
}

export function getPartnerAdsFeedByProvider(
  provider: string,
): PartnerAdsFeedConfig | undefined {
  if (!provider.startsWith("partner-ads-")) return undefined;
  const feedId = provider.slice("partner-ads-".length);
  return getPartnerAdsFeedById(feedId);
}
