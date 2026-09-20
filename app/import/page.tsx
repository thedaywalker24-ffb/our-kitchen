import { redirect } from "next/navigation";
import { RecipeImport } from "@/components/recipe-import";
import { getRecipeLibrary } from "@/lib/recipe-library";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims || typeof data.claims.sub !== "string") {
    redirect("/login");
  }

  const library = await getRecipeLibrary(data.claims.sub);
  if (library?.role !== "owner") redirect("/");

  return <RecipeImport householdId={library.householdId} householdName={library.householdName} />;
}
