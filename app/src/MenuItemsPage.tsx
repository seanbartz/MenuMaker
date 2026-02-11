import { useMemo, useState } from 'react'
import './MenuItemsPage.css'
import type { Menu, MenuItem, RefactoredMenuItem } from './types'

function getSiteName(url: string | null): string {
  if (!url) return 'No link'
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface MenuItemsPageProps {
  items: RefactoredMenuItem[]
  onViewMenus: () => void
  onViewRecipes: () => void
  menus: Menu[]
  onSaveMenu: (menu: Menu, items: RefactoredMenuItem[]) => void
  onAddItem: (item: RefactoredMenuItem) => void
}

export default function MenuItemsPage({
  items,
  onViewMenus,
  onViewRecipes,
  menus,
  onSaveMenu,
  onAddItem,
}: MenuItemsPageProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [proteinFilter, setProteinFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuSelections, setMenuSelections] = useState<RefactoredMenuItem[]>([])
  const [newItemUrl, setNewItemUrl] = useState('')
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [autoAddToMenu, setAutoAddToMenu] = useState(true)
  const [ingredientGrouping, setIngredientGrouping] = useState<'category' | 'menu'>('category')

  function normalizeProtein(value?: string) {
    return (value ?? 'unknown').trim().toLowerCase()
  }

  const sortedItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const filtered = items.filter((item) => {
      if (proteinFilter !== 'all') {
        if (normalizeProtein(item.main_protein) !== proteinFilter) return false
      }
      if (!normalizedQuery) return true
      const haystack = [
        item.link_texts?.[0],
        item.item_texts?.[0],
        ...(item.link_texts ?? []),
        ...(item.item_texts ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
    return [...filtered].sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count
      return (a.link_texts[0] ?? a.item_texts[0] ?? '').localeCompare(
        b.link_texts[0] ?? b.item_texts[0] ?? ''
      )
    })
  }, [items, proteinFilter, searchQuery])

  const proteinOptions = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((item) => {
      const protein = normalizeProtein(item.main_protein)
      counts.set(protein, (counts.get(protein) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([protein, count]) => ({ protein, count }))
  }, [items])

  const selectedItem = sortedItems[selectedIndex] ?? null
  const selectedTitle =
    selectedItem?.link_texts?.[0] ??
    selectedItem?.item_texts?.[0] ??
    'Untitled item'

  function handleFilterChange(value: string) {
    setProteinFilter(value)
    setSelectedIndex(0)
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSelectedIndex(0)
  }

  function handleAddToMenu() {
    if (!selectedItem) return
    setMenuSelections((prev) => [...prev, selectedItem])
  }

  function handleRemoveFromMenu(index: number) {
    setMenuSelections((prev) => prev.filter((_, i) => i !== index))
  }

  function handleClearMenu() {
    setMenuSelections([])
  }

  function formatDateStamp(date = new Date()) {
    const formatted = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return formatted.replace(',', '')
  }

  function formatShortDate(date = new Date()) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = String(date.getFullYear()).slice(-2)
    return `${month}/${day}/${year}`
  }

  function buildMenuMarkdown() {
    const dateStamp = formatShortDate()
    const lines = menuSelections.map((item) => {
      const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
      return `- [ ] ${title}`
    })
    return `# Menu week of ${dateStamp}\n\n${lines.join('\n')}\n`
  }

  function buildIngredientsMarkdown() {
    const dateStamp = formatDateStamp()
    if (ingredientGrouping === 'menu') {
      const content = menuSelections
        .map((item) => {
          const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
          const lines = (item.ingredients ?? [])
            .filter(Boolean)
            .map((ingredient) => `- [ ] ${ingredient}`)
          return `## ${title}\n${lines.length ? lines.join('\n') : '_No ingredients listed._'}`
        })
        .join('\n\n')
      return `# Ingredients - ${dateStamp}\n\n${content}\n`
    }

    const ingredientMap = new Map<string, string>()
    menuSelections.forEach((item) => {
      item.ingredients?.forEach((ingredient) => {
        if (!ingredient) return
        const key = normalizeIngredientKey(ingredient)
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, ingredient)
        }
      })
    })
    const sections: Record<string, string[]> = {
      Produce: [],
      Proteins: [],
      Grains: [],
      'Packaged Items': [],
      Staples: [],
    }

    function classifyIngredient(ingredient: string): keyof typeof sections {
      const text = ingredient.toLowerCase()
      const includesAny = (terms: string[]) => terms.some((term) => text.includes(term))

      if (
        includesAny([
          'apple',
          'avocado',
          'banana',
          'basil',
          'berry',
          'broccoli',
          'cabbage',
          'carrot',
          'celery',
          'cilantro',
          'corn',
          'cucumber',
          'eggplant',
          'garlic',
          'ginger',
          'jalapeno',
          'kale',
          'lemon',
          'lime',
          'lettuce',
          'mushroom',
          'onion',
          'orange',
          'parsley',
          'pepper',
          'potato',
          'shallot',
          'spinach',
          'squash',
          'tomato',
          'zucchini',
        ])
      ) {
        return 'Produce'
      }

      if (
        includesAny([
          'beef',
          'bacon',
          'chicken',
          'pork',
          'ham',
          'turkey',
          'sausage',
          'steak',
          'salmon',
          'tuna',
          'shrimp',
          'scallop',
          'crab',
          'fish',
          'tofu',
          'tempeh',
          'egg',
          'lentil',
          'bean',
          'chickpea',
        ])
      ) {
        return 'Proteins'
      }

      if (
        includesAny([
          'rice',
          'pasta',
          'noodle',
          'quinoa',
          'couscous',
          'barley',
          'bulgur',
          'farro',
          'oat',
          'orzo',
          'polenta',
        ])
      ) {
        return 'Grains'
      }

      if (
        includesAny([
          'cheese',
          'yogurt',
          'cream',
          'milk',
          'butter',
          'broth',
          'stock',
          'salsa',
          'pesto',
          'tortilla',
          'bread',
          'bun',
          'wrap',
          'pita',
          'chips',
          'crouton',
          'canned',
          'jar',
          'frozen',
        ])
      ) {
        return 'Packaged Items'
      }

      return 'Staples'
    }

    Array.from(ingredientMap.values()).forEach((ingredient) => {
      const section = classifyIngredient(ingredient)
      sections[section].push(ingredient)
    })

    const sectionOrder = Object.keys(sections) as (keyof typeof sections)[]
    const content = sectionOrder
      .filter((section) => sections[section].length)
      .map((section) => {
        const lines = sections[section]
          .sort((a, b) => a.localeCompare(b))
          .map((ingredient) => `- [ ] ${ingredient}`)
        return `## ${section}\n${lines.join('\n')}`
      })
      .join('\n\n')

    return `# Ingredients - ${dateStamp}\n\n${content}\n`
  }

  function normalizeIngredientKey(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/\b(tablespoons?)\b/g, 'tablespoon')
      .replace(/\b(teaspoons?)\b/g, 'teaspoon')
      .replace(/\s+/, ' ')
  }

  function downloadMarkdown(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      link.remove()
      URL.revokeObjectURL(url)
    }, 0)
  }

  function buildMenuFile(date: Date) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = String(date.getFullYear()).slice(-2)
    const base = `Menus/Menu week of ${month}-${day}-${year}.md`
    if (!menus.some((menu) => menu.file === base)) {
      return base
    }
    let counter = 2
    while (menus.some((menu) => menu.file === base.replace('.md', `-${counter}.md`))) {
      counter += 1
    }
    return base.replace('.md', `-${counter}.md`)
  }

  function toMenuItem(item: RefactoredMenuItem): MenuItem {
    const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
    const url = item.url ?? null
    return {
      text: title,
      section: null,
      meal_type: 'dinner',
      source_hint: url,
      links: url ? [{ text: title, url }] : [],
      urls: url ? [url] : [],
    }
  }

  function buildNewMenu(date: Date): Menu {
    const file = buildMenuFile(date)
    const weekOf = date.toISOString().slice(0, 10)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = String(date.getFullYear()).slice(-2)
    return {
      file,
      title: `Menu week of ${month}-${day}-${year}`,
      week_of_date: weekOf,
      items: menuSelections.map(toMenuItem),
    }
  }

  function seasonFromWeek(iso: string | null) {
    if (!iso) return null
    const date = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return null
    const month = date.getMonth() + 1
    if (month <= 2 || month === 12) return 'winter'
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    return 'fall'
  }

  function handlePersistMenu() {
    if (!menuSelections.length) return
    const newMenu = buildNewMenu(new Date())
    const selected = new Set(menuSelections)
    const updatedItems = items.map((item) => {
      if (!selected.has(item)) return item
      const menuFiles = Array.from(new Set([...(item.menu_files ?? []), newMenu.file]))
      const menuWeeks = newMenu.week_of_date
        ? Array.from(new Set([...(item.menu_weeks ?? []), newMenu.week_of_date]))
        : item.menu_weeks ?? []
      const season = seasonFromWeek(newMenu.week_of_date)
      const menuSeasons =
        season && season !== ''
          ? Array.from(new Set([...(item.menu_seasons ?? []), season]))
          : item.menu_seasons ?? []
      return {
        ...item,
        menu_files: menuFiles,
        menu_weeks: menuWeeks,
        menu_seasons: menuSeasons,
        count: menuFiles.length || menuWeeks.length || item.count,
      }
    })
    onSaveMenu(newMenu, updatedItems)
  }

  function handleExportMenu() {
    const dateStamp = formatDateStamp().replace(/\s+/g, '-')
    downloadMarkdown(`menu-${dateStamp}.md`, buildMenuMarkdown())
    handlePersistMenu()
  }

  function handleExportIngredients() {
    const dateStamp = formatDateStamp().replace(/\s+/g, '-')
    downloadMarkdown(`ingredients-${dateStamp}.md`, buildIngredientsMarkdown())
  }

  async function handleAddFromUrl() {
    if (!newItemUrl.trim()) return
    setScrapeStatus('loading')
    setScrapeError(null)
    try {
      const mod = await import('@tauri-apps/api/core')
      const invoke = mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      const result = await invoke<{
        title: string
        ingredients: string[]
        tags: string[]
        main_protein: string
      }>('scrape_recipe', { url: newItemUrl.trim() })
      const title = result.title || newItemUrl.trim()
      const newItem: RefactoredMenuItem = {
        url: newItemUrl.trim(),
        urls: [newItemUrl.trim()],
        link_texts: [title],
        item_texts: [title],
        menu_files: [],
        menu_weeks: [],
        menu_seasons: [],
        meal_types: [],
        sections: [],
        source_hints: [newItemUrl.trim()],
        ingredients: result.ingredients ?? [],
        recipe_tags: result.tags ?? [],
        main_protein: result.main_protein || 'unknown',
        count: 0,
      }
      onAddItem(newItem)
      if (autoAddToMenu) {
        setMenuSelections((prev) => [...prev, newItem])
      }
      setNewItemUrl('')
      setScrapeStatus('idle')
    } catch (error) {
      setScrapeStatus('error')
      setScrapeError(error instanceof Error ? error.message : 'Failed to scrape URL')
    }
  }

  return (
    <div className="items-shell">
      <header className="items-header">
        <div>
          <div className="page-actions">
            <button onClick={onViewMenus} className="back-button">
              Menus
            </button>
            <button onClick={onViewRecipes} className="back-button">
              Recipes
            </button>
          </div>
          <h1>Menu Items</h1>
        </div>
        <div className="header-meta">
          <label className="filter-control">
            <select
              value={proteinFilter}
              onChange={(event) => handleFilterChange(event.target.value)}
            >
              <option value="all">All proteins</option>
              {proteinOptions.map(({ protein, count }) => (
                <option key={protein} value={protein}>
                  {protein} ({count})
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            <input
              type="search"
              placeholder="Type to filter..."
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </label>
          <div className="meta-card meta-inline">
            <span>Total Items</span>
            <strong>{sortedItems.length}</strong>
          </div>
        </div>
      </header>

      <main className="items-main">
        <aside className="items-list">
          <div className="list-header">
            <h2>All Items</h2>
          </div>
          <div className="add-item-card">
            <label>
              <span>Add item by URL</span>
              <input
                type="url"
                placeholder="Paste recipe URL..."
                value={newItemUrl}
                onChange={(event) => setNewItemUrl(event.target.value)}
              />
            </label>
            <label className="add-item-toggle">
              <input
                type="checkbox"
                checked={autoAddToMenu}
                onChange={(event) => setAutoAddToMenu(event.target.checked)}
              />
              Add to current menu
            </label>
            <button
              className="primary-button"
              onClick={handleAddFromUrl}
              disabled={scrapeStatus === 'loading'}
            >
              {scrapeStatus === 'loading' ? 'Scraping…' : 'Add item'}
            </button>
            {scrapeStatus === 'error' && (
              <p className="detail-empty">{scrapeError ?? 'Failed to scrape URL'}</p>
            )}
          </div>
          <ul>
            {sortedItems.map((item, index) => {
              const isActive = index === selectedIndex
              const title = item.link_texts[0] ?? item.item_texts[0] ?? 'Untitled item'
              return (
                <li key={`${item.url ?? 'no-url'}|${title}`}>
                  <button
                    className={`item-card ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <div>
                      <strong>{title}</strong>
                      <span className="item-subtitle">{getSiteName(item.url)}</span>
                    </div>
                    <span className="item-count">{item.count}</span>
                  </button>
                </li>
              )}
            )}
          </ul>
        </aside>

        <section className="items-detail">
          {selectedItem ? (
            <>
              <div className="detail-header">
                <div>
                  <h2>{selectedTitle}</h2>
                  {selectedItem.url && (
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      View recipe at {getSiteName(selectedItem.url)} →
                    </a>
                  )}
                </div>
                <div className="detail-stats">
                  <div>
                    <span>Appears on</span>
                    <strong>{selectedItem.count} menus</strong>
                  </div>
                  <button className="primary-button" onClick={handleAddToMenu}>
                    Add to menu
                  </button>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <h3>Ingredients</h3>
                  {selectedItem.ingredients?.length ? (
                    <ul className="ingredient-list">
                      {selectedItem.ingredients.map((ingredient, index) => (
                        <li key={`${ingredient}-${index}`}>{ingredient}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="detail-empty">No ingredients listed.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty">Select an item to view details.</div>
          )}
        </section>

        <aside className="menu-builder">
          <div className="builder-header">
            <div>
              <h2>Menu Builder</h2>
              <p>{menuSelections.length} items selected</p>
            </div>
            <button className="ghost-button" onClick={handleClearMenu}>
              Clear
            </button>
          </div>
          {menuSelections.length ? (
            <ul className="builder-list">
              {menuSelections.map((item, index) => {
                const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
                return (
                  <li key={`${title}-${index}`} className="builder-row">
                    <span>{title}</span>
                    <button
                      className="ghost-button"
                      onClick={() => handleRemoveFromMenu(index)}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="builder-empty">Select items to start building a menu.</div>
          )}
          <div className="builder-actions">
            <button className="primary-button" onClick={handleExportMenu}>
              Export menu
            </button>
            <button className="primary-button" onClick={handleExportIngredients}>
              Export ingredients
            </button>
            <label className="builder-toggle">
              <span>Ingredient export</span>
              <select
                value={ingredientGrouping}
                onChange={(event) =>
                  setIngredientGrouping(event.target.value as 'category' | 'menu')
                }
              >
                <option value="category">Group by category</option>
                <option value="menu">Group by menu item</option>
              </select>
            </label>
          </div>
        </aside>
      </main>
    </div>
  )
}
