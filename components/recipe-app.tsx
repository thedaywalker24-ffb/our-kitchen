"use client";

import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
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
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  UserRound,
  Unlink,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { type Recipe, recipes as previewRecipes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";

type View = "recipes" | "favorites";
type DisplayMode = "grid" | "list";
type SortMode = "recent" | "name" | "time";

function durationMinutes(value: string) {
  const normalized = value.toLocaleLowerCase();
  const days = normalized.match(/(\d+(?:\.\d+)?)\s*(?:day|days)\b/);
  const hours = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const minutes = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (!days && !hours && !minutes) return null;
  return (Number(days?.[1] ?? 0) * 1440) + (Number(hours?.[1] ?? 0) * 60) + Number(minutes?.[1] ?? 0);
}

export function RecipeApp({
  householdId,
  householdName = "Williamson home",
  initialFavoriteIds,
  initialRecipeData = previewRecipes,
  initialSelectedId,
  userEmail = "Williamson home",
  userId,
}: {
  householdId?: string;
  householdName?: string;
  initialFavoriteIds?: string[];
  initialRecipeData?: Recipe[];
  initialSelectedId?: string;
  userEmail?: string;
  userId?: string;
}) {
  const router = useRouter();
  const [recipes, setRecipes] = useState(initialRecipeData);
  const [view, setView] = useState<View>("recipes");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>(initialFavoriteIds ?? ["1001", "1003"]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [maxTotalMinutes, setMaxTotalMinutes] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [selected, setSelected] = useState<Recipe | null>(() => initialRecipeData.find((recipe) => recipe.id === initialSelectedId) ?? null);
  const [cooking, setCooking] = useState<Recipe | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [sharing, setSharing] = useState<Recipe | null>(null);
  const [planning, setPlanning] = useState<Recipe | null>(null);
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

  async function updateRecipe(recipe: Recipe) {
    if (householdId) {
      const supabase = createClient();
      const { error } = await supabase
        .from("recipes")
        .update({
          title: recipe.title,
          description: recipe.description,
          yield_text: recipe.yield === "Not specified" ? "" : recipe.yield,
          active_time: recipe.active === "Not specified" ? "" : recipe.active,
          total_time: recipe.total === "Not specified" ? "" : recipe.total,
          ingredients: recipe.ingredients,
          instructions: recipe.steps,
          source: recipe.source,
          source_url: recipe.sourceUrl || null,
          notes: recipe.notes || "",
          image_url: /^https?:\/\//i.test(recipe.image) ? recipe.image : null,
          categories: recipe.categories,
        })
        .eq("id", recipe.id)
        .eq("household_id", householdId);

      if (error) return error.message;
    }

    setRecipes((current) => current.map((item) => item.id === recipe.id ? recipe : item));
    setSelected(recipe);
    setEditing(null);
  }

  async function getShareUrl(recipeId: string) {
    if (!householdId) return `${window.location.origin}/recipes/${recipeId}`;

    const supabase = createClient();
    const { data: existing, error: findError } = await supabase
      .from("recipe_shares")
      .select("token")
      .eq("recipe_id", recipeId)
      .maybeSingle();

    if (findError) throw new Error(findError.message);
    let token = existing?.token as string | undefined;

    if (!token) {
      const { data, error } = await supabase
        .from("recipe_shares")
        .insert({ recipe_id: recipeId })
        .select("token")
        .single();
      if (error) throw new Error(error.message);
      token = data.token as string;
    }

    return `${window.location.origin}/share/${token}`;
  }

  async function disableShare(recipeId: string) {
    if (!householdId) return;
    const supabase = createClient();
    const { error } = await supabase.from("recipe_shares").delete().eq("recipe_id", recipeId);
    if (error) throw new Error(error.message);
  }

  function closeSelected() {
    setSelected(null);
    if (initialSelectedId) router.replace("/");
  }

  const filteredRecipes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const matches = recipes.filter((recipe) => {
      const matchesView = view === "recipes" || favorites.includes(recipe.id);
      const matchesCategory = category === "All" || recipe.categories.includes(category);
      const totalMinutes = durationMinutes(recipe.total);
      const matchesTime = maxTotalMinutes === null || (totalMinutes !== null && totalMinutes <= maxTotalMinutes);
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.source,
        ...recipe.categories,
        ...recipe.ingredients.flatMap((section) => section.items),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchesView && matchesCategory && matchesTime && (!term || haystack.includes(term));
    });

    return matches.sort((a, b) => {
      if (sortMode === "name") return a.title.localeCompare(b.title);
      if (sortMode === "time") {
        const aTime = durationMinutes(a.total) ?? Number.POSITIVE_INFINITY;
        const bTime = durationMinutes(b.total) ?? Number.POSITIVE_INFINITY;
        return aTime - bTime || a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [category, favorites, maxTotalMinutes, recipes, search, sortMode, view]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(recipes.flatMap((recipe) => recipe.categories));
    return ["All", ...Array.from(categories).sort((a, b) => a.localeCompare(b))];
  }, [recipes]);

  const visibleRecipes = filteredRecipes.slice(0, visibleCount);
  const categoryCount = new Set(recipes.flatMap((recipe) => recipe.categories)).size;
  const activeFilterCount = Number(category !== "All") + Number(maxTotalMinutes !== null) + Number(sortMode !== "recent");

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
          <button className={activeFilterCount ? "filter-button active" : "filter-button"} type="button" onClick={() => setFilterOpen(true)} aria-label={activeFilterCount ? `Filter recipes, ${activeFilterCount} active` : "Filter recipes"}>
            <SlidersHorizontal />
            {activeFilterCount > 0 && <span aria-hidden="true">{activeFilterCount}</span>}
          </button>
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
          onClose={closeSelected}
          onEdit={() => setEditing(selected)}
          onFavorite={() => toggleFavorite(selected.id)}
          onPlan={() => setPlanning(selected)}
          onShare={() => setSharing(selected)}
          onCook={() => { setSelected(null); setCooking(selected); }}
        />
      )}
      {cooking && <CookingMode recipe={cooking} onClose={() => setCooking(null)} />}
      {addOpen && <AddRecipe onClose={() => setAddOpen(false)} onAdd={addRecipe} />}
      {editing && <EditRecipe recipe={editing} onClose={() => setEditing(null)} onSave={updateRecipe} />}
      {sharing && <ShareRecipe recipe={sharing} onClose={() => setSharing(null)} onDisable={disableShare} onGetUrl={getShareUrl} />}
      {planning && <PlanMeal recipe={planning} onClose={() => setPlanning(null)} onGetUrl={getShareUrl} />}
      {filterOpen && (
        <RecipeFilters
          categories={categoryOptions}
          category={category}
          maxTotalMinutes={maxTotalMinutes}
          sortMode={sortMode}
          onClose={() => setFilterOpen(false)}
          onApply={(nextCategory, nextMaxTime, nextSort) => {
            setCategory(nextCategory);
            setMaxTotalMinutes(nextMaxTime);
            setSortMode(nextSort);
            setVisibleCount(24);
            setFilterOpen(false);
          }}
        />
      )}
    </main>
  );
}

