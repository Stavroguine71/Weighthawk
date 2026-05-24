// Open Food Facts API client.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
// No API key required. UK-focused subdomain has the strongest UK supermarket
// product coverage (Tesco, Sainsbury's, M&S, Waitrose, Asda, etc.).
//
// We use the world.openfoodfacts.org host because the UK subdomain only filters
// the visible UI — the underlying database is the same. Searching with
// country tag "united-kingdom" biases toward UK products.

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

// Identify the app as required by OFF terms.
const UA = 'Weighthawk/1.0 (nutrition tracker, personal use)';

export type OffItem = {
  source: 'off';
  // OFF uses the product barcode as its stable id.
  code: string;
  description: string;
  brand?: string;
  // per 100g basis
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize?: number;
  servingSizeUnit?: string;
};

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  generic_name?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(n: number | string | undefined): number {
  if (typeof n === 'number') return Number.isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const v = parseFloat(n);
    return Number.isFinite(v) ? v : 0;
  }
  return 0;
}

function normalize(p: OffProduct): OffItem | null {
  const code = p.code;
  if (!code) return null;
  const name = p.product_name || p.product_name_en || p.generic_name || code;
  const nutr = p.nutriments || {};
  // OFF stores energy in kcal as `energy-kcal_100g`, fallback to kJ if needed.
  let kcal = num(nutr['energy-kcal_100g']);
  if (!kcal) {
    const kj = num(nutr['energy_100g']);
    if (kj) kcal = Math.round(kj / 4.184);
  }
  const protein = num(nutr['proteins_100g']);
  const carbs = num(nutr['carbohydrates_100g']);
  const fat = num(nutr['fat_100g']);
  // If we have literally no kcal data, skip — useless entry.
  if (!kcal && !protein && !carbs && !fat) return null;

  // serving_quantity is grams when present
  const servingQ = typeof p.serving_quantity === 'number'
    ? p.serving_quantity
    : typeof p.serving_quantity === 'string'
    ? parseFloat(p.serving_quantity) || undefined
    : undefined;

  return {
    source: 'off',
    code,
    description: name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    caloriesPer100g: kcal,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    servingSize: servingQ,
    servingSizeUnit: servingQ ? 'g' : undefined,
  };
}

export async function searchOff(query: string, pageSize = 12): Promise<OffItem[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    // Bias to UK products. OFF still returns global if no UK match.
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: 'united-kingdom',
    // Limit response size by only asking for fields we need.
    fields: 'code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity',
  });
  const url = `${SEARCH_URL}?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 60 },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const products: OffProduct[] = data.products || [];
  return products
    .map(normalize)
    .filter((x): x is OffItem => x !== null);
}

export async function getOffProduct(code: string): Promise<OffItem | null> {
  if (!code) return null;
  const url = `${PRODUCT_URL}/${encodeURIComponent(code)}.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.product) return null;
  return normalize(data.product as OffProduct);
}
