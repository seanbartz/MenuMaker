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

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface MenuItemsPageProps {
  items: RefactoredMenuItem[]
  onBack: () => void
}

export default function MenuItemsPage({ items, onBack }: MenuItemsPageProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count
      return (a.link_texts[0] ?? a.item_texts[0] ?? '').localeCompare(
        b.link_texts[0] ?? b.item_texts[0] ?? ''
      )
    })
  }, [items])

  const selectedItem = sortedItems[selectedIndex] ?? null

  return (
    <div className="items-shell">
      <header className="items-header">
        <div>
          <button onClick={onBack} className="back-button">
            ← Back to Menus
          </button>
          <p className="eyebrow">Refactored Items</p>
          <h1>Menu items grouped by URL</h1>
        </div>
        <div className="header-meta">
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
                <li key={`${item.url ?? 'no-url'}-${index}`}>
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
                  <h2>{selectedItem.link_texts[0] ?? selectedItem.item_texts[0]}</h2>
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
                  <div>
                    <span>Menus</span>
                    <strong>{selectedItem.menu_files.length}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <h3>Menu Weeks</h3>
                  <ul>
                    {selectedItem.menu_weeks.map((week) => (
                      <li key={week}>{formatDate(week)}</li>
                    ))}
                  </ul>
                </div>
                <div className="detail-card">
                  <h3>Seasons</h3>
                  <div className="pill-row">
                    {selectedItem.menu_seasons.map((season) => (
                      <span key={season} className="pill">
                        {season}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="detail-card">
                  <h3>Meal Types</h3>
                  <div className="pill-row">
                    {selectedItem.meal_types.map((meal) => (
                      <span key={meal} className="pill">
                        {meal}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="detail-card">
                  <h3>Menu Files</h3>
                  <ul>
                    {selectedItem.menu_files.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="empty">Select an item to view details.</div>
          )}
        </section>
      </main>
    </div>
  )
}
