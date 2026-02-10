#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[derive(Serialize, Deserialize)]
struct StoredData {
  menus: serde_json::Value,
  items: serde_json::Value,
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

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![load_data, save_data])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
