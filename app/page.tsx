import { redirect } from "next/navigation";
import { RecipeApp } from "@/components/recipe-app";
import { getRecipeLibrary } from "@/lib/recipe-library";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : "Household member";
  const userId = typeof data.claims.sub === "string" ? data.claims.sub : "";
  const library = await getRecipeLibrary(userId);

  if (!library) {
    return (
      <main className="setup-message">
        <h1>Household setup needed</h1>
        <p>Your account is valid, but it has not been added to a household yet.</p>
      </main>
    );
  }

  return (
    <RecipeApp
      householdId={library.householdId}
      householdName={library.householdName}
      initialFavoriteIds={library.favoriteIds}
      initialRecipeData={library.recipes}
      userEmail={email}
      userId={userId}
    />
  );
}
