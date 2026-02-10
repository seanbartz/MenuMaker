import { useEffect, useMemo, useState } from 'react'
import './App.css'
import RecipesPage from './RecipesPage'
import MenuItemsPage from './MenuItemsPage'
import type { Menu, MenuItem, Recipe, RefactoredMenuItem } from './types'

const BASE = import.meta.env.BASE_URL
const UNSECTIONED_SECTION = 'Unsectioned'

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(iso: string | null) {
  if (!iso) return 'Undated'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Undated'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function seasonLabel(iso: string | null) {
  if (!iso) return 'Anytime'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Anytime'
  const month = date.getMonth() + 1
  if (month <= 2 || month === 12) return 'Winter'
  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  return 'Fall'
}

function groupBySection(items: MenuItem[]) {
  const groups = new Map<string, MenuItem[]>()
  items.forEach((item) => {
    const key = item.section ?? UNSECTIONED_SECTION
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(item)
  })
  return groups
}

function getSiteName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isUrl(str: string | null): boolean {
  if (!str) return false
  return str.startsWith('http://') || str.startsWith('https://')
}

function App() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuItems, setMenuItems] = useState<RefactoredMenuItem[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<'menus' | 'recipes' | 'items'>('items')

  useEffect(() => {
    let cancelled = false
    async function getInvoke() {
      try {
        const mod = await import('@tauri-apps/api/core')
        return mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      } catch {
        try {
          const mod = await import('@tauri-apps/api/tauri')
          return mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
        } catch {
          return null
        }
      }
    }

    async function loadDesktopData() {
      const invoke = await getInvoke()
      if (!invoke) return null
      try {
        return await invoke<{
          menus?: { menus?: Menu[] } | null
          items?: { items?: RefactoredMenuItem[] } | null
        }>('load_data')
      } catch {
        return null
      }
    }

    async function load() {
      try {
        setStatus('loading')
        const desktopData = await loadDesktopData()
        const [menusRes, recipesRes, itemsRes] = await Promise.all([
          desktopData ? Promise.resolve(null) : fetch(`${BASE}data/menus.json`),
          fetch(`${BASE}data/recipes.json`),
          desktopData ? Promise.resolve(null) : fetch(`${BASE}data/menu_items_refactored.json`),
        ])

        if ((!desktopData && (!menusRes?.ok || !itemsRes?.ok)) || !recipesRes.ok) {
          throw new Error('Failed to load data files')
        }

        const menusJson = desktopData?.menus ?? (await menusRes?.json())
        const recipesJson = await recipesRes.json()
        const itemsJson = desktopData?.items ?? (await itemsRes?.json())

        if (!cancelled) {
          setMenus(menusJson.menus ?? [])
          setRecipes(recipesJson.recipes ?? [])
          setMenuItems(itemsJson.items ?? [])
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function handleSaveMenu(menu: Menu, updatedItems: RefactoredMenuItem[]) {
    const nextMenus = [menu, ...menus]
    setMenus(nextMenus)
    setMenuItems(updatedItems)
    void (async () => {
      const invoke = await (async () => {
        try {
          const mod = await import('@tauri-apps/api/core')
          return mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
        } catch {
          try {
            const mod = await import('@tauri-apps/api/tauri')
            return mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
          } catch {
            return null
          }
        }
      })()
      if (!invoke) return
      try {
        await invoke('save_data', {
          menus: { menus: nextMenus },
          items: { items: updatedItems },
        })
      } catch {
        // ignore persistence errors
      }
    })()
  }

  const sortedMenus = useMemo(() => {
    return [...menus].sort((a, b) => {
      if (a.week_of_date && b.week_of_date) {
        return a.week_of_date < b.week_of_date ? 1 : -1
      }
      if (a.week_of_date) return -1
      if (b.week_of_date) return 1
      return (a.title ?? '').localeCompare(b.title ?? '')
    })
  }, [menus])

  useEffect(() => {
    if (!selectedFile && sortedMenus.length) {
      setSelectedFile(sortedMenus[0].file)
    }
  }, [selectedFile, sortedMenus])

  const selectedMenu = sortedMenus.find((menu) => menu.file === selectedFile) ?? null

  const recipeIndex = useMemo(() => {
    return recipes
      .filter((recipe) => recipe.title)
      .map((recipe) => ({
        recipe,
        normalized: normalize(recipe.title ?? ''),
      }))
  }, [recipes])

  const menuStats = useMemo(() => {
    if (!selectedMenu) return null
    const total = selectedMenu.items.length
    const linked = selectedMenu.items.filter(
      (item) => item.urls.length > 0 || item.links.length > 0
    ).length
    return { total, linked }
  }, [selectedMenu])

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <main className="app-main">
          <div className="loading">Loading data…</div>
        </main>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="app-shell">
        <main className="app-main">
          <div className="error">Failed to load menus: {errorMessage}</div>
        </main>
      </div>
    )
  }

  return (
    <>
      {currentPage === 'recipes' ? (
        <RecipesPage recipes={recipes} onBack={() => setCurrentPage('menus')} />
      ) : currentPage === 'items' ? (
        <MenuItemsPage
          items={menuItems}
          onViewMenus={() => setCurrentPage('menus')}
          onViewRecipes={() => setCurrentPage('recipes')}
          menus={menus}
          onSaveMenu={handleSaveMenu}
        />
      ) : (
        <div className="app-shell">
          <header className="app-header">
            <div>
              <p className="eyebrow">MenuMaker</p>
              <h1>Seasonal, low-waste weekly menus.</h1>
            </div>
            <div className="header-meta">
              <div className="meta-card">
                <span>Menus</span>
                <strong>{menus.length}</strong>
              </div>
              <div className="meta-card clickable" onClick={() => setCurrentPage('recipes')}>
                <span>Recipes</span>
                <strong>{recipes.length}</strong>
                <span className="meta-action">View →</span>
              </div>
              <div className="meta-card clickable" onClick={() => setCurrentPage('items')}>
                <span>Items</span>
                <strong>{menuItems.length}</strong>
                <span className="meta-action">View →</span>
              </div>
            </div>
          </header>

      <main className="app-main">
        <aside className="menu-list">
          <div className="list-header">
            <h2>Weekly menus</h2>
            <p>Tap a week to explore ingredients and links.</p>
          </div>

          {status === 'loading' && <div className="loading">Loading menus…</div>}
          {status === 'error' && (
            <div className="error">Failed to load menus: {errorMessage}</div>
          )}

          {status === 'ready' && (
            <ul>
              {sortedMenus.map((menu) => {
                const isActive = menu.file === selectedFile
                const dateLabel = formatDate(menu.week_of_date)
                return (
                  <li key={menu.file}>
                    <button
                      className={`menu-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedFile(menu.file)}
                    >
                      <div>
                        <span className="menu-date">{dateLabel}</span>
                        <strong>{menu.title ?? menu.file}</strong>
                      </div>
                      <span className="menu-season">{seasonLabel(menu.week_of_date)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="menu-detail">
          {selectedMenu ? (
            <>
              <div className="detail-header">
                <div>
                  <p className="eyebrow">Selected week</p>
                  <h2>{selectedMenu.title ?? selectedMenu.file}</h2>
                  <p className="detail-date">{formatDate(selectedMenu.week_of_date)}</p>
                </div>
                {menuStats && (
                  <div className="detail-stats">
                    <div>
                      <span>Items</span>
                      <strong>{menuStats.total}</strong>
                    </div>
                    <div>
                      <span>With links</span>
                      <strong>{menuStats.linked}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="section-grid">
                {[...groupBySection(selectedMenu.items).entries()].map(([section, items]) => (
                  <div key={section} className="section-card">
                    {section !== UNSECTIONED_SECTION && (
                      <div className="section-title">
                        <h3>{section}</h3>
                        <span>{items.length} items</span>
                      </div>
                    )}
                    <ul>
                      {items.map((item, index) => {
                        const normalizedItem = normalize(item.text)
                        const matched = recipeIndex.find((entry) =>
                          normalizedItem.includes(entry.normalized)
                        )
                        return (
                          <li key={`${section}-${index}`}>
                            <div className="item-row">
                              <span className="check">•</span>
                              <div>
                                <p>{item.text}</p>
                                <div className="item-meta">
                                  <span className="pill">{item.meal_type}</span>
                                  {item.source_hint && !isUrl(item.source_hint) && (
                                    <span className="pill">{item.source_hint}</span>
                                  )}
                                  {matched?.recipe.title && (
                                    <span className="pill accent">Recipe match</span>
                                  )}
                                </div>
                                {(item.links.length > 0 || item.urls.length > 0) && (
                                  <div className="item-links">
                                    {item.links.map((link) => (
                                      <a
                                        key={link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`item-link${link.auto_added ? ' auto-added' : ''}`}
                                      >
                                        {getSiteName(link.url)}
                                      </a>
                                    ))}
                                    {item.urls.map((url) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="item-link"
                                      >
                                        {getSiteName(url)}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">Select a menu to get started.</div>
          )}
        </section>
      </main>
    </div>
      )}
    </>
  )
}

export default App