function RecipeFilters({ categories, category, maxTotalMinutes, sortMode, onApply, onClose }: { categories: string[]; category: string; maxTotalMinutes: number | null; sortMode: SortMode; onApply: (category: string, maxTime: number | null, sort: SortMode) => void; onClose: () => void }) {
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftMaxTime, setDraftMaxTime] = useState(maxTotalMinutes === null ? "" : String(maxTotalMinutes));
  const [draftSort, setDraftSort] = useState<SortMode>(sortMode);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draftCategory, draftMaxTime ? Number(draftMaxTime) : null, draftSort);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="add-modal filter-modal" role="dialog" aria-modal="true" aria-label="Filter recipes">
        <div className="modal-header"><div><p className="eyebrow">Refine the library</p><h2>Filters</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        <form className="manual-form filter-form" onSubmit={submit}>
          <label>Category<select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}>{categories.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Maximum total time<select value={draftMaxTime} onChange={(event) => setDraftMaxTime(event.target.value)}><option value="">Any length</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option></select></label>
          <label>Sort by<select value={draftSort} onChange={(event) => setDraftSort(event.target.value as SortMode)}><option value="recent">Recently added</option><option value="name">Name A–Z</option><option value="time">Fastest first</option></select></label>
          <div className="action-buttons filter-actions">
            <button className="secondary-button" type="button" onClick={() => onApply("All", null, "recent")}>Reset</button>
            <button className="primary-button" type="submit"><SlidersHorizontal /> Show recipes</button>
          </div>
        </form>
      </section>
    </div>
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

function RecipeDetail({ recipe, favorite, onClose, onEdit, onFavorite, onPlan, onShare, onCook }: { recipe: Recipe; favorite: boolean; onClose: () => void; onEdit: () => void; onFavorite: () => void; onPlan: () => void; onShare: () => void; onCook: () => void }) {
  const [servings, setServings] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="layer recipe-layer" role="dialog" aria-modal="true" aria-label={recipe.title}>
      <div className="detail-topbar">
        <button className="icon-button light" type="button" onClick={onClose} aria-label="Back to recipes"><ArrowLeft /></button>
        <div className="detail-actions">
          <button className={favorite ? "icon-button light favorite-active" : "icon-button light"} type="button" onClick={onFavorite} aria-label="Toggle favorite"><Heart fill={favorite ? "currentColor" : "none"} /></button>
          <button className="icon-button light" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="More options" aria-haspopup="menu" aria-expanded={menuOpen}><MoreHorizontal /></button>
          {menuOpen && (
            <div className="detail-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil /> Edit recipe</button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onShare(); }}><Share2 /> Share recipe</button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onPlan(); }}><CalendarPlus /> Plan meal</button>
            </div>
          )}
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

function formatIngredients(sections: Recipe["ingredients"]) {
  return sections.flatMap((section) => [
    ...(section.section ? [`[${section.section}]`] : []),
    ...section.items,
  ]).join("\n");
}

function parseIngredients(value: string): Recipe["ingredients"] {
  const sections: Recipe["ingredients"] = [];

  for (const line of value.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const heading = line.match(/^\[(.+)]$/);
    if (heading) {
      sections.push({ section: heading[1].trim(), items: [] });
      continue;
    }

    if (!sections.length) {
      sections.push({ items: [] });
    }
    sections.at(-1)?.items.push(line);
  }

  return sections.filter((section) => section.items.length);
}

function EditRecipe({ recipe, onClose, onSave }: { recipe: Recipe; onClose: () => void; onSave: (recipe: Recipe) => Promise<string | undefined> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const image = String(form.get("image") || "").trim();
    const sourceUrl = String(form.get("sourceUrl") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const ingredients = parseIngredients(String(form.get("ingredients") || ""));
    const steps = String(form.get("steps") || "").split("\n").map((step) => step.trim()).filter(Boolean);
    const categories = String(form.get("categories") || "").split(",").map((category) => category.trim()).filter(Boolean);

    const saveError = await onSave({
      ...recipe,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim(),
      image: image || "/images/roast-chicken.jpg",
      source: String(form.get("source") || "").trim() || "Our Kitchen",
      sourceUrl: sourceUrl || undefined,
      yield: String(form.get("yield") || "").trim() || "Not specified",
      active: String(form.get("active") || "").trim() || "Not specified",
      total: String(form.get("total") || "").trim() || "Not specified",
      categories: categories.length ? categories : ["Uncategorized"],
      ingredients,
      steps,
      notes: notes || undefined,
    });

    if (saveError) {
      setError(saveError);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="add-modal edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${recipe.title}`}>
        <div className="modal-header"><div><p className="eyebrow">Recipe details</p><h2>Edit recipe</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        <form className="manual-form edit-form" onSubmit={submit}>
          <label>Recipe title<input name="title" required defaultValue={recipe.title} /></label>
          <label>Description<textarea name="description" rows={3} defaultValue={recipe.description} /></label>
          <div className="form-grid"><label>Makes<input name="yield" defaultValue={recipe.yield === "Not specified" ? "" : recipe.yield} /></label><label>Prep time<input name="active" defaultValue={recipe.active === "Not specified" ? "" : recipe.active} /></label></div>
          <div className="form-grid"><label>Total time<input name="total" defaultValue={recipe.total === "Not specified" ? "" : recipe.total} /></label><label>Categories<input name="categories" defaultValue={recipe.categories.join(", ")} /></label></div>
          <label>Source<input name="source" defaultValue={recipe.source} /></label>
          <label>Source URL<input name="sourceUrl" type="url" inputMode="url" defaultValue={recipe.sourceUrl || ""} /></label>
          <label>Image URL<input name="image" type="url" inputMode="url" defaultValue={/^https?:\/\//i.test(recipe.image) ? recipe.image : ""} /></label>
          <label>Ingredients<textarea name="ingredients" aria-label="Ingredients" required rows={8} defaultValue={formatIngredients(recipe.ingredients)} /></label>
          <label>Directions<textarea name="steps" aria-label="Directions" required rows={8} defaultValue={recipe.steps.join("\n")} /></label>
          <label>Notes<textarea name="notes" rows={3} defaultValue={recipe.notes || ""} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button full-width" type="submit" disabled={saving}><Check /> {saving ? "Saving…" : "Save changes"}</button>
        </form>
      </section>
    </div>
  );
}

function ShareRecipe({ recipe, onClose, onDisable, onGetUrl }: { recipe: Recipe; onClose: () => void; onDisable: (recipeId: string) => Promise<void>; onGetUrl: (recipeId: string) => Promise<string> }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Preparing link…");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    onGetUrl(recipe.id)
      .then((shareUrl) => {
        if (!active) return;
        setUrl(shareUrl);
        setStatus("");
      })
      .catch((shareError: unknown) => {
        if (!active) return;
        setStatus(shareError instanceof Error ? shareError.message : "Could not create the sharing link.");
      });
    return () => { active = false; };
  }, [onGetUrl, recipe.id]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied.");
  }

  async function shareLink() {
    if (!("share" in navigator)) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({ title: recipe.title, text: `Try this recipe: ${recipe.title}`, url });
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === "AbortError")) {
        setStatus("The share sheet could not be opened. You can copy the link instead.");
      }
    }
  }

  async function disableLink() {
    setWorking(true);
    try {
      await onDisable(recipe.id);
      setUrl("");
      setStatus("Public link disabled.");
    } catch (disableError) {
      setStatus(disableError instanceof Error ? disableError.message : "Could not disable the sharing link.");
      setWorking(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="add-modal action-modal" role="dialog" aria-modal="true" aria-label={`Share ${recipe.title}`}>
        <div className="modal-header"><div><p className="eyebrow">Public recipe link</p><h2>Share recipe</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        <p className="action-intro">Anyone with this link can view this recipe. Your cookbook and account stay private.</p>
        {url && <input className="share-link" aria-label="Public recipe link" value={url} readOnly />}
        <p className={status.includes("Could not") ? "form-error action-status" : "action-status"} aria-live="polite">{status}</p>
        <div className="action-buttons">
          <button className="primary-button" type="button" disabled={!url || working} onClick={shareLink}><Share2 /> Share</button>
          <button className="secondary-button" type="button" disabled={!url || working} onClick={copyLink}><Copy /> Copy link</button>
        </div>
        <button className="text-danger" type="button" disabled={!url || working} onClick={disableLink}><Unlink /> Disable public link</button>
      </section>
    </div>
  );
}

function compactDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function calendarDates(date: string, time: string) {
  const start = new Date(`${date}T${time || "00:00"}:00`);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (time ? 60 : 24 * 60));
  if (!time) return { google: `${compactDate(start)}/${compactDate(end)}`, ics: `DTSTART;VALUE=DATE:${compactDate(start)}\r\nDTEND;VALUE=DATE:${compactDate(end)}` };
  const clock = (value: Date) => `${compactDate(value)}T${String(value.getHours()).padStart(2, "0")}${String(value.getMinutes()).padStart(2, "0")}00`;
  return { google: `${clock(start)}/${clock(end)}`, ics: `DTSTART:${clock(start)}\r\nDTEND:${clock(end)}` };
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function PlanMeal({ recipe, onClose, onGetUrl }: { recipe: Recipe; onClose: () => void; onGetUrl: (recipeId: string) => Promise<string> }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`);
  const [time, setTime] = useState("18:00");
  const [servings, setServings] = useState(recipe.yield === "Not specified" ? "" : recipe.yield);
  const [note, setNote] = useState("");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [linkStatus, setLinkStatus] = useState("Preparing recipe link…");

  useEffect(() => {
    let active = true;
    onGetUrl(recipe.id)
      .then((url) => {
        if (!active) return;
        setRecipeUrl(url);
        setLinkStatus("");
      })
      .catch((linkError: unknown) => {
        if (!active) return;
        setLinkStatus(linkError instanceof Error ? linkError.message : "Could not prepare the recipe link.");
      });
    return () => { active = false; };
  }, [onGetUrl, recipe.id]);

  function eventDetails() {
    return [`Recipe: ${recipeUrl}`, servings ? `Servings: ${servings}` : "", note].filter(Boolean).join("\n");
  }

  function downloadCalendar() {
    const dates = calendarDates(date, time);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const contents = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Our Kitchen//Meal Plan//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@our-kitchen`,
      `DTSTAMP:${stamp}`,
      dates.ics,
      `SUMMARY:${escapeCalendarText(recipe.title)}`,
      `DESCRIPTION:${escapeCalendarText(eventDetails())}`,
      `URL:${recipeUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const href = URL.createObjectURL(new Blob([contents], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `${recipe.title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "meal"}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  function openGoogleCalendar() {
    const dates = calendarDates(date, time);
    const query = new URLSearchParams({
      action: "TEMPLATE",
      text: recipe.title,
      dates: dates.google,
      details: eventDetails(),
      location: "Our Kitchen",
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    window.open(`https://calendar.google.com/calendar/render?${query}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="add-modal action-modal" role="dialog" aria-modal="true" aria-label={`Plan ${recipe.title}`}>
        <div className="modal-header"><div><p className="eyebrow">Meal calendar</p><h2>Plan this meal</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        <p className="action-recipe-name">{recipe.title}</p>
        <div className="manual-form">
          <div className="form-grid"><label>Date<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
          <label>Servings<input value={servings} onChange={(event) => setServings(event.target.value)} /></label>
          <label>Note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>
        <p className={linkStatus && linkStatus !== "Preparing recipe link…" ? "form-error action-status" : "action-status"} aria-live="polite">{linkStatus}</p>
        <div className="action-buttons calendar-buttons">
          <button className="primary-button" type="button" disabled={!date || !recipeUrl} onClick={downloadCalendar}><Download /> Add to calendar</button>
          <button className="secondary-button" type="button" disabled={!date || !recipeUrl} onClick={openGoogleCalendar}><CalendarPlus /> Google Calendar</button>
        </div>
      </section>
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
