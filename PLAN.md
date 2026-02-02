# MenuMaker Plan

## Goal
Build an app that creates a weekly menu using seasonal timing, variety, and ingredient overlap to reduce waste.

## Plan
- [x] Inventory existing data: identify menu note formats, recipe sources, and links.
- [x] Parse/ingest data: extract dated menus, recipes, and links into a structured dataset.
- [ ] Model seasonality: define seasonal tags or month-based availability for ingredients/recipes.
- [ ] Menu generator: implement scoring for variety + overlap + seasonality.
- [ ] UI/UX: create a basic interface to generate, review, and adjust weekly menus.
- [ ] Iterate: add feedback loop and tuning for preferences and constraints.
- [ ] Optional enhancements: see Possibilities.

## Possibilities
- Auto-sync `data/*.json` into `app/public/data` when running extraction.
- Add filters (season, source, completion) and a global search bar.
- Match menu items to recipes (fuzzy match + normalization).
- Extract ingredients from recipes for overlap/waste reduction.
- GitHub Pages deploy (already set up) and add a README deploy badge/link.
- Evaluate form factor: web app interface hosted on GitHub Pages vs local-only desktop-first.
- Menu generation approach: rule-based algorithm vs LLM-assisted planning.
- Explore local LLM hosting options for offline generation (e.g., running a local model).
- Add “new ideas” pipeline: search favorite food blogs for fresh rotations.
- Clarify hosting costs: free GitHub Pages for static UI vs paid services for server/LLM.
- Build a grocery list generator and export format optimized for Kroger/manual entry.
- Add periodic recipe updates via scraping or imports to keep the library fresh.
- Add a “Sources” view that groups menu items by website domain.

## Required Tasks
- Define the target form factor (web-only, desktop-first web, or native wrapper).
- Choose the menu generation strategy (algorithmic, LLM, or hybrid).
- Decide whether any server-side components are needed (affects hosting/cost).
- Define data inputs for seasonality, variety, and ingredient overlap.
- Gather recipe data (export notes or set up scrapers for favorite blogs).
- Categorize recipes by season, ingredients, and preferences.
- Design front-end UX for: select week → generate menu → generate grocery list.
- Define grocery list formatting for store entry (Kroger or similar).
- Plan for periodic recipe updates/refresh cadence.
- Integrate local LLM calls into the app for menu generation.
- Add ingredient overlap checks to reduce waste.
- Test the full flow end-to-end and refine based on real weekly use.

## Progress Log
- 2026-01-31: Created initial plan.
- 2026-01-31: Scanned `Menus/` and `Recipes/` to understand formats and assets.
- 2026-01-31: Added menu extraction script and generated `data/menus.json`.
- 2026-01-31: Extended extraction to include links and recipes in `data/recipes.json`.
- 2026-01-31: Scaffolded Vite + React + TypeScript app and built initial menus browser UI.
