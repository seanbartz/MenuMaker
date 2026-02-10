export type MenuItem = {
  text: string
  section: string | null
  meal_type: string
  source_hint: string | null
  links: { text: string; url: string; auto_added?: boolean }[]
  urls: string[]
}

export type Menu = {
  file: string
  title: string | null
  week_of_date: string | null
  items: MenuItem[]
}

export type Recipe = {
  file: string
  title: string | null
  links: { text: string; url: string }[]
  urls: string[]
  attachments: { text: string; url: string }[]
  text: string
}

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
  side_dishes?: string[]
}
