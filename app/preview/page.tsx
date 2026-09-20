import { notFound } from "next/navigation";
import { RecipeApp } from "@/components/recipe-app";

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <RecipeApp />;
}
