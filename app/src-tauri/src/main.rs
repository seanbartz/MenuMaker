#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use scraper::{Html, Selector};
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[derive(Serialize, Deserialize)]
struct StoredData {
  menus: serde_json::Value,
  items: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct ScrapeResult {
  title: String,
  ingredients: Vec<String>,
  tags: Vec<String>,
  main_protein: String,
}

fn resolve_path(app: &AppHandle, filename: &str) -> Result<PathBuf, String> {
  app
    .path()
    .resolve(filename, BaseDirectory::AppData)
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<StoredData>, String> {
  let menus_path = resolve_path(&app, "menus.json")?;
  let items_path = resolve_path(&app, "menu_items_refactored.json")?;

  if !menus_path.exists() || !items_path.exists() {
    return Ok(None);
  }

  let menus_raw = fs::read_to_string(menus_path).map_err(|err| err.to_string())?;
  let items_raw = fs::read_to_string(items_path).map_err(|err| err.to_string())?;

  let menus: serde_json::Value =
    serde_json::from_str(&menus_raw).map_err(|err| err.to_string())?;
  let items: serde_json::Value =
    serde_json::from_str(&items_raw).map_err(|err| err.to_string())?;

  Ok(Some(StoredData { menus, items }))
}

#[tauri::command]
fn save_data(app: AppHandle, menus: serde_json::Value, items: serde_json::Value) -> Result<(), String> {
  let menus_path = resolve_path(&app, "menus.json")?;
  let items_path = resolve_path(&app, "menu_items_refactored.json")?;

  if let Some(parent) = menus_path.parent() {
    fs::create_dir_all(parent).map_err(|err| err.to_string())?;
  }

  fs::write(
    menus_path,
    serde_json::to_string_pretty(&menus).map_err(|err| err.to_string())?,
  )
  .map_err(|err| err.to_string())?;

  fs::write(
    items_path,
    serde_json::to_string_pretty(&items).map_err(|err| err.to_string())?,
  )
  .map_err(|err| err.to_string())?;

  Ok(())
}

fn extract_text(element: scraper::element_ref::ElementRef) -> String {
  element.text().collect::<Vec<_>>().join(" ").trim().to_string()
}

fn normalize_whitespace(value: &str) -> String {
  value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn dedupe(mut values: Vec<String>) -> Vec<String> {
  values.retain(|v| !v.is_empty());
  let mut out = Vec::new();
  for v in values.drain(..) {
    if !out.iter().any(|e: &String| e.eq_ignore_ascii_case(&v)) {
      out.push(v);
    }
  }
  out
}

fn detect_protein(ingredients: &[String]) -> String {
  if ingredients.is_empty() {
    return "unknown".to_string();
  }
  let text = ingredients.join(" ").to_lowercase();
  let has = |terms: &[&str]| terms.iter().any(|t| text.contains(t));
  if has(&["tofu", "tempeh", "seitan"]) {
    return "tofu".to_string();
  }
  if has(&[
    "chicken", "beef", "pork", "turkey", "sausage", "bacon", "ham", "salmon", "tuna", "shrimp",
    "scallop", "crab", "fish", "egg", "lamb",
  ]) {
    return "meat".to_string();
  }
  if has(&["lentil", "bean", "beans", "chickpea"]) {
    return "vegetarian".to_string();
  }
  "vegetarian".to_string()
}

fn extract_from_json_ld(doc: &Html) -> (Vec<String>, Vec<String>) {
  let mut ingredients = Vec::new();
  let mut tags = Vec::new();
  let script_sel = Selector::parse("script[type='application/ld+json']").unwrap();
  for el in doc.select(&script_sel) {
    let raw = extract_text(el);
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&raw);
    if parsed.is_err() {
      continue;
    }
    let value = parsed.unwrap();
    let nodes = if value.is_array() {
      value.as_array().cloned().unwrap_or_default()
    } else {
      vec![value]
    };
    for node in nodes {
      let recipe = if node.get("@type").and_then(|v| v.as_str()) == Some("Recipe") {
        Some(node)
      } else if let Some(graph) = node.get("@graph").and_then(|v| v.as_array()) {
        graph.iter().find(|n| n.get("@type").and_then(|v| v.as_str()) == Some("Recipe")).cloned()
      } else {
        None
      };
      if let Some(recipe) = recipe {
        if let Some(list) = recipe.get("recipeIngredient").and_then(|v| v.as_array()) {
          for ing in list {
            if let Some(text) = ing.as_str() {
              ingredients.push(normalize_whitespace(text));
            }
          }
        }
        if let Some(list) = recipe.get("keywords").and_then(|v| v.as_str()) {
          for part in list.split(',') {
            let text = normalize_whitespace(part);
            if !text.is_empty() {
              tags.push(text);
            }
          }
        }
        if let Some(list) = recipe.get("recipeCategory").and_then(|v| v.as_array()) {
          for cat in list {
            if let Some(text) = cat.as_str() {
              tags.push(normalize_whitespace(text));
            }
          }
        }
      }
    }
  }
  (dedupe(ingredients), dedupe(tags))
}

#[tauri::command]
async fn scrape_recipe(url: String) -> Result<ScrapeResult, String> {
  let client = reqwest::Client::builder()
    .user_agent("MenuMaker Desktop/0.1")
    .build()
    .map_err(|err| err.to_string())?;

  let res = client
    .get(&url)
    .send()
    .await
    .map_err(|err| err.to_string())?;

  let html = res.text().await.map_err(|err| err.to_string())?;
  let doc = Html::parse_document(&html);

  let title = {
    let og = Selector::parse("meta[property='og:title']").unwrap();
    if let Some(el) = doc.select(&og).next() {
      if let Some(content) = el.value().attr("content") {
        normalize_whitespace(content)
      } else {
        String::new()
      }
    } else {
      let title_sel = Selector::parse("title").unwrap();
      if let Some(el) = doc.select(&title_sel).next() {
        normalize_whitespace(&extract_text(el))
      } else {
        String::new()
      }
    }
  };

  let (json_ld_ingredients, json_ld_tags) = extract_from_json_ld(&doc);

  let mut ingredients = Vec::new();
  let ingredient_prop = Selector::parse("[itemprop='recipeIngredient']").unwrap();
  for el in doc.select(&ingredient_prop) {
    let text = normalize_whitespace(&extract_text(el));
    if !text.is_empty() {
      ingredients.push(text);
    }
  }

  if ingredients.is_empty() {
    let ingredient_list = Selector::parse(
      ".ingredients li, li[class*='ingredient'], .wprm-recipe-ingredient, .tasty-recipes-ingredients li",
    )
    .unwrap();
    for el in doc.select(&ingredient_list) {
      let text = normalize_whitespace(&extract_text(el));
      if !text.is_empty() {
        ingredients.push(text);
      }
    }
  }

  let mut tags = Vec::new();
  let tag_meta = Selector::parse("meta[property='article:tag'], meta[name='keywords']").unwrap();
  for el in doc.select(&tag_meta) {
    if let Some(content) = el.value().attr("content") {
      let parts = content
        .split(',')
        .map(|v| normalize_whitespace(v))
        .filter(|v| !v.is_empty());
      tags.extend(parts);
    }
  }

  let tag_sel = Selector::parse("a[rel='tag'], .tags a, .tag a").unwrap();
  for el in doc.select(&tag_sel) {
    let text = normalize_whitespace(&extract_text(el));
    if !text.is_empty() {
      tags.push(text);
    }
  }

  if ingredients.is_empty() {
    ingredients = json_ld_ingredients;
  } else if !json_ld_ingredients.is_empty() {
    ingredients.extend(json_ld_ingredients);
  }

  if !json_ld_tags.is_empty() {
    tags.extend(json_ld_tags);
  }

  let ingredients = dedupe(ingredients);
  let tags = dedupe(tags);
  let main_protein = detect_protein(&ingredients);

  Ok(ScrapeResult {
    title,
    ingredients,
    tags,
    main_protein,
  })
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![load_data, save_data, scrape_recipe])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
