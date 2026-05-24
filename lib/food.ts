// Unified food-source layer.
//
// We pull from two databases:
//   - Open Food Facts (UK-biased) → branded supermarket products.
//   - USDA FoodData Central → raw/whole foods and US-branded items.
//
// /api/search merges both, biased toward OFF first because the user is UK-based.

import { searchUsda, getUsdaFood, type UsdaItem } from './usda';
import { searchOff, getOffProduct, type OffItem } from './openfoodfacts';

export type FoodItem = UsdaItem | OffItem;

export async function searchAllSources(query: string): Promise<FoodItem[]> {
  // Run in parallel; ignore individual failures.
  const [off, usda] = await Promise.all([
    searchOff(query, 12).catch(() => [] as OffItem[]),
    searchUsda(query, 12).catch(() => [] as UsdaItem[]),
  ]);
  // Interleave: prefer OFF for branded UK items, but keep USDA visible for
  // whole foods. We put OFF first and append USDA up to a combined cap.
  const merged: FoodItem[] = [];
  const seen = new Set<string>();
  for (const item of [...off, ...usda]) {
    const key =
      item.source === 'usda'
        ? `usda:${item.fdcId}`
        : `off:${item.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 20) break;
  }
  return merged;
}

export async function getFood(
  source: 'usda' | 'off',
  id: string | number,
): Promise<FoodItem | null> {
  if (source === 'usda') {
    return getUsdaFood(Number(id));
  }
  return getOffProduct(String(id));
}
