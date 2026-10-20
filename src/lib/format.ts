import { formatPriceDkk } from "./normalize";

export { formatPriceDkk };

export function stockLabel(inStock: boolean | null): string {
  if (inStock === true) return "På lager";
  if (inStock === false) return "Ikke på lager";
  return "Lagerstatus ukendt";
}
