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
  { feedId: "3833", bannerId: "112426", label: "Travelbetter.dk" },
  { feedId: "637", bannerId: "46187", label: "Apuls.dk" },
  { feedId: "13", bannerId: "16532", label: "Billigsport24" },
  { feedId: "819", bannerId: "51440", label: "MM Sport" },
  { feedId: "1882", bannerId: "79757", label: "Padelshoppen.com" },
  { feedId: "4444", bannerId: "118048", label: "Retrotrøjer.dk" },
  { feedId: "2767", bannerId: "98464", label: "Skisport.dk" },
  { feedId: "1883", bannerId: "79758", label: "Tennisshoppen.dk" },
  { feedId: "565", bannerId: "44269", label: "Outmore.dk" },
  { feedId: "3278", bannerId: "105970", label: "EauDeParfum.dk" },
  { feedId: "4090", bannerId: "114827", label: "IdHAIR" },
  { feedId: "522", bannerId: "42807", label: "Med24" },
  { feedId: "4347", bannerId: "117147", label: "Barnetsrum" },
  { feedId: "3461", bannerId: "108173", label: "DH Wines" },
  { feedId: "3860", bannerId: "112662", label: "SPS Wine" },
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
