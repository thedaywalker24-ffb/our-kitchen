import { notFound, redirect } from "next/navigation";
import { RecipeApp } from "@/components/recipe-app";
import { getRecipeLibrary } from "@/lib/recipe-library";
import { createClient } from "@/lib/supabase/server";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");

  const userId = typeof data.claims.sub === "string" ? data.claims.sub : "";
  const email = typeof data.claims.email === "string" ? data.claims.email : "Household member";
  const library = await getRecipeLibrary(userId);
  if (!library) redirect("/");

  const { id } = await params;
  if (!library.recipes.some((recipe) => recipe.id === id)) notFound();

  return (
    <RecipeApp
      householdId={library.householdId}
      householdName={library.householdName}
      initialFavoriteIds={library.favoriteIds}
      initialRecipeData={library.recipes}
      initialSelectedId={id}
      userEmail={email}
      userId={userId}
    />
  );
}
