import json
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
APP_DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "public" / "data"

MENUS_PATH = DATA_DIR / "menus.json"
OUT_PATH = DATA_DIR / "menu_items_refactored.json"
OUT_APP_PATH = APP_DATA_DIR / "menu_items_refactored.json"


def unique_preserve(seq):
    seen = set()
    out = []
    for item in seq:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def get_primary_title(item):
    """Get the primary title from an item (first non-empty link_text or item_text)."""
    # Try link_texts first
    for text in item.get("link_texts", []):
        if text and text.strip():
            return text.strip()
    # Then try item_texts
    for text in item.get("item_texts", []):
        if text and text.strip():
            return text.strip()
    return None


def merge_items_by_title(items):
    """Merge items with duplicate titles (case-insensitive)."""
    # Group items by case-insensitive title
    title_groups = defaultdict(list)
    no_title_items = []
    
    for item in items:
        title = get_primary_title(item)
        if title:
            # Use lowercase title as key for case-insensitive grouping
            key = title.lower()
            title_groups[key].append(item)
        else:
            # Keep items with no title as-is
            no_title_items.append(item)
    
    # Merge items with duplicate titles
    merged_items = []
    
    for title_key, items_list in title_groups.items():
        if len(items_list) > 1:
            # Multiple items with same title - merge them
            merged = {
                "url": None,
                "urls": [],
                "link_texts": [],
                "menu_files": [],
                "menu_weeks": [],
                "menu_seasons": [],
                "meal_types": [],
                "sections": [],
                "source_hints": [],
                "item_texts": [],
            }
            
            # Prefer a non-null URL if available
            for item in items_list:
                if item.get("url"):
                    merged["url"] = item["url"]
                    break
            
            # Combine all lists
            for item in items_list:
                for key in ["urls", "link_texts", "menu_files", "menu_weeks", "menu_seasons",
                            "meal_types", "sections", "source_hints", "item_texts"]:
                    merged[key].extend(item.get(key, []))
            
            # Deduplicate all lists
            for key in ["urls", "link_texts", "menu_files", "menu_weeks", "menu_seasons",
                        "meal_types", "sections", "source_hints", "item_texts"]:
                merged[key] = unique_preserve([x for x in merged[key] if x])
            
            # Calculate count
            merged["count"] = len(merged["menu_files"])
            
            merged_items.append(merged)
        else:
            # Single item with this title - keep as-is
            merged_items.append(items_list[0])
    
    # Add items with no title
    merged_items.extend(no_title_items)
    
    return merged_items


def main():
    data = json.loads(MENUS_PATH.read_text(encoding="utf-8"))
    menus = data.get("menus", [])

    grouped = defaultdict(lambda: {
        "urls": [],
        "link_texts": [],
        "menu_files": [],
        "menu_weeks": [],
        "menu_seasons": [],
        "meal_types": [],
        "sections": [],
        "source_hints": [],
        "item_texts": [],
    })

    for menu in menus:
        menu_file = menu.get("file")
        menu_week = menu.get("week_of_date")
        menu_season = menu.get("season")

        for index, item in enumerate(menu.get("items", [])):
            urls = []
            for link in item.get("links", []):
                url = link.get("url")
                if url:
                    urls.append(url)
            for url in item.get("urls", []):
                urls.append(url)

            if not urls:
                unique_key = f"no_url::{menu_file}::{index}"
                entry = grouped[unique_key]
                entry["menu_files"].append(menu_file)
                entry["menu_weeks"].append(menu_week)
                entry["menu_seasons"].append(menu_season)
                entry["meal_types"].append(item.get("meal_type"))
                entry["sections"].append(item.get("section"))
                entry["source_hints"].append(item.get("source_hint"))
                entry["item_texts"].append(item.get("text"))
                continue

            for url in urls:
                entry = grouped[url]
                entry["urls"].append(url)
                entry["menu_files"].append(menu_file)
                entry["menu_weeks"].append(menu_week)
                entry["menu_seasons"].append(menu_season)
                entry["meal_types"].append(item.get("meal_type"))
                entry["sections"].append(item.get("section"))
                entry["source_hints"].append(item.get("source_hint"))
                entry["item_texts"].append(item.get("text"))
                for link in item.get("links", []):
                    if link.get("url") == url and link.get("text"):
                        entry["link_texts"].append(link["text"])

    items = []
    for key, entry in grouped.items():
        items.append({
            "url": None if key.startswith("no_url::") else key,
            "urls": unique_preserve(entry["urls"]),
            "link_texts": unique_preserve([t for t in entry["link_texts"] if t]),
            "menu_files": unique_preserve([f for f in entry["menu_files"] if f]),
            "menu_weeks": unique_preserve([w for w in entry["menu_weeks"] if w]),
            "menu_seasons": unique_preserve([s for s in entry["menu_seasons"] if s]),
            "meal_types": unique_preserve([m for m in entry["meal_types"] if m]),
            "sections": unique_preserve([s for s in entry["sections"] if s]),
            "source_hints": unique_preserve([h for h in entry["source_hints"] if h]),
            "item_texts": unique_preserve([t for t in entry["item_texts"] if t]),
            "count": len(entry["menu_files"]),
        })

    # Merge items with duplicate titles (case-insensitive)
    items = merge_items_by_title(items)

    # After merging, re-rank items by their (possibly combined) count and URL.
    # This intentionally allows merged items to change position based on updated counts.
    items.sort(key=lambda x: (-x["count"], x["url"] or "")) 

    output = {"items": items}
    OUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_APP_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")


if __name__ == "__main__":
    main()
