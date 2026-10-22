import type { GiftPreferences } from "./types";

/** Preference-only why text — never embeds feed title or merchant copy. */
export function preferenceWhy(
  preferences: GiftPreferences,
  isSample: boolean,
): string {
  const bits: string[] = [];
  if (preferences.recipient) {
    bits.push(`passer godt til ${preferences.recipient}`);
  }
  if (preferences.occasion) {
    bits.push(`relevant til ${preferences.occasion}`);
  }
  if (preferences.style) {
    bits.push(`matcher stilen ${preferences.style}`);
  }
  const reason =
    bits.length > 0
      ? bits.join(", ")
      : `matcher din søgning “${preferences.query}”`;
  const sampleNote = isSample ? " (eksempelprodukt til udvikling)" : "";
  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.${sampleNote}`
    .replace(/\s+/g, " ")
    .trim();
}
