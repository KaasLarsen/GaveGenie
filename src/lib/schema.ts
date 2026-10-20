import { z } from "zod";

export const giftPreferencesSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Beskriv gaven med mindst 2 tegn")
    .max(500, "Beskrivelsen er for lang"),
  recipient: z.string().trim().max(120).optional().or(z.literal("")),
  occasion: z.string().trim().max(120).optional().or(z.literal("")),
  /** Budget in whole DKK (UI); converted to øre in the API */
  budgetMinDkk: z.coerce.number().min(0).max(1_000_000).optional(),
  budgetMaxDkk: z.coerce.number().min(0).max(1_000_000).optional(),
  style: z.string().trim().max(120).optional().or(z.literal("")),
});

export type GiftPreferencesInput = z.infer<typeof giftPreferencesSchema>;

export const openaiWhyItemSchema = z.object({
  productId: z.string().min(1),
  why: z.string().min(1).max(400),
});

export const openaiWhyResponseSchema = z.object({
  recommendations: z.array(openaiWhyItemSchema).max(8),
});

export const sampleFeedItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priceDkk: z.number().nonnegative().nullable().optional(),
  currency: z.string().default("DKK"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  productUrl: z.string().url(),
  inStock: z.boolean().nullable().optional(),
  retailerSlug: z.string().min(1),
  retailerName: z.string().min(1),
  retailerWebsite: z.string().url().optional(),
});

export const sampleFeedSchema = z.object({
  meta: z.object({
    provider: z.string().min(1),
    label: z.string().min(1),
    isDevelopmentData: z.literal(true),
    note: z.string().optional(),
  }),
  products: z.array(sampleFeedItemSchema).min(1),
});
