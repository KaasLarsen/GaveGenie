import type { LandingFilters, PathPattern } from "./taxonomy";
import {
  budgetBySlug,
  interestBySlug,
  occasionBySlug,
  recipientBySlug,
} from "./taxonomy";

export type ResolvedSlug = {
  slug: string;
  pathPattern: PathPattern;
  filters: LandingFilters;
  /** Human-readable crumbs after "Gaver" */
  crumbs: Array<{ label: string; href: string }>;
  /** Labels for headlines / metadata */
  labels: {
    recipient?: string;
    recipientPhrase?: string;
    interest?: string;
    interestHint?: string;
    occasion?: string;
    budget?: string;
  };
};

/**
 * Parse `/gaver/[...slug]` segments into filters.
 * Returns null when the path is not a known taxonomy combination.
 */
export function resolveSlug(segments: string[]): ResolvedSlug | null {
  if (segments.length === 0 || segments.length > 2) return null;

  const [a, b] = segments;

  if (segments.length === 1) {
    const recipient = recipientBySlug(a);
    if (recipient) {
      return {
        slug: a,
        pathPattern: "recipient",
        filters: { recipientId: recipient.id },
        crumbs: [{ label: recipient.phrase, href: `/gaver/${recipient.slug}` }],
        labels: {
          recipient: recipient.label,
          recipientPhrase: recipient.phrase,
        },
      };
    }
    const occasion = occasionBySlug(a);
    if (occasion) {
      return {
        slug: a,
        pathPattern: "occasion",
        filters: { occasionId: occasion.id },
        crumbs: [{ label: occasion.label, href: `/gaver/${occasion.slug}` }],
        labels: { occasion: occasion.label },
      };
    }
    return null;
  }

  // two segments
  const recipient = recipientBySlug(a);
  const interest = interestBySlug(b);
  if (recipient && interest) {
    return {
      slug: `${a}/${b}`,
      pathPattern: "recipient-interest",
      filters: { recipientId: recipient.id, interestId: interest.id },
      crumbs: [
        { label: recipient.phrase, href: `/gaver/${recipient.slug}` },
        {
          label: interest.label,
          href: `/gaver/${recipient.slug}/${interest.slug}`,
        },
      ],
      labels: {
        recipient: recipient.label,
        recipientPhrase: recipient.phrase,
        interest: interest.label,
        interestHint: interest.headlineHint,
      },
    };
  }

  const occasion = occasionBySlug(a);
  const budget = budgetBySlug(b);
  if (occasion && budget) {
    return {
      slug: `${a}/${b}`,
      pathPattern: "occasion-budget",
      filters: {
        occasionId: occasion.id,
        budgetId: budget.id,
        budgetMaxOre: budget.maxOre,
      },
      crumbs: [
        { label: occasion.label, href: `/gaver/${occasion.slug}` },
        {
          label: budget.label,
          href: `/gaver/${occasion.slug}/${budget.slug}`,
        },
      ],
      labels: {
        occasion: occasion.label,
        budget: budget.label,
      },
    };
  }

  return null;
}
