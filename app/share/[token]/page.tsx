import { Clock3, ExternalLink, ListChecks } from "lucide-react";
import { notFound } from "next/navigation";
import { getSharedRecipe } from "@/lib/recipe-library";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedRecipePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();

  const recipe = await getSharedRecipe(token);
  if (!recipe) notFound();

  return (
    <main className="shared-page">
      <header className="shared-header">
        <span className="brand-mark"><ListChecks /></span>
        <span><strong>Our Kitchen</strong><small>Shared family recipe</small></span>
      </header>
      <article className="shared-recipe">
        <div className="shared-image">
          {/* biome-ignore lint/performance/noImgElement: Shared recipes can reference arbitrary source hosts. */}
          <img src={recipe.image} alt={recipe.title} referrerPolicy="no-referrer" />
        </div>
        <div className="shared-body">
          <div className="tag-row">{recipe.categories.map((category) => <span key={category}>{category}</span>)}</div>
          <h1>{recipe.title}</h1>
          {recipe.description && <p className="shared-description">{recipe.description}</p>}
          <div className="shared-stats">
            <span><Clock3 /> Prep <strong>{recipe.active}</strong></span>
            <span><Clock3 /> Total <strong>{recipe.total}</strong></span>
            <span>Makes <strong>{recipe.yield}</strong></span>
          </div>
          <section className="shared-section">
            <h2>Ingredients</h2>
            {recipe.ingredients.map((section) => (
              <div className="shared-ingredient-group" key={section.section ?? section.items.join("|")}>
                {section.section && <h3>{section.section}</h3>}
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ))}
          </section>
          <section className="shared-section">
            <h2>Directions</h2>
            <ol>{recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </section>
          {recipe.notes && <section className="shared-section"><h2>Notes</h2><p>{recipe.notes}</p></section>}
          <footer className="shared-source">
            <span>From {recipe.source}</span>
            {recipe.sourceUrl && <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink /></a>}
          </footer>
        </div>
      </article>
    </main>
  );
}
