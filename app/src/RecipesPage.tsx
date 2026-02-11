import { useMemo, useState } from 'react'
import './RecipesPage.css'

type Recipe = {
  file: string
  title: string | null
  links: { text: string; url: string }[]
  urls: string[]
  attachments: { text: string; url: string }[]
  text: string
}

const BASE = import.meta.env.BASE_URL

function parseRecipeContent(text: string) {
  const lines = text.split('\n')
  const ingredients: string[] = []
  const instructions: string[] = []
  let isInIngredients = false
  let isInInstructions = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lowerLine = line.toLowerCase()

    // Check for ingredients section
    if (lowerLine.includes('ingredient')) {
      isInIngredients = true
      isInInstructions = false
      continue
    }

    // Check for instructions/directions section
    if (lowerLine.includes('instruction') || lowerLine.includes('direction')) {
      isInInstructions = true
      isInIngredients = false
      continue
    }

    // Stop collecting when we hit a new section
    if (line.startsWith('##') || line.startsWith('#')) {
      if (isInIngredients && !lowerLine.includes('ingredient')) {
        isInIngredients = false
      }
      if (isInInstructions && !lowerLine.includes('instruction') && !lowerLine.includes('direction')) {
        isInInstructions = false
      }
      continue
    }

    // Collect ingredients (lines starting with * or •)
    if (isInIngredients && (line.trim().startsWith('*') || line.trim().startsWith('•'))) {
      ingredients.push(line.trim().substring(1).trim())
    }

    // Collect instructions (lines starting with * or numbered)
    if (isInInstructions) {
      const trimmed = line.trim()
      if (trimmed && (trimmed.startsWith('*') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
        instructions.push(trimmed.replace(/^[*•]\s*/, '').replace(/^\d+\.\s*/, ''))
      } else if (trimmed && instructions.length > 0) {
        // Continue previous instruction if it's not a bullet point but we're in instructions
        instructions[instructions.length - 1] += ' ' + trimmed
      }
    }
  }

  return { ingredients, instructions }
}

function extractImagePath(attachment: { text: string; url: string }) {
  // Extract just the image filename from the attachment URL
  const url = attachment.url
  if (url.startsWith('attachments/') || url.startsWith('../attachments/')) {
    const filename = url.split('/').pop()
    return `${BASE}images/${filename}`
  }
  return null
}

function extractSourceUrl(recipe: Recipe): string | null {
  // Look for external URLs (not attachments)
  const externalUrls = recipe.urls.filter(url => 
    !url.includes('attachments/') && 
    (url.startsWith('http://') || url.startsWith('https://'))
  )
  
  if (externalUrls.length > 0) {
    return externalUrls[0]
  }

  // Check links that are not attachments
  const externalLinks = recipe.links.filter(link => 
    !link.url.includes('attachments/') &&
    (link.url.startsWith('http://') || link.url.startsWith('https://'))
  )

  if (externalLinks.length > 0) {
    return externalLinks[0].url
  }

  return null
}

function getSiteName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface RecipesPageProps {
  recipes: Recipe[]
  onViewMenus: () => void
  onViewItems: () => void
}

export default function RecipesPage({ recipes, onViewMenus, onViewItems }: RecipesPageProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const sortedRecipes = useMemo(() => {
    return [...recipes]
      .filter(r => r.title && r.title.toLowerCase() !== 'blue apron recipes to copy')
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
  }, [recipes])

  const displayedRecipe = selectedRecipe ?? (sortedRecipes.length > 0 ? sortedRecipes[0] : null)

  const recipeContent = useMemo(() => {
    if (!displayedRecipe) return null
    return parseRecipeContent(displayedRecipe.text)
  }, [displayedRecipe])

  const recipeImage = useMemo(() => {
    if (!displayedRecipe) return null
    if (displayedRecipe.attachments.length > 0) {
      return extractImagePath(displayedRecipe.attachments[0])
    }
    return null
  }, [displayedRecipe])

  const sourceUrl = useMemo(() => {
    if (!displayedRecipe) return null
    return extractSourceUrl(displayedRecipe)
  }, [displayedRecipe])

  return (
    <div className="recipes-shell">
      <header className="recipes-header">
        <div>
          <p className="eyebrow">Recipe Collection</p>
          <h1>Recipes</h1>
        </div>
        <div className="header-meta">
          <div className="meta-card clickable" onClick={onViewMenus}>
            <span>Menus</span>
            <strong>View</strong>
          </div>
          <div className="meta-card clickable" onClick={onViewItems}>
            <span>Items</span>
            <strong>View</strong>
          </div>
          <div className="meta-card">
            <span>Total Recipes</span>
            <strong>{sortedRecipes.length}</strong>
          </div>
        </div>
      </header>

      <main className="recipes-main">
        <aside className="recipe-list">
          <div className="list-header">
            <h2>All Recipes</h2>
            <p>Select a recipe to view details</p>
          </div>

          <ul>
            {sortedRecipes.map((recipe) => {
              const isActive = displayedRecipe?.file === recipe.file
              return (
                <li key={recipe.file}>
                  <button
                    className={`recipe-card ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <strong>{recipe.title}</strong>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="recipe-detail">
          {displayedRecipe ? (
            <>
              <div className="detail-header">
                <div>
                  <h2>{displayedRecipe.title}</h2>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      View original recipe at {getSiteName(sourceUrl)} →
                    </a>
                  )}
                </div>
              </div>

              {recipeImage && (
                <div className="recipe-image">
                  <img src={recipeImage} alt={displayedRecipe.title ?? 'Recipe'} />
                </div>
              )}

              <div className="recipe-content">
                {recipeContent && recipeContent.ingredients.length > 0 && (
                  <div className="recipe-section">
                    <h3>Ingredients</h3>
                    <ul className="ingredients-list">
                      {recipeContent.ingredients.map((ingredient, idx) => (
                        <li key={idx}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipeContent && recipeContent.instructions.length > 0 && (
                  <div className="recipe-section">
                    <h3>Instructions</h3>
                    <ol className="instructions-list">
                      {recipeContent.instructions.map((instruction, idx) => (
                        <li key={idx}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {(!recipeContent || (recipeContent.ingredients.length === 0 && recipeContent.instructions.length === 0)) && (
                  <div className="raw-content">
                    <pre>{displayedRecipe.text}</pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty">No recipes available.</div>
          )}
        </section>
      </main>
    </div>
  )
}
