// USDA FoodData Central API client.
// Docs: https://fdc.nal.usda.gov/api-guide
// Free API key: https://fdc.nal.usda.gov/api-key-signup.html

const BASE = 'https://api.nal.usda.gov/fdc/v1';

function apiKey() {
  return process.env.USDA_API_KEY || 'DEMO_KEY';
}

export type UsdaItem = {
  source: 'usda';
  fdcId: number;
  description: string;
  brand?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
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

function normalize(food: ApiFood): UsdaItem {
  return {
    source: 'usda',
    fdcId: food.fdcId,
    description: food.description,
    brand: food.brandOwner,
    dataType: food.dataType,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    caloriesPer100g: nutrient(food, '1008'),
    proteinPer100g: nutrient(food, '1003'),
    carbsPer100g: nutrient(food, '1005'),
    fatPer100g: nutrient(food, '1004'),
  };
}

export async function searchUsda(query: string, pageSize = 15): Promise<UsdaItem[]> {
  if (!query.trim()) return [];
  const url = `${BASE}/foods/search?api_key=${encodeURIComponent(apiKey())}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
      }),
      next: { revalidate: 60 },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const foods: ApiFood[] = data.foods || [];
  return foods.map(normalize);
}

export async function getUsdaFood(fdcId: number): Promise<UsdaItem | null> {
  const url = `${BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data: ApiFood = await res.json();
  return normalize(data);
}

export function scaleNutrients(
  item: { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number },
  grams: number,
) {
  const factor = grams / 100;
  return {
    calories: Math.round(item.caloriesPer100g * factor),
    proteinG: +(item.proteinPer100g * factor).toFixed(1),
    carbsG: +(item.carbsPer100g * factor).toFixed(1),
    fatG: +(item.fatPer100g * factor).toFixed(1),
  };
}

export const searchFoods = searchUsda;
export type SearchResultItem = UsdaItem;
