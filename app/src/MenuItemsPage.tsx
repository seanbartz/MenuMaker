import { useMemo, useState, useEffect } from 'react'
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
  onUpdateItem: (originalItem: RefactoredMenuItem, updatedItem: RefactoredMenuItem) => void
}

export default function MenuItemsPage({
  items,
  onViewMenus,
  onViewRecipes,
  menus,
  onSaveMenu,
  onAddItem,
  onUpdateItem,
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
  const [removedIngredients, setRemovedIngredients] = useState<Set<string>>(new Set())
  const [manualShoppingItems, setManualShoppingItems] = useState<string[]>([])
  const [selectedShoppingItems, setSelectedShoppingItems] = useState<Set<string>>(new Set())
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [combineTooltip, setCombineTooltip] = useState<string | null>(null)
  const [shoppingUndoStack, setShoppingUndoStack] = useState<
    {
      removedKeys: string[]
      addedManualItems: string[]
      message: string
    }[]
  >([])
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editItemUrl, setEditItemUrl] = useState('')
  const [editScrapeStatus, setEditScrapeStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [editScrapeError, setEditScrapeError] = useState<string | null>(null)

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

  useEffect(() => {
    setEditItemUrl('')
    setEditScrapeStatus('idle')
    setEditScrapeError(null)
  }, [selectedItem])

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

  function formatShortDate(date = new Date()) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = String(date.getFullYear()).slice(-2)
    return `${month}/${day}/${year}`
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

  function renderIngredientText(ingredient: string) {
    const unitTokens = new Set([
      'cup',
      'cups',
      'tablespoon',
      'tablespoons',
      'tbsp',
      'teaspoon',
      'teaspoons',
      'tsp',
      'ounce',
      'ounces',
      'oz',
      'fluid',
      'fl',
      'fl.',
      'floz',
      'fl-oz',
      'fl-oz.',
      'fl.oz',
      'fl.oz.',
      'pound',
      'pounds',
      'lb',
      'lbs',
      'clove',
      'cloves',
      'can',
      'cans',
      'package',
      'packages',
      'pkg',
      'pkgs',
      'stick',
      'sticks',
      'bunch',
      'bunches',
      'slice',
      'slices',
      'head',
      'heads',
      'block',
      'blocks',
      'piece',
      'pieces',
    ])
    const stopTokens = new Set([
      'a',
      'an',
      'or',
      'and',
      'each',
      'to',
      'taste',
      'for',
      'the',
      'of',
      'with',
      'plus',
      'fresh',
      'small',
      'medium',
      'large',
      'extra',
      'optional',
      'more',
      'less',
      'about',
      'approx',
      'approx.',
      'approximately',
    ])
    const wordNumbers = new Set([
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
      'sixteen',
      'seventeen',
      'eighteen',
      'nineteen',
      'twenty',
      'thirty',
      'forty',
      'fifty',
      'sixty',
      'seventy',
      'eighty',
      'ninety',
      'hundred',
      'thousand',
      'half',
      'quarter',
    ])
    const tokens = ingredient.split(/(\s+)/)
    let inParens = false
    return tokens.map((token, index) => {
      if (token.trim() === '') {
        return <span key={index}>{token}</span>
      }
      if (token.includes('(')) inParens = true
      const lower = token.toLowerCase().replace(/[,()]/g, '')
      const isNumber = /^[\d/.-]+$/.test(lower)
      const isUnit = unitTokens.has(lower)
      const isStop = stopTokens.has(lower)
      const isWordNumber = wordNumbers.has(lower)
      if (isNumber || isUnit || isStop || isWordNumber || inParens) {
        if (token.includes(')')) inParens = false
        return <span key={index}>{token}</span>
      }
      if (token.includes(')')) inParens = false
      return (
        <strong key={index} className="ingredient-keyword">
          {token}
        </strong>
      )
    })
  }

  function makeShoppingSelectionKey(section: string, ingredient: string) {
    return `${section}::${ingredient}`
  }

  function parseQuantity(token: string): number | null {
    const rangeMatch = token.match(/^(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*-\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)$/)
    if (rangeMatch) {
      const high: number | null = parseQuantity(rangeMatch[2])
      return high
    }
    const fractionMatch = token.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (fractionMatch) {
      const numerator = Number(fractionMatch[1])
      const denominator = Number(fractionMatch[2])
      if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return null
      }
      return numerator / denominator
    }
    const number = Number(token)
    if (!Number.isFinite(number)) return null
    return number
  }

  function normalizeCombineName(value: string) {
    const cleaned = value
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .split(',')[0]
      .replace(/[–—]/g, '-')
      .replace(/[^a-z\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const dropTokens = new Set([
      'fresh',
      'minced',
      'peeled',
      'grated',
      'chopped',
      'diced',
      'sliced',
      'crushed',
      'ground',
      'thinly',
      'finely',
      'roughly',
      'cooked',
      'raw',
      'frozen',
      'thawed',
      'low-sodium',
      'lowsodium',
      'low',
      'sodium',
      'reduced-sodium',
      'reduced',
      'dark',
      'light',
      'toasted',
      'unsalted',
      'salted',
      'boneless',
      'skinless',
    ])
    const tokens = cleaned.split(' ').filter((token) => token && !dropTokens.has(token))
    return tokens.join(' ').trim()
  }

  function parseIngredientMeasurement(value: string) {
    const cleaned = value
      .replace(/[–—]/g, '-')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const parts = cleaned.split(' ')
    if (parts.length < 2) return null
    let quantity = 0
    let index = 0
    const first = parseQuantity(parts[index])
    if (first == null) return null
    quantity += first
    index += 1
    if (index < parts.length) {
      const second = parseQuantity(parts[index])
      if (second != null) {
        quantity += second
        index += 1
      }
    }
    if (index >= parts.length) return null
    const unitToken = parts[index].toLowerCase()
    const unitMap: Record<string, string> = {
      teaspoon: 'tsp',
      teaspoons: 'tsp',
      tsp: 'tsp',
      'tsp.': 'tsp',
      tablespoon: 'tbsp',
      tablespoons: 'tbsp',
      tbsp: 'tbsp',
      'tbsp.': 'tbsp',
      cup: 'cup',
      cups: 'cup',
      milliliter: 'ml',
      milliliters: 'ml',
      ml: 'ml',
      liter: 'l',
      liters: 'l',
      l: 'l',
      'fl': 'floz',
      'fl.': 'floz',
      floz: 'floz',
      'fl-oz': 'floz',
      'fl-oz.': 'floz',
      'fl.oz': 'floz',
      'fl.oz.': 'floz',
      ounce: 'oz',
      ounces: 'oz',
      oz: 'oz',
      pound: 'lb',
      pounds: 'lb',
      lb: 'lb',
      lbs: 'lb',
      gram: 'g',
      grams: 'g',
      g: 'g',
      kilogram: 'kg',
      kilograms: 'kg',
      kg: 'kg',
    }
    let unit = unitMap[unitToken]
    if (!unit && unitToken === 'fl' && parts[index + 1]?.toLowerCase() === 'oz') {
      unit = 'floz'
      index += 1
    } else if (!unit && unitToken === 'fluid' && parts[index + 1]?.toLowerCase() === 'ounce') {
      unit = 'floz'
      index += 1
    } else if (!unit && unitToken === 'fluid' && parts[index + 1]?.toLowerCase() === 'ounces') {
      unit = 'floz'
      index += 1
    }
    if (!unit) return null
    index += 1
    const nameTokens = parts.slice(index).filter((token) => token.toLowerCase() !== 'of')
    if (!nameTokens.length) return null
    const rawName = nameTokens.join(' ')
    const name = normalizeCombineName(rawName)
    if (!name) return null
    const volumeUnits = new Set(['tsp', 'tbsp', 'cup', 'floz', 'ml', 'l'])
    const weightUnits = new Set(['oz', 'lb', 'g', 'kg'])
    const category = volumeUnits.has(unit)
      ? 'volume'
      : weightUnits.has(unit)
        ? 'weight'
        : 'other'
    const volumeToMl: Record<string, number> = {
      tsp: 4.92892,
      tbsp: 14.7868,
      cup: 240,
      floz: 29.5735,
      ml: 1,
      l: 1000,
    }
    const weightToG: Record<string, number> = {
      oz: 28.3495,
      lb: 453.592,
      g: 1,
      kg: 1000,
    }
    const baseQuantity =
      category === 'volume'
        ? quantity * (volumeToMl[unit] ?? 1)
        : category === 'weight'
          ? quantity * (weightToG[unit] ?? 1)
          : quantity
    return { quantity, unit, name, category, baseQuantity }
  }

  function parseIngredientCount(value: string) {
    const cleaned = value
      .replace(/[–—]/g, '-')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const parts = cleaned.split(' ')
    if (parts.length < 2) return null
    const quantity = parseQuantity(parts[0])
    if (quantity == null) return null
    const unitMap: Record<string, string> = {
      clove: 'clove',
      cloves: 'clove',
      bunch: 'bunch',
      bunches: 'bunch',
      block: 'block',
      blocks: 'block',
      package: 'package',
      packages: 'package',
      pkg: 'package',
      pkgs: 'package',
      bag: 'bag',
      bags: 'bag',
      box: 'box',
      boxes: 'box',
      jar: 'jar',
      jars: 'jar',
      bottle: 'bottle',
      bottles: 'bottle',
      pinch: 'pinch',
      pinches: 'pinch',
      handful: 'handful',
      handfuls: 'handful',
      can: 'can',
      cans: 'can',
      piece: 'piece',
      pieces: 'piece',
      head: 'head',
      heads: 'head',
      slice: 'slice',
      slices: 'slice',
      stick: 'stick',
      sticks: 'stick',
    }
    let index = 1
    let unit: string | null = null
    if (parts[index] && unitMap[parts[index].toLowerCase()]) {
      unit = unitMap[parts[index].toLowerCase()]
      index += 1
    }
    const nameTokens = parts.slice(index).filter((token) => token.toLowerCase() !== 'of')
    if (!nameTokens.length) return null
    const rawName = nameTokens.join(' ')
    const name = normalizeCombineName(rawName)
    if (!name) return null
    return { quantity, unit, name }
  }

  function formatQuantity(value: number) {
    const rounded = Math.round(value * 8) / 8
    const whole = Math.floor(rounded)
    const fraction = rounded - whole
    if (fraction < 0.0001) return `${whole}`
    const denom = 8
    const numer = Math.round(fraction * denom)
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
    const divisor = gcd(numer, denom)
    const simpleNumer = numer / divisor
    const simpleDenom = denom / divisor
    if (whole === 0) {
      return `${simpleNumer}/${simpleDenom}`
    }
    return `${whole} ${simpleNumer}/${simpleDenom}`
  }

  function formatCombinedVolume(totalMl: number, name: string) {
    const mlPerFloz = 29.5735
    if (totalMl > mlPerFloz) {
      const value = totalMl / mlPerFloz
      const qty = value.toFixed(2).replace(/\.?0+$/, '')
      const unitLabel = value === 1 ? 'fluid ounce' : 'fluid ounces'
      return `${qty} ${unitLabel} ${name}`
    }
    return formatCombinedTsp(totalMl, name)
  }

  function formatCombinedTsp(totalMl: number, name: string) {
    const mlPerTsp = 4.92892
    const totalTsp = totalMl / mlPerTsp
    let unit = 'tsp'
    let value = totalTsp
    if (totalTsp >= 3) {
      unit = 'tbsp'
      value = totalTsp / 3
    }
    const qty = formatQuantity(value)
    const unitLabel =
      unit === 'tbsp'
        ? value === 1
          ? 'tablespoon'
          : 'tablespoons'
        : value === 1
          ? 'teaspoon'
          : 'teaspoons'
    return `${qty} ${unitLabel} ${name}`
  }

  function formatCombinedWeight(totalG: number, name: string) {
    const gPerLb = 453.592
    const value = totalG / gPerLb
    const qty = value.toFixed(2).replace(/\.?0+$/, '')
    const unitLabel = value === 1 ? 'pound' : 'pounds'
    return `${qty} ${unitLabel} ${name}`
  }

  function handleToggleShoppingSelection(section: string, ingredient: string) {
    const key = makeShoppingSelectionKey(section, ingredient)
    setSelectedShoppingItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function combineIngredients(selectedIngredients: string[]) {
    if (selectedIngredients.length < 2) {
      return { error: 'Select at least two items to combine.' }
    }
    const parsedMeasurements = selectedIngredients.map((item) =>
      parseIngredientMeasurement(item)
    )
    const parsedCounts = selectedIngredients.map((item) => parseIngredientCount(item))
    const hasMeasurement = parsedMeasurements.every((item) => item)
    const hasCounts = parsedCounts.every((item) => item)
    if (!hasMeasurement && !hasCounts) {
      return {
        error:
          'Selected items must all be compatible measurements (volume/weight) or all be simple counts.',
      }
    }
    if (hasMeasurement) {
      const baseName = parsedMeasurements[0]!.name.toLowerCase()
      if (parsedMeasurements.some((item) => item!.name.toLowerCase() !== baseName)) {
        return { error: 'Selected items must refer to the same ingredient to combine.' }
      }
      const category = parsedMeasurements[0]!.category
      if (
        parsedMeasurements.some((item) => item!.category !== category) ||
        category === 'other'
      ) {
        return {
          error:
            'Selected items must use compatible units (volume or weight) to combine.',
        }
      }
      const totalBase = parsedMeasurements.reduce(
        (sum, item) => sum + item!.baseQuantity,
        0
      )
      const combined =
        category === 'volume'
          ? formatCombinedVolume(totalBase, parsedMeasurements[0]!.name)
          : formatCombinedWeight(totalBase, parsedMeasurements[0]!.name)
      const removedKeys = selectedIngredients.map((item) => normalizeIngredientKey(item))
      return { combined, removedKeys, addedManualItems: [combined] }
    }

    const baseName = parsedCounts[0]!.name.toLowerCase()
    if (parsedCounts.some((item) => item!.name.toLowerCase() !== baseName)) {
      return { error: 'Selected items must refer to the same ingredient to combine.' }
    }
    const totalCount = parsedCounts.reduce((sum, item) => sum + item!.quantity, 0)
    const unit = parsedCounts[0]!.unit
    if (parsedCounts.some((item) => item!.unit !== unit)) {
      return { error: 'Selected count items must use the same unit to combine.' }
    }
    let combined = `${formatQuantity(totalCount)} ${parsedCounts[0]!.name}`
    if (unit) {
      const plural =
        totalCount === 1 ? unit.replace(/s$/, '') : unit.endsWith('s') ? unit : `${unit}s`
      combined = `${formatQuantity(totalCount)} ${plural} ${parsedCounts[0]!.name}`
    }
    const removedKeys = selectedIngredients.map((item) => normalizeIngredientKey(item))
    return { combined, removedKeys, addedManualItems: [combined] }
  }

  function handleCombineSelectedItems() {
    if (!selectedShoppingItems.size) {
      setActionError('Select at least two items to combine.')
      return
    }
    const selectedIngredients: string[] = []
    selectedShoppingItems.forEach((key) => {
      const [, ingredient] = key.split('::')
      if (ingredient) selectedIngredients.push(ingredient)
    })
    const result = combineIngredients(selectedIngredients)
    if (result.error) {
      setActionError(result.error)
      setCombineTooltip(result.error)
      return
    }
    const removedKeys = result.removedKeys ?? []
    const addedManualItems = result.addedManualItems ?? []
    setRemovedIngredients((prev) => {
      const next = new Set(prev)
      removedKeys.forEach((key) => next.add(key))
      return next
    })
    setManualShoppingItems((prev) => [...prev, ...addedManualItems])
    setShoppingUndoStack((prev) => [
      ...prev,
      {
        removedKeys,
        addedManualItems,
        message: 'Undo combine',
      },
    ])
    setSelectedShoppingItems(new Set())
    setActionError(null)
    setCombineTooltip(null)
    setActionMessage('Combined selected items.')
  }

  function handleDeselectShoppingItems() {
    setSelectedShoppingItems(new Set())
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
      const menuSeasons = season
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

  async function handleShareMenuToNotes() {
    if (!menuSelections.length) {
      setActionError('No menu items selected.')
      return
    }
    const dateStamp = formatShortDate()
    const title = `Menu week of ${dateStamp}`
    const items = menuSelections.map((item) => {
      const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
      const url = item.url ?? item.urls?.[0]
      if (url) {
        return `${title} — ${url}`
      }
      return title
    })
    const normalizedTitle = title.trim().toLowerCase()
    const cleanedItems = items.filter(
      (item) => item && item.trim().toLowerCase() !== normalizedTitle
    )
    try {
      const mod = await import('@tauri-apps/api/core')
      const invoke = mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      await invoke('create_note_checklist', { title, items: cleanedItems })
      handlePersistMenu()
      setActionError(null)
      setActionMessage('Sent menu to Notes.')
    } catch (error) {
      if (typeof error === 'string') {
        setActionError(error)
      } else if (error instanceof Error) {
        setActionError(error.message)
      } else {
        setActionError('Failed to send to Notes.')
      }
    }
  }

  async function handleShareShoppingToNotes() {
    const dateStamp = formatShortDate()
    const title = `Shopping List - ${dateStamp}`
    const sections =
      ingredientGrouping === 'menu'
        ? getShoppingListByMenu().map((group) => ({
            heading: group.section,
            items: group.items,
          }))
        : getShoppingListByCategory().map((group) => ({
            heading: group.section,
            items: group.items,
          }))
    if (!sections.length) {
      setActionError('No ingredients available.')
      return
    }
    try {
      const mod = await import('@tauri-apps/api/core')
      const invoke = mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      await invoke('create_note_checklist_with_headings', { title, sections })
      setActionError(null)
      setActionMessage('Sent shopping list to Notes.')
    } catch (error) {
      if (typeof error === 'string') {
        setActionError(error)
      } else if (error instanceof Error) {
        setActionError(error.message)
      } else {
        setActionError('Failed to send to Notes.')
      }
    }
  }

  function getShoppingListByCategory() {
    const ingredientMap = new Map<string, string>()
    menuSelections.forEach((item) => {
      item.ingredients?.forEach((ingredient) => {
        if (!ingredient) return
        const key = normalizeIngredientKey(ingredient)
        if (removedIngredients.has(key)) return
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, ingredient)
        }
      })
    })
    manualShoppingItems.forEach((ingredient) => {
      if (!ingredient) return
      const key = normalizeIngredientKey(ingredient)
      if (removedIngredients.has(key)) return
      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, ingredient)
      }
    })

    const sections: Record<string, string[]> = {
      Produce: [],
      Proteins: [],
      Grains: [],
      'Packaged Items': [],
      Staples: [],
    }

    const classifyIngredient = (ingredient: string): keyof typeof sections => {
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

    const sortKeyForIngredient = (ingredient: string) => {
      const text = ingredient.toLowerCase()
      const normalized = text
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[–—]/g, '-')
        .replace(/^[^a-z]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const quantityWords = [
        'a',
        'an',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
        'ten',
        'half',
        'quarter',
      ]
      const unitWords = [
        'cup',
        'cups',
        'tablespoon',
        'tablespoons',
        'tbsp',
        'teaspoon',
        'teaspoons',
        'tsp',
        'ounce',
        'ounces',
        'oz',
        'pound',
        'pounds',
        'lb',
        'lbs',
        'clove',
        'cloves',
        'can',
        'cans',
        'package',
        'packages',
        'pkg',
        'pkgs',
        'stick',
        'sticks',
        'bunch',
        'bunches',
        'slice',
        'slices',
        'head',
        'heads',
        'block',
        'blocks',
        'piece',
        'pieces',
      ]
      const tokens = normalized.split(' ').filter(Boolean)
      let start = 0
      while (start < tokens.length) {
        const token = tokens[start]
        if (/^\d/.test(token) || token.includes('/')) {
          start += 1
          continue
        }
        if (token === 'of') {
          start += 1
          continue
        }
        if (quantityWords.includes(token)) {
          start += 1
          continue
        }
        if (unitWords.includes(token)) {
          start += 1
          continue
        }
        break
      }
      return tokens.slice(start).join(' ') || normalized
    }

    return Object.entries(sections)
      .map(([section, list]) => ({
        section,
        items: list.sort((a, b) => {
          const keyA = sortKeyForIngredient(a)
          const keyB = sortKeyForIngredient(b)
          if (keyA === keyB) return a.localeCompare(b)
          return keyA.localeCompare(keyB)
        }),
      }))
      .filter((group) => group.items.length)
  }

  function getShoppingListByMenu() {
    const menuGroups = menuSelections.map((item) => {
      const title = item.link_texts?.[0] ?? item.item_texts?.[0] ?? 'Untitled item'
      const items = (item.ingredients ?? [])
        .filter(Boolean)
        .filter((ingredient) => !removedIngredients.has(normalizeIngredientKey(ingredient)))
      return { section: title, items }
    })
    if (manualShoppingItems.length) {
      menuGroups.push({
        section: 'Combined items',
        items: manualShoppingItems.filter(
          (ingredient) => !removedIngredients.has(normalizeIngredientKey(ingredient))
        ),
      })
    }
    return menuGroups
  }

  function getDuplicateGroups() {
    const groups =
      ingredientGrouping === 'menu' ? getShoppingListByMenu() : getShoppingListByCategory()
    const map = new Map<string, Set<string>>()
    groups.forEach((group) => {
      group.items.forEach((ingredient) => {
        const measurement = parseIngredientMeasurement(ingredient)
        const count = parseIngredientCount(ingredient)
        const base =
          measurement?.name?.toLowerCase() ??
          count?.name?.toLowerCase() ??
          normalizeCombineName(ingredient)
        if (!base) return
        if (!map.has(base)) map.set(base, new Set())
        map.get(base)!.add(ingredient)
      })
    })
    return Array.from(map.entries())
      .map(([base, items]) => ({
        base,
        items: Array.from(items),
      }))
      .filter((group) => group.items.length > 1)
      .sort((a, b) => a.base.localeCompare(b.base))
  }

  const undoDisabled = shoppingUndoStack.length === 0

  function handleRemoveSelectedItems() {
    if (!selectedShoppingItems.size) {
      setActionError('Select at least one item to remove.')
      return
    }
    const keysToRemove = new Set<string>()
    selectedShoppingItems.forEach((key) => {
      const [, ingredient] = key.split('::')
      if (ingredient) {
        keysToRemove.add(normalizeIngredientKey(ingredient))
      }
    })
    const removedKeys = Array.from(keysToRemove)
    setRemovedIngredients((prev) => {
      const next = new Set(prev)
      keysToRemove.forEach((key) => next.add(key))
      return next
    })
    setShoppingUndoStack((prev) => [
      ...prev,
      {
        removedKeys,
        addedManualItems: [],
        message: 'Undo remove',
      },
    ])
    setSelectedShoppingItems(new Set())
    setActionError(null)
    setActionMessage('Removed selected items.')
  }

  function handleCombineSuggested(ingredients: string[]) {
    const result = combineIngredients(ingredients)
    if (result.error) {
      setActionError(result.error)
      setCombineTooltip(result.error)
      return
    }
    const removedKeys = result.removedKeys ?? []
    const addedManualItems = result.addedManualItems ?? []
    setRemovedIngredients((prev) => {
      const next = new Set(prev)
      removedKeys.forEach((key) => next.add(key))
      return next
    })
    setManualShoppingItems((prev) => [...prev, ...addedManualItems])
    setShoppingUndoStack((prev) => [
      ...prev,
      {
        removedKeys,
        addedManualItems,
        message: 'Undo combine',
      },
    ])
    setSelectedShoppingItems(new Set())
    setActionError(null)
    setCombineTooltip(null)
    setActionMessage('Combined suggested items.')
  }

  function handleUndoShoppingAction() {
    setShoppingUndoStack((prev) => {
      const next = [...prev]
      const last = next.pop()
      if (!last) return prev
      if (last.removedKeys.length) {
        setRemovedIngredients((current) => {
          const updated = new Set(current)
          last.removedKeys.forEach((key) => updated.delete(key))
          return updated
        })
      }
      if (last.addedManualItems.length) {
        setManualShoppingItems((current) =>
          current.filter((item) => !last.addedManualItems.includes(item))
        )
      }
      setActionMessage('Undid last action.')
      return next
    })
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
      const shouldUpdateSelected =
        selectedItem && !selectedItem.url && !(selectedItem.urls ?? []).length
      if (shouldUpdateSelected && selectedItem) {
        const mergedItem = mergeRefactoredItem(selectedItem, newItem)
        onUpdateItem(selectedItem, newItem)
        setMenuSelections((prev) => {
          const next = prev.map((item) => (item === selectedItem ? mergedItem : item))
          if (autoAddToMenu && !next.includes(mergedItem)) {
            next.push(mergedItem)
          }
          return next
        })
      } else {
        onAddItem(newItem)
        if (autoAddToMenu) {
          setMenuSelections((prev) => [...prev, newItem])
        }
      }
      setNewItemUrl('')
      setScrapeStatus('idle')
    } catch (error) {
      setScrapeStatus('error')
      setScrapeError(error instanceof Error ? error.message : 'Failed to scrape URL')
    }
  }

  async function handleUpdateItemWithUrl() {
    if (!editItemUrl.trim() || !selectedItem) return
    setEditScrapeStatus('loading')
    setEditScrapeError(null)
    const trimmedUrl = editItemUrl.trim()
    try {
      const mod = await import('@tauri-apps/api/core')
      const invoke = mod.invoke as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      const result = await invoke<{
        title: string
        ingredients: string[]
        tags: string[]
        main_protein: string
      }>('scrape_recipe', { url: trimmedUrl })
      const updatedItem: RefactoredMenuItem = {
        ...selectedItem,
        url: trimmedUrl,
        urls: Array.from(new Set([...(selectedItem.urls ?? []), trimmedUrl])),
        ingredients: result.ingredients?.length ? result.ingredients : selectedItem.ingredients,
        recipe_tags: result.tags?.length
          ? Array.from(new Set([...(selectedItem.recipe_tags ?? []), ...result.tags]))
          : selectedItem.recipe_tags,
        main_protein: result.main_protein || selectedItem.main_protein,
      }
      onUpdateItem(selectedItem, updatedItem)
      setEditItemUrl('')
      setEditScrapeStatus('idle')
    } catch (error) {
      setEditScrapeStatus('error')
      setEditScrapeError(error instanceof Error ? error.message : 'Failed to scrape URL')
    }
  }

  function mergeRefactoredItem(
    existing: RefactoredMenuItem,
    incoming: RefactoredMenuItem
  ): RefactoredMenuItem {
    const urls = Array.from(new Set([...(existing.urls ?? []), ...(incoming.urls ?? [])]))
    if (incoming.url) {
      urls.push(incoming.url)
    }
    const link_texts = Array.from(
      new Set([...(existing.link_texts ?? []), ...(incoming.link_texts ?? [])])
    )
    const item_texts = Array.from(
      new Set([...(existing.item_texts ?? []), ...(incoming.item_texts ?? [])])
    )
    const source_hints = Array.from(
      new Set([...(existing.source_hints ?? []), ...(incoming.source_hints ?? [])])
    )
    const recipe_tags = Array.from(
      new Set([...(existing.recipe_tags ?? []), ...(incoming.recipe_tags ?? [])])
    )
    return {
      ...existing,
      url: incoming.url ?? existing.url,
      urls: Array.from(new Set(urls)),
      link_texts,
      item_texts,
      source_hints,
      ingredients: incoming.ingredients?.length ? incoming.ingredients : existing.ingredients,
      recipe_tags,
      main_protein: incoming.main_protein || existing.main_protein,
    }
  }

  const duplicateGroups = showDuplicates ? getDuplicateGroups() : []
  const duplicateItems = showDuplicates
    ? new Set(duplicateGroups.flatMap((group) => group.items))
    : new Set<string>()
  const tagDisplaySet = new Set([
    'Baking',
    '5 Ingredients',
    'Crock Pot',
    'Easy',
    'Fast',
    'Grilling',
    'Pasta',
    'SOS Series',
    'Simple',
    'Weeknight Meals',
  ])
  const selectedTags =
    selectedItem?.recipe_tags?.filter((tag) => tagDisplaySet.has(tag)) ?? []

  return (
    <div className="items-shell">
      {showShoppingList ? (
        <section className="shopping-view">
          <header className="shopping-header">
            <div>
              <button className="shopping-back" onClick={() => setShowShoppingList(false)}>
                Back to items
              </button>
              <p className="eyebrow">Shopping List</p>
            </div>
            <div className="shopping-controls">
              <button
                className="ghost-button"
                onClick={handleCombineSelectedItems}
                title={combineTooltip ?? 'Combine selected'}
              >
                Combine selected
              </button>
              <button className="ghost-button pill-danger" onClick={handleRemoveSelectedItems}>
                Remove selected
              </button>
              <button
                className="ghost-button"
                onClick={handleUndoShoppingAction}
                disabled={undoDisabled}
              >
                Undo
              </button>
              <button className="ghost-button" onClick={handleDeselectShoppingItems}>
                Deselect all
              </button>
              <label className="builder-toggle">
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
              <label className="builder-toggle duplicates-toggle">
                <input
                  type="checkbox"
                  checked={showDuplicates}
                  onChange={(event) => setShowDuplicates(event.target.checked)}
                />
                Duplicates
              </label>
              <button className="ghost-button pill-accent" onClick={handleShareShoppingToNotes}>
                Send to Notes
              </button>
              {actionMessage && <span className="action-message">{actionMessage}</span>}
              {actionError && <span className="action-error">{actionError}</span>}
            </div>
          </header>

          <div className="shopping-body">
            {showDuplicates && duplicateGroups.length ? (
              <div className="duplicates-panel">
                <h4>Possible duplicates</h4>
                <ul className="builder-list">
                  {duplicateGroups.map((group) => (
                    <li key={group.base} className="builder-row duplicate-row">
                      <div className="duplicate-text">
                        <strong>{group.base}</strong>
                        <span>{group.items.join(' · ')}</span>
                      </div>
                      <button
                        className="ghost-button"
                        onClick={() => handleCombineSuggested(group.items)}
                      >
                        Combine
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ingredientGrouping === 'menu' ? (
              getShoppingListByMenu().length ? (
                <div className="shopping-groups">
                  {getShoppingListByMenu().map((group) => (
                    <div key={group.section} className="shopping-group">
                      <h4>{group.section}</h4>
                      {group.items.length ? (
                        <ul className="builder-list">
                          {group.items.map((ingredient) => (
                            <li
                              key={ingredient}
                              className={`builder-row shopping-row${
                                selectedShoppingItems.has(
                                  makeShoppingSelectionKey(group.section, ingredient)
                                )
                                  ? ' shopping-selected'
                                  : ''
                              }${duplicateItems.has(ingredient) ? ' duplicate-hit' : ''}`}
                              onClick={() => handleToggleShoppingSelection(group.section, ingredient)}
                            >
                              <span>{renderIngredientText(ingredient)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="builder-empty">No ingredients listed.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="builder-empty">No ingredients yet.</div>
              )
            ) : getShoppingListByCategory().length ? (
              <div className="shopping-groups">
                {getShoppingListByCategory().map((group) => (
                  <div key={group.section} className="shopping-group">
                    <h4>{group.section}</h4>
                    <ul className="builder-list">
                      {group.items.map((ingredient) => (
                        <li
                          key={ingredient}
                          className={`builder-row shopping-row${
                            selectedShoppingItems.has(
                              makeShoppingSelectionKey(group.section, ingredient)
                            )
                              ? ' shopping-selected'
                              : ''
                          }${duplicateItems.has(ingredient) ? ' duplicate-hit' : ''}`}
                          onClick={() => handleToggleShoppingSelection(group.section, ingredient)}
                        >
                          <span>{renderIngredientText(ingredient)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="builder-empty">No ingredients yet.</div>
            )}
          </div>
        </section>
      ) : (
        <>
          <header className="items-header">
            <div>
              <div className="page-actions">
                <button onClick={onViewMenus} className="back-button">
                  Menus
                </button>
                <button onClick={onViewRecipes} className="back-button">
                  Recipes
                </button>
                <button onClick={() => setShowShoppingList(true)} className="back-button">
                  Shopping List
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
                  {!selectedItem.url && (
                    <div className="add-url-section">
                      <h4>Add Recipe URL</h4>
                      <p className="detail-empty">
                        {!selectedItem.ingredients?.length
                          ? 'This item is missing a URL and ingredients. Add a recipe URL to automatically scrape and populate this data.'
                          : 'This item is missing a URL. Add a recipe URL to automatically scrape additional data.'}
                      </p>
                      <label>
                        <span>Recipe URL</span>
                        <input
                          type="url"
                          placeholder="https://example.com/recipe"
                          value={editItemUrl}
                          onChange={(event) => setEditItemUrl(event.target.value)}
                        />
                      </label>
                      <button
                        className="primary-button"
                        onClick={handleUpdateItemWithUrl}
                        disabled={editScrapeStatus === 'loading' || !editItemUrl.trim()}
                      >
                        {editScrapeStatus === 'loading' ? 'Scraping…' : 'Add URL and Scrape'}
                      </button>
                      {editScrapeStatus === 'error' && (
                        <p className="detail-empty error">{editScrapeError ?? 'Failed to scrape URL'}</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedTags.length ? (
                  <div className="detail-card">
                    <h3>Tags</h3>
                    <div className="pill-row">
                      {selectedTags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
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
            <button className="ghost-button" onClick={handleShareMenuToNotes}>
              Send to Notes
            </button>
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
            <button className="ghost-button" onClick={() => setShowShoppingList(true)}>
              View shopping list
            </button>
            {actionMessage && <span className="action-message">{actionMessage}</span>}
            {actionError && <span className="action-error">{actionError}</span>}
          </div>
          <div className="builder-shopping">
            <div className="builder-header">
              <div>
                <h3>Shopping List</h3>
                <p>
                  {ingredientGrouping === 'menu'
                    ? getShoppingListByMenu().reduce((sum, group) => sum + group.items.length, 0)
                    : getShoppingListByCategory().reduce((sum, group) => sum + group.items.length, 0)}{' '}
                  ingredients
                </p>
              </div>
              <label className="builder-toggle">
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
            <div className="builder-actions">
              <button className="ghost-button" onClick={handleCombineSelectedItems}>
                Combine selected
              </button>
            </div>
            {ingredientGrouping === 'menu' ? (
              getShoppingListByMenu().length ? (
                <div className="shopping-groups">
                  {getShoppingListByMenu().map((group) => (
                    <div key={group.section} className="shopping-group">
                      <h4>{group.section}</h4>
                      {group.items.length ? (
                        <ul className="builder-list">
                          {group.items.map((ingredient) => (
                            <li
                              key={ingredient}
                              className={`builder-row shopping-row${
                                selectedShoppingItems.has(
                                  makeShoppingSelectionKey(group.section, ingredient)
                                )
                                  ? ' shopping-selected'
                                  : ''
                              }`}
                              onClick={() => handleToggleShoppingSelection(group.section, ingredient)}
                            >
                              <span>{renderIngredientText(ingredient)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="builder-empty">No ingredients listed.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="builder-empty">No ingredients yet.</div>
              )
            ) : getShoppingListByCategory().length ? (
              <div className="shopping-groups">
                {getShoppingListByCategory().map((group) => (
                  <div key={group.section} className="shopping-group">
                    <h4>{group.section}</h4>
                    <ul className="builder-list">
                      {group.items.map((ingredient) => (
                        <li
                          key={ingredient}
                          className={`builder-row shopping-row${
                            selectedShoppingItems.has(
                              makeShoppingSelectionKey(group.section, ingredient)
                            )
                              ? ' shopping-selected'
                              : ''
                          }`}
                          onClick={() => handleToggleShoppingSelection(group.section, ingredient)}
                        >
                          <span>{renderIngredientText(ingredient)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="builder-empty">No ingredients yet.</div>
            )}
          </div>
        </aside>
          </main>
        </>
      )}
    </div>
  )
}
