"use client";

import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileUp,
  Heart,
  House,
  LayoutGrid,
  Link2,
  List,
  ListChecks,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  UserRound,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { type Recipe, recipes as previewRecipes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";

type View = "recipes" | "favorites";
type DisplayMode = "grid" | "list";

export function RecipeApp({
  householdId,
  householdName = "Williamson home",
  initialFavoriteIds,
  initialRecipeData = previewRecipes,
  userEmail = "Williamson home",
  userId,
}: {
  householdId?: string;
  householdName?: string;
  initialFavoriteIds?: string[];
  initialRecipeData?: Recipe[];
  userEmail?: string;
  userId?: string;
}) {
  const [recipes, setRecipes] = useState(initialRecipeData);
  const [view, setView] = useState<View>("recipes");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>(initialFavoriteIds ?? ["1001", "1003"]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("grid");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [cooking, setCooking] = useState<Recipe | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const saved = window.localStorage.getItem("our-kitchen-favorites");
    const savedDisplayMode = window.localStorage.getItem("our-kitchen-display-mode");
    const frame = window.requestAnimationFrame(() => {
      if (!householdId && saved) setFavorites(JSON.parse(saved));
      if (savedDisplayMode === "grid" || savedDisplayMode === "list") setDisplayMode(savedDisplayMode);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [householdId]);

  function changeDisplayMode(mode: DisplayMode) {
    setDisplayMode(mode);
    window.localStorage.setItem("our-kitchen-display-mode", mode);
  }

  async function toggleFavorite(id: string) {
    const wasFavorite = favorites.includes(id);
    const next = wasFavorite ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);

    if (!householdId || !userId) {
      window.localStorage.setItem("our-kitchen-favorites", JSON.stringify(next));
      return;
    }

    const supabase = createClient();
    const { error } = wasFavorite
      ? await supabase.from("recipe_favorites").delete().eq("recipe_id", id).eq("user_id", userId)
      : await supabase.from("recipe_favorites").insert({ recipe_id: id, user_id: userId });

    if (error) setFavorites(favorites);
  }

  async function addRecipe(recipe: Recipe) {
    if (!householdId) {
      setRecipes((current) => [recipe, ...current]);
      setAddOpen(false);
      setSelected(recipe);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("recipes")
      .insert({
        household_id: householdId,
        title: recipe.title,
        description: recipe.description,
        yield_text: recipe.yield === "Not specified" ? "" : recipe.yield,
        active_time: "",
        total_time: "",
        ingredients: recipe.ingredients,
        instructions: recipe.steps,
        source: recipe.source,
        source_url: recipe.sourceUrl || null,
        notes: recipe.notes || "",
        image_url: null,
        categories: recipe.categories,
      })
      .select("id")
      .single();

    if (error) return error.message;

    const savedRecipe = { ...recipe, id: data.id as string };
    setRecipes((current) => [savedRecipe, ...current]);
    setAddOpen(false);
    setSelected(savedRecipe);
  }

  const filteredRecipes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return recipes.filter((recipe) => {
      const matchesView = view === "recipes" || favorites.includes(recipe.id);
      const matchesCategory = category === "All" || recipe.categories.includes(category);
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.source,
        ...recipe.categories,
        ...recipe.ingredients.flatMap((section) => section.items),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchesView && matchesCategory && (!term || haystack.includes(term));
    });
  }, [category, favorites, recipes, search, view]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(recipes.flatMap((recipe) => recipe.categories));
    return ["All", ...Array.from(categories).sort((a, b) => a.localeCompare(b))];
  }, [recipes]);

  const visibleRecipes = filteredRecipes.slice(0, visibleCount);
  const categoryCount = new Set(recipes.flatMap((recipe) => recipe.categories)).size;

  return (
    <main className="app-shell">
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <Brand compact />
        <nav>
          <NavButton active={view === "recipes"} icon={<BookOpen />} label="Recipes" onClick={() => setView("recipes")} />
          <NavButton active={view === "favorites"} icon={<Heart />} label="Favorites" onClick={() => setView("favorites")} />
        </nav>
        <div className="sidebar-library">
          <span className="sidebar-label">Library</span>
          <p><strong>{recipes.length.toLocaleString()}</strong> recipes</p>
          <p><strong>{categoryCount.toLocaleString()}</strong> categories</p>
        </div>
        <form className="account-form" action="/auth/signout" method="post">
          <button className="account-button" type="submit" title="Sign out">
            <span className="avatar">{userEmail.slice(0, 2).toUpperCase()}</span>
            <span><strong>{userEmail}</strong><small>{householdName}</small></span>
            <MoreHorizontal aria-hidden="true" />
          </button>
        </form>
      </aside>

      <section className="main-content">
        <header className="mobile-header">
          <Brand />
          <form action="/auth/signout" method="post">
            <button className="icon-button" type="submit" aria-label="Sign out" title="Sign out"><UserRound /></button>
          </form>
        </header>

        <div className="content-header">
          <div>
            <p className="eyebrow">Williamson family recipes</p>
            <h1>{view === "favorites" ? "Favorites" : "What are we cooking?"}</h1>
          </div>
          <button className="primary-button desktop-add" type="button" onClick={() => setAddOpen(true)}>
            <Plus /> Add recipe
          </button>
        </div>

        <div className="search-row">
          <label className="search-box">
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipes or ingredients"
              aria-label="Search recipes or ingredients"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X /></button>}
          </label>
          <button className="filter-button" type="button" aria-label="Filter recipes"><SlidersHorizontal /></button>
        </div>

        <fieldset className="category-scroller">
          <legend className="sr-only">Recipe categories</legend>
          {categoryOptions.map((option) => (
            <button
              className={category === option ? "category-chip active" : "category-chip"}
              key={option}
              type="button"
              onClick={() => setCategory(option)}
            >
              {option}
            </button>
          ))}
        </fieldset>

        <div className="results-heading">
          <h2>{category === "All" ? (view === "favorites" ? "Saved recipes" : "Recently added") : category}</h2>
          <div className="results-actions">
            <span>{filteredRecipes.length} shown</span>
            <fieldset className="view-toggle">
              <legend className="sr-only">Recipe display</legend>
              <button
                className={displayMode === "grid" ? "active" : ""}
                type="button"
                onClick={() => changeDisplayMode("grid")}
                aria-label="Grid view"
                aria-pressed={displayMode === "grid"}
                title="Grid view"
              >
                <LayoutGrid />
              </button>
              <button
                className={displayMode === "list" ? "active" : ""}
                type="button"
                onClick={() => changeDisplayMode("list")}
                aria-label="List view"
                aria-pressed={displayMode === "list"}
                title="List view"
              >
                <List />
              </button>
            </fieldset>
          </div>
        </div>

        {filteredRecipes.length ? (
          <div className={`recipe-grid ${displayMode === "list" ? "list-view" : ""}`}>
            {visibleRecipes.map((recipe, index) => (
              <RecipeCard
                eager={index === 0}
                favorite={favorites.includes(recipe.id)}
                key={recipe.id}
                recipe={recipe}
                onFavorite={() => toggleFavorite(recipe.id)}
                onOpen={() => setSelected(recipe)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {recipes.length === 0 ? <FileUp /> : <Search />}
            <h2>{recipes.length === 0 ? "Your kitchen is ready" : "No recipes found"}</h2>
            <p>{recipes.length === 0 ? "Import the family recipe collection to get started." : "Try another ingredient or clear the category filter."}</p>
            {recipes.length === 0 ? (
              <button className="primary-button" type="button" onClick={() => { window.location.href = "/import"; }}><FileUp /> Import recipes</button>
            ) : (
              <button className="secondary-button" type="button" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button>
            )}
          </div>
        )}
        {visibleCount < filteredRecipes.length && (
          <button className="secondary-button load-more" type="button" onClick={() => setVisibleCount((count) => count + 24)}>
            Show more recipes
          </button>
        )}
      </section>

      <nav className="mobile-nav" aria-label="Primary navigation">
        <NavButton active={view === "recipes"} icon={<House />} label="Recipes" onClick={() => setView("recipes")} />
        <button className="mobile-add" type="button" onClick={() => setAddOpen(true)} aria-label="Add recipe"><Plus /></button>
        <NavButton active={view === "favorites"} icon={<Heart />} label="Favorites" onClick={() => setView("favorites")} />
      </nav>

      {selected && (
        <RecipeDetail
          recipe={selected}
          favorite={favorites.includes(selected.id)}
          onClose={() => setSelected(null)}
          onFavorite={() => toggleFavorite(selected.id)}
          onCook={() => { setSelected(null); setCooking(selected); }}
        />
      )}
      {cooking && <CookingMode recipe={cooking} onClose={() => setCooking(null)} />}
      {addOpen && <AddRecipe onClose={() => setAddOpen(false)} onAdd={addRecipe} />}
    </main>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand compact" : "brand"}>
      <span className="brand-mark"><ListChecks /></span>
      <span><strong>Our Kitchen</strong>{!compact && <small>Family recipe book</small>}</span>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? "nav-button active" : "nav-button"} type="button" onClick={onClick}>{icon}<span>{label}</span></button>;
}

function RecipeCard({ recipe, favorite, eager, onFavorite, onOpen }: { recipe: Recipe; favorite: boolean; eager: boolean; onFavorite: () => void; onOpen: () => void }) {
  return (
    <article className="recipe-card">
      <button className="card-hit-area" type="button" onClick={onOpen} aria-label={`Open ${recipe.title}`} />
      <div className="card-image">
        <RecipeImage src={recipe.image} alt="" eager={eager} sizes="(max-width: 720px) 50vw, 320px" />
        <button className={favorite ? "favorite-button active" : "favorite-button"} type="button" onClick={onFavorite} aria-label={favorite ? "Remove from favorites" : "Add to favorites"}>
          <Heart fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-copy">
        <span className="card-category">{recipe.categories[0]}</span>
        <h3>{recipe.title}</h3>
        <div className="card-meta"><Clock3 /><span>{recipe.total}</span><span>·</span><span>{recipe.yield}</span></div>
      </div>
    </article>
  );
}

function RecipeImage({ src, alt, eager = false, sizes = "100vw" }: { src: string; alt: string; eager?: boolean; sizes?: string }) {
  if (/^https?:\/\//i.test(src)) {
    // biome-ignore lint/performance/noImgElement: Imports can reference arbitrary hosts; avoid an unrestricted server image proxy.
    return <img className="fill-image" src={src} alt={alt} loading={eager ? "eager" : "lazy"} />;
  }

  return <Image src={src} alt={alt} fill loading={eager ? "eager" : "lazy"} sizes={sizes} />;
}

function RecipeDetail({ recipe, favorite, onClose, onFavorite, onCook }: { recipe: Recipe; favorite: boolean; onClose: () => void; onFavorite: () => void; onCook: () => void }) {
  const [servings, setServings] = useState(1);
  return (
    <div className="layer recipe-layer" role="dialog" aria-modal="true" aria-label={recipe.title}>
      <div className="detail-topbar">
        <button className="icon-button light" type="button" onClick={onClose} aria-label="Back to recipes"><ArrowLeft /></button>
        <div>
          <button className={favorite ? "icon-button light favorite-active" : "icon-button light"} type="button" onClick={onFavorite} aria-label="Toggle favorite"><Heart fill={favorite ? "currentColor" : "none"} /></button>
          <button className="icon-button light" type="button" aria-label="More options"><MoreHorizontal /></button>
        </div>
      </div>
      <div className="detail-hero">
        <RecipeImage src={recipe.image} alt={recipe.title} eager />
      </div>
      <div className="detail-sheet">
        <div className="detail-heading">
          <div className="tag-row">{recipe.categories.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <h1>{recipe.title}</h1>
          <p>{recipe.description}</p>
        </div>
        <div className="detail-stats">
          <div><span>Prep</span><strong>{recipe.active}</strong></div>
          <div><span>Total</span><strong>{recipe.total}</strong></div>
          <div><span>Makes</span><strong>{recipe.yield}</strong></div>
        </div>
        <section className="recipe-section">
          <div className="section-title-row">
            <h2>Ingredients</h2>
            <fieldset className="serving-stepper">
              <legend className="sr-only">Recipe scale</legend>
              <button type="button" onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Decrease recipe scale"><Minus /></button>
              <span>{servings}×</span>
              <button type="button" onClick={() => setServings(servings + 1)} aria-label="Increase recipe scale"><Plus /></button>
            </fieldset>
          </div>
          {recipe.ingredients.map((section) => (
            <div className="ingredient-section" key={section.section ?? section.items.join("|")}>
              {section.section && <h3>{section.section}</h3>}
              {section.items.map((item) => <CheckRow key={item} label={item} />)}
            </div>
          ))}
        </section>
        <section className="recipe-section directions-preview">
          <h2>Directions</h2>
          {recipe.steps.slice(0, 3).map((step, index) => <div className="direction-row" key={step}><span>{index + 1}</span><p>{step}</p></div>)}
        </section>
        <div className="source-row">
          <span>From {recipe.source}</span>
          {recipe.sourceUrl && <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink /></a>}
        </div>
      </div>
      <div className="cook-bar"><button className="primary-button cook-button" type="button" onClick={onCook}><Sparkles /> Start cooking</button></div>
    </div>
  );
}

function CheckRow({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return <label className={checked ? "check-row checked" : "check-row"}><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span className="custom-check"><Check /></span><span>{label}</span></label>;
}

function CookingMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    async function keepAwake() {
      if ("wakeLock" in navigator) {
        try { wakeLock.current = await navigator.wakeLock.request("screen"); } catch { /* Unsupported or denied. */ }
      }
    }
    keepAwake();
    return () => { wakeLock.current?.release(); };
  }, []);

  const progress = ((step + 1) / recipe.steps.length) * 100;
  return (
    <div className="layer cooking-layer" role="dialog" aria-modal="true" aria-label={`Cooking ${recipe.title}`}>
      <header className="cooking-header">
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close cooking mode"><X /></button>
        <div><span>Cooking</span><strong>{recipe.title}</strong></div>
        <button className="icon-button" type="button" onClick={() => setIngredientsOpen(true)} aria-label="Show ingredients"><ListChecks /></button>
      </header>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <section className="cooking-step">
        <p className="step-count">Step {step + 1} of {recipe.steps.length}</p>
        <h1>{recipe.steps[step]}</h1>
        {/minute|hour/i.test(recipe.steps[step]) && <button className="timer-button" type="button"><TimerReset /> Start timer</button>}
      </section>
      <footer className="cooking-controls">
        <button className="secondary-button" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft /> Previous</button>
        {step < recipe.steps.length - 1 ? (
          <button className="primary-button" type="button" onClick={() => setStep(step + 1)}>Next step <ChevronRight /></button>
        ) : (
          <button className="primary-button" type="button" onClick={onClose}><Check /> Finish</button>
        )}
      </footer>
      {ingredientsOpen && <div className="ingredient-drawer"><div className="drawer-header"><h2>Ingredients</h2><button className="icon-button" type="button" onClick={() => setIngredientsOpen(false)} aria-label="Close ingredients"><X /></button></div>{recipe.ingredients.flatMap((section) => section.items).map((item) => <CheckRow key={item} label={item} />)}</div>}
    </div>
  );
}

function AddRecipe({ onClose, onAdd }: { onClose: () => void; onAdd: (recipe: Recipe) => Promise<string | undefined> }) {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "Untitled recipe");
    const ingredients = String(form.get("ingredients") || "").split("\n").filter(Boolean);
    const steps = String(form.get("steps") || "").split("\n").filter(Boolean);
    const saveError = await onAdd({
      id: `local-${Date.now()}`,
      title,
      description: String(form.get("description") || "A new family recipe."),
      image: "/images/roast-chicken.jpg",
      source: "Our Kitchen",
      yield: String(form.get("yield") || "Not specified"),
      active: "—",
      total: "—",
      categories: ["Family recipe"],
      ingredients: [{ items: ingredients.length ? ingredients : ["Add ingredients"] }],
      steps: steps.length ? steps : ["Add directions"],
    });
    if (saveError) {
      setError(saveError);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="add-modal" role="dialog" aria-modal="true" aria-label="Add recipe">
        <div className="modal-header"><div><p className="eyebrow">Build your collection</p><h2>Add a recipe</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        <div className="segmented-control"><button className={mode === "url" ? "active" : ""} type="button" onClick={() => setMode("url")}><Link2 /> From a link</button><button className={mode === "manual" ? "active" : ""} type="button" onClick={() => setMode("manual")}><Plus /> Enter manually</button></div>
        {mode === "url" ? (
          <div className="url-import">
            <label>Recipe URL<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/recipe" inputMode="url" /></label>
            <p>We’ll extract the title, image, ingredients, and directions for you to review before saving.</p>
            {previewing && <div className="preview-note"><Check /><span><strong>Preview ready</strong>Backend parsing will be connected after the GUI review.</span></div>}
            <button className="primary-button full-width" type="button" disabled={!url} onClick={() => setPreviewing(true)}>Preview import <ChevronRight /></button>
            <button className="secondary-button full-width" type="button" onClick={() => { window.location.href = "/import"; }}><FileUp /> Import CSV</button>
          </div>
        ) : (
          <form className="manual-form" onSubmit={submitManual}>
            <label>Recipe title<input name="title" required placeholder="Grandma’s enchiladas" /></label>
            <label>Description<input name="description" placeholder="What makes this recipe special?" /></label>
            <div className="form-grid"><label>Makes<input name="yield" placeholder="6 servings" /></label><label>Category<input value="Family recipe" readOnly /></label></div>
            <label>Ingredients<textarea name="ingredients" rows={5} placeholder={"1 cup flour\n2 eggs\n1/2 tsp salt"} /></label>
            <label>Directions<textarea name="steps" rows={5} placeholder={"Prepare the ingredients\nCombine and cook\nServe warm"} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button full-width" type="submit" disabled={saving}><Plus /> {saving ? "Saving…" : "Add recipe"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
