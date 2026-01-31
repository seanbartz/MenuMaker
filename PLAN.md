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

## Progress Log
- 2026-01-31: Created initial plan.
- 2026-01-31: Scanned `Menus/` and `Recipes/` to understand formats and assets.
- 2026-01-31: Added menu extraction script and generated `data/menus.json`.
- 2026-01-31: Extended extraction to include links and recipes in `data/recipes.json`.
- 2026-01-31: Scaffolded Vite + React + TypeScript app and built initial menus browser UI.
