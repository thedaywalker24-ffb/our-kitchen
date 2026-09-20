# Our Kitchen

A mobile-first family recipe app intended to replace Pepperplate. The current
version is an interactive frontend prototype for reviewing the core experience
before authentication, cloud storage, and the full spreadsheet migration are
connected.

## What works

- Search recipes by title, category, source, or ingredient.
- Browse categories and a favorites-only view.
- Open a recipe, check off ingredients, and scale the serving multiplier.
- Follow large, step-by-step directions in cooking mode.
- Keep the screen awake during cooking where the browser permits it.
- Add a recipe manually and preview the future URL-import workflow.
- Install the app from a mobile browser using its web app manifest.

Favorites and recipes added in the prototype are stored only in the current
browser session or local storage. They are not synced yet.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npm run lint
npm run build
npm run test:e2e
```

## Architecture

- **Next.js + React + TypeScript:** responsive web app and installable PWA.
- **GitHub:** source control and code review once this directory is attached to
  a repository.
- **Vercel:** planned free-tier hosting for the Next.js frontend and server
  functions.
- **Supabase:** planned free-tier authentication, PostgreSQL recipe storage,
  household sharing, and image storage.
- **Google Sheets:** migration source and optional backup/export, not the live
  multi-user database.

No Vercel or Supabase account is required to review the local prototype.

## Recipe migration

The source spreadsheet contains 1,359 rows. The current audit found 1,353
import-ready recipes, 6 rows without titles that need review, and 70 duplicate
title groups. Generated recipe data stays in the ignored `data/` directory so
it cannot be published accidentally.

The existing `scripts/prepare_recipesage_import.py` script and RecipeSage CSV
files are retained as a migration fallback. The next migration step is to add a
direct, idempotent Sheet-to-Supabase importer with duplicate review before any
production data is written.

## Next milestones

1. Review and adjust the frontend on phone and desktop.
2. Create the Supabase project and apply the database schema and access rules.
3. Add separate sign-ins with one shared household library.
4. Import the reviewed Google Sheet data and its images.
5. Implement real URL import using recipe-page JSON-LD, with a review screen.
6. Deploy a private preview to Vercel, test on Android and iPhone, then publish.
