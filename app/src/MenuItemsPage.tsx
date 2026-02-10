import { useMemo, useState } from 'react'
import './MenuItemsPage.css'

export type RefactoredMenuItem = {
  url: string | null
  urls: string[]
  link_texts: string[]
  menu_files: string[]
  menu_weeks: string[]
  menu_seasons: string[]
  meal_types: string[]
  sections: string[]
  source_hints: string[]
  item_texts: string[]
  ingredients: string[]
  main_protein?: string
  count: number
}

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
}

export default function MenuItemsPage({
  items,
  onViewMenus,
  onViewRecipes,
}: MenuItemsPageProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [proteinFilter, setProteinFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuSelections, setMenuSelections] = useState<RefactoredMenuItem[]>([])

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

  function buildMenuMarkdown() {
    const dateStamp = formatDateStamp()
    const lines = menuSelections.map((item) => {
      const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
      return `- ${title}`
    })
    return `# Menu - ${dateStamp}\n\n${lines.join('\n')}\n`
  }

  function buildIngredientsMarkdown() {
    const dateStamp = formatDateStamp()
    const ingredientSet = new Set<string>()
    menuSelections.forEach((item) => {
      item.ingredients?.forEach((ingredient) => {
        if (ingredient) ingredientSet.add(ingredient)
      })
    })
    const lines = Array.from(ingredientSet).map((ingredient) => `- ${ingredient}`)
    return `# Ingredients - ${dateStamp}\n\n${lines.join('\n')}\n`
  }

  function downloadMarkdown(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function handleExportMenu() {
    downloadMarkdown('menu.md', buildMenuMarkdown())
  }

  function handleExportIngredients() {
    downloadMarkdown('ingredients.md', buildIngredientsMarkdown())
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
            <span>Filter by protein</span>
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
            <span>Search items</span>
            <input
              type="search"
              placeholder="Type to filter..."
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </label>
          <div className="meta-card">
            <span>Total Items</span>
            <strong>{sortedItems.length}</strong>
          </div>
        </div>
      </header>

      <main className="items-main">
        <aside className="items-list">
          <div className="list-header">
            <h2>All Items</h2>
            <p>Choose an item to see every occurrence</p>
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
                    <span>Occurrences</span>
                    <strong>{selectedItem.count}</strong>
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
          </div>
        </aside>
      </main>
    </div>
  )
}
