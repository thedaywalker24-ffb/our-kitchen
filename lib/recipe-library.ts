import "server-only";

import type { Recipe } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

type RecipeRow = {
  id: string;
  title: string;
  description: string;
  yield_text: string;
  active_time: string;
  total_time: string;
  ingredients: unknown;
  instructions: unknown;
  source: string;
  source_url: string | null;
  notes: string;
  image_url: string | null;
  categories: string[];
};

function isIngredientSections(value: unknown): value is Recipe["ingredients"] {
  return Array.isArray(value) && value.every((section) => {
    if (!section || typeof section !== "object") return false;
    const candidate = section as { section?: unknown; items?: unknown };
    return Array.isArray(candidate.items) && candidate.items.every((item) => typeof item === "string");
  });
}

function isSteps(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((step) => typeof step === "string");
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image_url || "/images/roast-chicken.jpg",
    source: row.source || "Our Kitchen",
    sourceUrl: row.source_url || undefined,
    yield: row.yield_text || "Not specified",
    active: row.active_time || "Not specified",
    total: row.total_time || "Not specified",
    categories: row.categories.length ? row.categories : ["Uncategorized"],
    ingredients: isIngredientSections(row.ingredients) ? row.ingredients : [{ items: [] }],
    steps: isSteps(row.instructions) ? row.instructions : [],
    notes: row.notes || undefined,
  };
}

export async function getSharedRecipe(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_recipe", { share_token: token });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return toRecipe(data as RecipeRow);
}

export async function getRecipeLibrary(userId: string) {
  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return null;
  const householdId = membership.household_id as string;

  async function fetchAllRecipes() {
    const pageSize = 1000;
    const rows: RecipeRow[] = [];

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,title,description,yield_text,active_time,total_time,ingredients,instructions,source,source_url,notes,image_url,categories")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      const page = data as RecipeRow[];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  const [{ data: household, error: householdError }, rows, { data: favoriteRows, error: favoritesError }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).single(),
    fetchAllRecipes(),
    supabase.from("recipe_favorites").select("recipe_id").eq("user_id", userId),
  ]);

  if (householdError) throw householdError;
  if (favoritesError) throw favoritesError;

  return {
    householdId,
    householdName: household.name as string,
    role: membership.role as "owner" | "member",
    recipes: rows.map(toRecipe),
    favoriteIds: favoriteRows.map((favorite) => favorite.recipe_id as string),
  };
}
