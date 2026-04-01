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

fn escape_applescript(value: &str) -> String {
  value
    .replace('\n', " ")
    .replace('\r', " ")
    .replace('\\', "\\\\")
    .replace('"', "\\\"")
}

#[tauri::command]
fn create_note_checklist(title: String, items: Vec<String>) -> Result<(), String> {
  let escaped_title = escape_applescript(&title);
  let normalized_title = title.trim().to_lowercase();
  let mut seen = std::collections::HashSet::new();
  let filtered_items = items
    .into_iter()
    .filter_map(|item| {
      let trimmed = item.trim();
      if trimmed.is_empty() {
        return None;
      }
      let normalized = trimmed.to_lowercase();
      if normalized == normalized_title {
        return None;
      }
      if seen.contains(&normalized) {
        return None;
      }
      seen.insert(normalized);
      Some(trimmed.to_string())
    })
    .collect::<Vec<_>>();
  let list_items = filtered_items
    .into_iter()
    .map(|item| format!("\"{}\"", escape_applescript(&item)))
    .collect::<Vec<_>>()
    .join(", ");

  let script = format!(
    "set itemList to {{{items}}}\n\
     tell application \"Notes\"\n\
       activate\n\
       set theNote to make new note at folder \"Notes\" with properties {{name:\"{title}\", body:\"\"}}\n\
       show theNote\n\
     end tell\n\
     delay 0.4\n\
     tell application \"System Events\"\n\
       tell process \"Notes\"\n\
         set frontmost to true\n\
         if (count of text areas of window 1) > 0 then\n\
           click (first text area of window 1)\n\
         end if\n\
         set the clipboard to \"{title}\"\n\
         keystroke \"v\" using {{command down}}\n\
         key code 36\n\
         key code 36\n\
         if (count of itemList) > 0 then\n\
           try\n\
             click menu bar item \"Format\" of menu bar 1\n\
             delay 0.2\n\
             click menu item \"Checklist\" of menu 1 of menu bar item \"Format\" of menu bar 1\n\
           on error\n\
             keystroke \"l\" using {{shift down, command down}}\n\
           end try\n\
           delay 0.2\n\
           set oldDelims to AppleScript's text item delimiters\n\
           set AppleScript's text item delimiters to return\n\
           set itemsText to itemList as text\n\
           set AppleScript's text item delimiters to oldDelims\n\
           set the clipboard to itemsText\n\
           keystroke \"v\" using {{command down}}\n\
           key code 36\n\
           delay 0.25\n\
         end if\n\
       end tell\n\
     end tell",
    title = escaped_title,
    items = list_items
  );

  let output = std::process::Command::new("osascript")
    .arg("-e")
    .arg(script)
    .output()
    .map_err(|err| err.to_string())?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if !stderr.trim().is_empty() {
      return Err(stderr);
    }
    if !stdout.trim().is_empty() {
      return Err(stdout);
    }
    return Err("Notes script failed with no output.".to_string());
  }
  Ok(())
}

#[derive(serde::Deserialize)]
struct NoteSection {
  heading: String,
  items: Vec<String>,
}

#[tauri::command]
fn create_note_checklist_with_headings(
  title: String,
  sections: Vec<NoteSection>,
) -> Result<(), String> {
  let escaped_title = escape_applescript(&title);
  let normalized_title = title.trim().to_lowercase();
  let mut section_chunks: Vec<String> = Vec::new();
  for section in sections {
    let heading = section.heading.trim();
    if heading.is_empty() {
      continue;
    }
    let mut seen = std::collections::HashSet::new();
    let filtered_items = section
      .items
      .into_iter()
      .filter_map(|item| {
        let trimmed = item.trim();
        if trimmed.is_empty() {
          return None;
        }
        let normalized = trimmed.to_lowercase();
        if normalized == normalized_title {
          return None;
        }
        if seen.contains(&normalized) {
          return None;
        }
        seen.insert(normalized);
        Some(escape_applescript(trimmed))
      })
      .collect::<Vec<_>>();

    if filtered_items.is_empty() {
      continue;
    }

    let items_list = filtered_items
      .into_iter()
      .map(|item| format!("\"{}\"", item))
      .collect::<Vec<_>>()
      .join(", ");
    section_chunks.push(format!(
      "{{heading:\"{}\", entries:{{{}}}}}",
      escape_applescript(heading),
      items_list
    ));
  }

  let sections_payload = section_chunks.join(", ");

  let script = format!(
    "set sectionList to {{{sections}}}\n\
     tell application \"Notes\" to activate\n\
     delay 0.2\n\
     tell application \"System Events\"\n\
       tell process \"Notes\"\n\
         set frontmost to true\n\
         keystroke \"n\" using {{command down}}\n\
         delay 0.4\n\
         if (count of text areas of window 1) > 0 then\n\
           click (first text area of window 1)\n\
         end if\n\
         set the clipboard to \"{title}\"\n\
         keystroke \"v\" using {{command down}}\n\
         key code 36\n\
         key code 36\n\
         repeat with sectionItem in sectionList\n\
           set sectionHeading to heading of sectionItem\n\
           set sectionItems to entries of sectionItem\n\
           set the clipboard to sectionHeading\n\
           keystroke \"v\" using {{command down}}\n\
           key code 36\n\
           key code 36\n\
           keystroke \"l\" using {{shift down, command down}}\n\
           delay 0.25\n\
           set oldDelims to AppleScript's text item delimiters\n\
           set AppleScript's text item delimiters to return\n\
           set itemsText to sectionItems as text\n\
           set AppleScript's text item delimiters to oldDelims\n\
           set the clipboard to itemsText\n\
           keystroke \"v\" using {{command down}}\n\
           key code 36\n\
           keystroke \"l\" using {{shift down, command down}}\n\
           delay 0.25\n\
           key code 36\n\
           delay 0.2\n\
         end repeat\n\
       end tell\n\
     end tell",
    title = escaped_title,
    sections = sections_payload
  );

  let output = std::process::Command::new("osascript")
    .arg("-e")
    .arg(script)
    .output()
    .map_err(|err| err.to_string())?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if !stderr.trim().is_empty() {
      return Err(stderr);
    }
    if !stdout.trim().is_empty() {
      return Err(stdout);
    }
    return Err("Notes script failed with no output.".to_string());
  }
  Ok(())
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
    .invoke_handler(tauri::generate_handler![
      load_data,
      save_data,
      scrape_recipe,
      create_note_checklist,
      create_note_checklist_with_headings
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
