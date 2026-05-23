// USDA FoodData Central API client.
// Docs: https://fdc.nal.usda.gov/api-guide
// Free API key: https://fdc.nal.usda.gov/api-key-signup.html
//
// Nutrient numbers we care about (Standard Reference / FNDDS):
//   1008 = Energy (kcal)
//   1003 = Protein (g)
//   1005 = Carbohydrate, by difference (g)
//   1004 = Total lipid (fat) (g)

const BASE = 'https://api.nal.usda.gov/fdc/v1';

function apiKey() {
  return process.env.USDA_API_KEY || 'DEMO_KEY';
}

export type SearchResultItem = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  // per 100g basis (computed below)
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

type ApiFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientId?: number;
    nutrientNumber?: string;
    nutrientName?: string;
    value?: number;
    unitName?: string;
  }>;
};

function nutrient(food: ApiFood, nutrientNumber: string): number {
  const list = food.foodNutrients || [];
  const n = list.find(
    (x) => x.nutrientNumber === nutrientNumber || String(x.nutrientId) === nutrientNumber,
  );
  return n?.value ?? 0;
}

function normalize(food: ApiFood): SearchResultItem {
  return {
    fdcId: food.fdcId,
    description: food.description,
    brandOwner: food.brandOwner,
    dataType: food.dataType,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    caloriesPer100g: nutrient(food, '1008'),
    proteinPer100g: nutrient(food, '1003'),
    carbsPer100g: nutrient(food, '1005'),
    fatPer100g: nutrient(food, '1004'),
  };
}

export async function searchFoods(query: string, pageSize = 15): Promise<SearchResultItem[]> {
  if (!query.trim()) return [];
  const url = `${BASE}/foods/search?api_key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      pageSize,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
    }),
    // Cache search results briefly to avoid bursts
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`USDA search failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const foods: ApiFood[] = data.foods || [];
  return foods.map(normalize);
}

export async function getFood(fdcId: number): Promise<SearchResultItem | null> {
  const url = `${BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data: ApiFood = await res.json();
  return normalize(data);
}

// Convert per-100g nutrients into the actual amount consumed.
export function scaleNutrients(item: SearchResultItem, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(item.caloriesPer100g * factor),
    proteinG: +(item.proteinPer100g * factor).toFixed(1),
    carbsG: +(item.carbsPer100g * factor).toFixed(1),
    fatG: +(item.fatPer100g * factor).toFixed(1),
  };
}
