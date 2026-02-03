# MenuMaker - Copilot Coding Agent Instructions

## Repository Overview

MenuMaker is a web application that creates weekly menus using seasonal timing, variety, and ingredient overlap to reduce waste. The app helps organize recipes and menus with an automated extraction and presentation system.

**Repository Type:** Web application (React + TypeScript + Vite)
**Primary Languages:** TypeScript (frontend), Python (data processing scripts)
**Size:** Medium (~3500+ lines of recipes/menus data, structured app with scripts)

## Technology Stack

### Frontend Application (`app/` directory)
- **Framework:** React 19.2.0 with TypeScript
- **Build Tool:** Vite 7.2.4
- **Node Version:** 20 (as specified in GitHub Actions)
- **Linting:** ESLint 9.39.1 with TypeScript ESLint
- **Type Checking:** TypeScript 5.9.3

### Data Processing Scripts (`scripts/` directory)
- **Language:** Python 3
- **Dependencies:** Standard library only (json, re, pathlib, datetime, urllib, collections)
- **No external Python packages required**

## Build and Validation Commands

### Frontend Application

**Working Directory:** Always run frontend commands from `/app` directory

1. **Install Dependencies:**
   ```bash
   cd app && npm ci
   ```
   - Always run `npm ci` (not `npm install`) for consistent builds
   - This is the first step before any build/test/lint operation
   - Uses package-lock.json for reproducible installs

2. **Development Server:**
   ```bash
   cd app && npm run dev
   ```
   - Starts Vite dev server with HMR (Hot Module Replacement)
   - Default port: 5173
   - Server stays running; use Ctrl+C to stop

3. **Build for Production:**
   ```bash
   cd app && npm run build
   ```
   - First runs TypeScript compiler (`tsc -b`)
   - Then runs Vite build
   - Output directory: `app/dist`
   - Build time: ~30-60 seconds
   - **Always run this before deploying changes**

4. **Lint:**
   ```bash
   cd app && npm run lint
   ```
   - Runs ESLint on all files
   - No auto-fix option configured; fix issues manually
   - **Always run after making TypeScript/React changes**

5. **Preview Production Build:**
   ```bash
   cd app && npm run preview
   ```
   - Previews the production build locally
   - Must run `npm run build` first

### Python Scripts

Python scripts use only standard library modules and can be run directly:
```bash
python3 scripts/<script_name>.py
```

**Key Scripts:**
- `extract_menus.py` - Extracts dated menus from markdown files into JSON
- `auto_add_links.py` - Adds recipe links to menu items
- `build_menu_items_refactored.py` - Builds structured menu items data
- `build_menu_sources.py` - Groups menu items by source domain
- `normalize_menus.py` - Normalizes menu markdown formatting
- `remove_auto_links.py` - Removes auto-generated links
- `remove_ingredient_links.py` - Cleans ingredient URLs from recipes

No virtual environment or package installation required for Python scripts.

## Project Layout

### Root Directory Structure
```
.github/          - GitHub configuration and workflows
  workflows/      - GitHub Actions CI/CD
    deploy.yml    - Deploys app to GitHub Pages
app/              - React + TypeScript + Vite frontend application
  src/            - Application source code
  public/         - Static assets including data JSON files
  dist/           - Build output (ignored in git)
data/             - Processed JSON data files
  menus.json              - Extracted menu data
  recipes.json            - Recipe metadata
  menu_items_refactored.json  - Structured menu items
  menu_item_sources.json  - Menu sources by domain
Menus/            - Raw markdown menu files (dated)
Recipes/          - Raw markdown recipe files
scripts/          - Python data processing scripts
docs/             - Documentation
PLAN.md           - Project roadmap and progress log
```

### Key Configuration Files
- **Frontend:**
  - `app/package.json` - npm scripts and dependencies
  - `app/vite.config.ts` - Vite build configuration
  - `app/tsconfig.json` - TypeScript configuration (references app & node configs)
  - `app/tsconfig.app.json` - App-specific TypeScript settings
  - `app/tsconfig.node.json` - Node environment TypeScript settings
  - `app/eslint.config.js` - ESLint configuration
- **Git:**
  - `.gitignore` - Excludes `app/dist`, `app/node_modules`, Python cache
  - `app/.gitignore` - Additional frontend ignores

### Data Flow
1. **Source:** Markdown files in `Menus/` and `Recipes/`
2. **Processing:** Python scripts in `scripts/` extract and transform data
3. **Storage:** JSON files in `data/` directory
4. **Application:** Frontend in `app/` reads JSON data from `public/data/` or directly from `data/`

## GitHub Actions Workflow

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Trigger:** Push to `main` branch or manual workflow dispatch

**Jobs:**
1. **build**
   - Checks out code
   - Sets up Node.js 20
   - Caches npm dependencies (uses `app/package-lock.json`)
   - Runs `npm ci` in `app/` directory
   - Runs `npm run build` in `app/` directory
   - Uploads `app/dist` as Pages artifact

2. **deploy**
   - Deploys artifact to GitHub Pages
   - Requires `build` job to complete successfully

**Important:**
- Always test the build locally before pushing to main
- Build failures will prevent deployment
- The workflow uses `npm ci` for reproducible builds

## Development Workflow

### Making Changes to Frontend
1. Navigate to `app/` directory: `cd app`
2. Install dependencies if needed: `npm ci`
3. Make code changes in `app/src/`
4. Test with dev server: `npm run dev`
5. Run linter: `npm run lint` (fix any issues)
6. Build for production: `npm run build` (verify no errors)
7. Commit changes

### Making Changes to Data Processing
1. Modify Python scripts in `scripts/` directory
2. Test script: `python3 scripts/<script_name>.py`
3. Verify output in `data/` directory
4. Commit changes

### Making Changes to Content
1. Edit markdown files in `Menus/` or `Recipes/`
2. Run appropriate extraction script: `python3 scripts/extract_menus.py`
3. Verify generated JSON in `data/`
4. Update app data if needed (copy to `app/public/data/`)
5. Rebuild frontend if data structure changed: `cd app && npm run build`

## Common Issues and Solutions

1. **Build fails with TypeScript errors:**
   - Run `cd app && npm run lint` first to catch issues
   - Check `tsconfig.app.json` and `tsconfig.node.json` for proper configuration
   - Ensure all imports have correct types

2. **Missing npm modules:**
   - Always run `npm ci` from the `app/` directory, not the root
   - Delete `node_modules` and `package-lock.json` and run `npm install` only if absolutely necessary

3. **Python script import errors:**
   - Scripts use relative paths via `Path(__file__).resolve().parents[1]`
   - Always run scripts from repository root: `python3 scripts/<script>.py`

4. **Data not showing in app:**
   - Check if JSON files exist in `data/` directory
   - Verify app is reading from correct path (`public/data/` or `../../data/`)
   - Rebuild app after data changes: `cd app && npm run build`

## Agent Guidance

**Trust these instructions:** These commands have been validated and work correctly. Only search for additional information if these instructions are incomplete or incorrect.

**Before making changes:**
1. Run `cd app && npm run lint` to understand baseline
2. Run `cd app && npm run build` to verify clean build

**After making TypeScript/React changes:**
1. Run `cd app && npm run lint` to catch issues
2. Run `cd app && npm run build` to verify production build
3. Check `app/dist` exists and contains expected files

**After making Python changes:**
1. Test the script: `python3 scripts/<script>.py`
2. Verify output in `data/` directory

**Minimal changes principle:** This repository is well-structured. Make surgical changes rather than refactoring large sections. Preserve existing patterns and conventions.
