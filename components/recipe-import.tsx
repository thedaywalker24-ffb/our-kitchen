"use client";

import { ArrowLeft, CheckCircle2, FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CsvRecipe = {
  title?: string;
  description?: string;
  yield?: string;
  "active time"?: string;
  "total time"?: string;
  ingredients?: string;
  instructions?: string;
  url?: string;
  source?: string;
  notes?: string;
  "image url"?: string;
  labels?: string;
  rating?: string;
};

type ImportRecipe = {
  household_id: string;
  legacy_recipe_id: string;
  title: string;
  description: string;
  yield_text: string;
  active_time: string;
  total_time: string;
  ingredients: { section?: string; items: string[] }[];
  instructions: string[];
  source: string;
  source_url: string | null;
  notes: string;
  image_url: string | null;
  categories: string[];
  rating: number | null;
};

function lines(value = "") {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function ingredientSections(value = "") {
  const sections: ImportRecipe["ingredients"] = [];
  let current: ImportRecipe["ingredients"][number] = { items: [] };

  for (const line of lines(value)) {
    if (/^#{1,3}\s+/.test(line)) {
      if (current.items.length) sections.push(current);
      current = { section: line.replace(/^#{1,3}\s+/, ""), items: [] };
    } else {
      current.items.push(line);
    }
  }

  if (current.items.length || current.section) sections.push(current);
  return sections.length ? sections : [{ items: [] }];
}

function categories(value = "") {
  return Array.from(new Set(value.split(/[,;\n]/).map((label) => label.trim()).filter(Boolean)));
}

function optionalUrl(value = "") {
  const normalized = value.trim();
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

function parseRating(value = "") {
  const rating = Number.parseFloat(value);
  return Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null;
}

export function RecipeImport({ householdId, householdName }: { householdId: string; householdName: string }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<ImportRecipe[]>([]);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "ready" | "importing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");

  function chooseFile(file: File | undefined) {
    if (!file) return;
    setStatus("idle");
    setMessage("");
    setFileName(file.name);

    Papa.parse<CsvRecipe>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.replace(/^\uFEFF/, "").trim().toLocaleLowerCase(),
      complete(result) {
        const mapped = result.data.flatMap((row, index) => {
          const title = row.title?.trim();
          if (!title) return [];
          return [{
            household_id: householdId,
            legacy_recipe_id: `sheet-${index + 2}`,
            title,
            description: row.description?.trim() || "",
            yield_text: row.yield?.trim() || "",
            active_time: row["active time"]?.trim() || "",
            total_time: row["total time"]?.trim() || "",
            ingredients: ingredientSections(row.ingredients),
            instructions: lines(row.instructions),
            source: row.source?.trim() || "",
            source_url: optionalUrl(row.url),
            notes: row.notes?.trim() || "",
            image_url: optionalUrl(row["image url"]),
            categories: categories(row.labels),
            rating: parseRating(row.rating),
          }];
        });

        if (result.errors.length || mapped.length === 0) {
          setRecipes([]);
          setStatus("error");
          setMessage(result.errors[0]?.message || "No titled recipes were found in this file.");
          return;
        }

        setRecipes(mapped);
        setStatus("ready");
      },
      error(error) {
        setStatus("error");
        setMessage(error.message);
      },
    });
  }

  async function importRecipes() {
    setStatus("importing");
    setMessage("");
    setProgress(0);
    const supabase = createClient();
    const batchSize = 100;

    for (let index = 0; index < recipes.length; index += batchSize) {
      const batch = recipes.slice(index, index + batchSize);
      const { error } = await supabase.from("recipes").upsert(batch, {
        onConflict: "household_id,legacy_recipe_id",
      });

      if (error) {
        setStatus("error");
        setMessage(`Import stopped after ${index.toLocaleString()} recipes: ${error.message}`);
        return;
      }

      setProgress(Math.min(index + batch.length, recipes.length));
    }

    setStatus("complete");
    router.refresh();
  }

  return (
    <main className="import-page">
      <section className="import-tool" aria-labelledby="import-heading">
        <button className="back-link" type="button" onClick={() => router.push("/")}><ArrowLeft /> Back to recipes</button>
        <p className="eyebrow">{householdName}</p>
        <h1 id="import-heading">Import recipes</h1>
        <p className="import-intro">Choose the prepared recipe CSV. Re-importing the same file updates its rows instead of creating duplicates.</p>

        <label className="file-picker">
          <FileText />
          <span><strong>{fileName || "Choose recipe CSV"}</strong><small>CSV files up to 10 MB</small></span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0])} />
        </label>

        {status === "ready" && (
          <div className="import-summary" aria-live="polite">
            <CheckCircle2 />
            <span><strong>{recipes.length.toLocaleString()} recipes ready</strong><small>Existing spreadsheet rows will be updated safely.</small></span>
          </div>
        )}

        {status === "importing" && (
          <div className="import-progress" aria-live="polite">
            <div><span>Importing recipes</span><strong>{progress.toLocaleString()} / {recipes.length.toLocaleString()}</strong></div>
            <progress value={progress} max={recipes.length} />
          </div>
        )}

        {status === "error" && <p className="form-error" role="alert">{message}</p>}

        {status === "complete" ? (
          <button className="primary-button full-width" type="button" onClick={() => router.push("/")}><CheckCircle2 /> Open recipe library</button>
        ) : (
          <button className="primary-button full-width" type="button" disabled={status !== "ready"} onClick={importRecipes}><Upload /> Import {recipes.length ? recipes.length.toLocaleString() : ""} recipes</button>
        )}
      </section>
    </main>
  );
}
