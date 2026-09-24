import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("private household sign-in is available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-login.png", fullPage: true });
});

test("recipe library requires a signed-in household member", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("permanent recipe links require a signed-in household member", async ({ page }) => {
  await page.goto("/recipes/1001");
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile recipe and cooking flows are usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");

  await expect(page.getByRole("heading", { name: "What are we cooking?" })).toBeVisible();
  await expect(page.locator(".recipe-card")).toHaveCount(6);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.locator(".recipe-grid")).toHaveClass(/list-view/);
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-list.png", fullPage: true });
  await page.getByRole("button", { name: "Grid view" }).click();

  await page.getByLabel("Open Oven-Roasted Whole Chicken").click();
  const recipeDialog = page.getByRole("dialog", { name: "Oven-Roasted Whole Chicken" });
  await expect(recipeDialog.getByRole("heading", { name: "Oven-Roasted Whole Chicken" })).toBeVisible();
  await expect(recipeDialog.locator(".direction-row")).toHaveCount(5);
  await expect(recipeDialog.locator(".direction-row").last()).toContainText("rest 10–15 minutes before carving");
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-detail.png", fullPage: true });

  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Show ingredients" }).click();
  await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-cooking.png", fullPage: true });
});

test("recipe options can edit an existing recipe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");

  await page.getByLabel("Open Oven-Roasted Whole Chicken").click();
  await page.getByRole("button", { name: "More options" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Edit recipe" }).click();

  const editDialog = page.getByRole("dialog", { name: "Edit Oven-Roasted Whole Chicken" });
  await expect(editDialog.getByLabel("Recipe title")).toHaveValue("Oven-Roasted Whole Chicken");
  await expect(editDialog.getByLabel("Ingredients", { exact: true })).toHaveValue(/1 whole chicken/);
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-editor.png" });
  await editDialog.getByLabel("Recipe title").fill("Sunday Roast Chicken");
  await editDialog.getByRole("button", { name: "Save changes" }).click();

  const updatedRecipe = page.getByRole("dialog", { name: "Sunday Roast Chicken" });
  await expect(updatedRecipe.getByRole("heading", { name: "Sunday Roast Chicken" })).toBeVisible();
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-edited.png", fullPage: true });
});

test("recipe options support sharing and meal planning", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");
  await page.getByLabel("Open Oven-Roasted Whole Chicken").click();

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Share recipe" }).click();
  const shareDialog = page.getByRole("dialog", { name: "Share Oven-Roasted Whole Chicken" });
  await expect(shareDialog.getByLabel("Public recipe link")).toHaveValue(/\/recipes\/1001$/);
  await shareDialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Plan meal" }).click();
  const planDialog = page.getByRole("dialog", { name: "Plan Oven-Roasted Whole Chicken" });
  await expect(planDialog.getByLabel("Date")).not.toHaveValue("");
  await expect(planDialog.getByLabel("Time")).toHaveValue("18:00");
  const downloadPromise = page.waitForEvent("download");
  await planDialog.getByRole("button", { name: "Add to calendar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("oven-roasted-whole-chicken.ics");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const calendar = await readFile(downloadPath as string, "utf8");
  expect(calendar).toContain("BEGIN:VCALENDAR");
  expect(calendar).toContain("URL:http://127.0.0.1:3000/recipes/1001");
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-plan-meal.png" });
});

test("recipe filters apply category, total time, and sort order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");

  await page.getByRole("button", { name: "Filter recipes" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filter recipes" });
  await filterDialog.getByLabel("Category").selectOption("Chicken");
  await filterDialog.getByLabel("Maximum total time").selectOption("60");
  await filterDialog.getByLabel("Sort by").selectOption("name");
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-filter-sheet.png" });
  await filterDialog.getByRole("button", { name: "Show recipes" }).click();

  await expect(page.locator(".recipe-card")).toHaveCount(2);
  await expect(page.locator(".recipe-card h3").first()).toHaveText("Chicken Cobbler Pot Pie");
  await expect(page.getByRole("button", { name: "Filter recipes, 3 active" })).toBeVisible();

  await page.getByRole("button", { name: "Filter recipes, 3 active" }).click();
  await page.getByRole("dialog", { name: "Filter recipes" }).getByRole("button", { name: "Reset" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Filter recipes" })).toBeVisible();
  await page.screenshot({ path: "/tmp/our-kitchen-mobile-filters.png", fullPage: true });
});

test("desktop library filters and add flow work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/preview");

  await expect(page.getByRole("complementary")).toBeVisible();
  await page.getByLabel("Search recipes or ingredients").fill("pistachio");
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  await page.getByLabel("Clear search").click();

  await page.getByRole("button", { name: "Add recipe" }).click();
  const addDialog = page.getByRole("dialog", { name: "Add recipe" });
  await addDialog.getByRole("button", { name: "Enter manually" }).click();
  await addDialog.getByLabel("Recipe title").fill("Test Kitchen Soup");
  await addDialog.getByLabel("Ingredients", { exact: true }).fill("1 onion\n2 cups stock");
  await addDialog.getByLabel("Directions", { exact: true }).fill("Chop onion\nSimmer with stock");
  await addDialog.getByRole("button", { name: "Add recipe", exact: true }).click();
  const savedRecipe = page.getByRole("dialog", { name: "Test Kitchen Soup" });
  await expect(savedRecipe.getByRole("heading", { name: "Test Kitchen Soup" })).toBeVisible();
  await page.getByRole("button", { name: "Back to recipes" }).click();
  await page.screenshot({ path: "/tmp/our-kitchen-desktop.png", fullPage: true });
});
