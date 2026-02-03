import json
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
APP_DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "public" / "data"

# Input and output are the same - we update the file in place
IN_PATH = DATA_DIR / "menu_items_refactored.json"
OUT_PATH = DATA_DIR / "menu_items_refactored.json"
OUT_APP_PATH = APP_DATA_DIR / "menu_items_refactored.json"


def unique_preserve(seq):
    """Preserve unique items in order."""
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


def merge_items(items_to_merge):
    """Merge multiple items into one, combining all their data."""
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

    # Select a non-null URL deterministically:
    # - choose the most common URL among items_to_merge
    # - if there is a tie, choose the lexicographically smallest URL
    url_counts = {}
    for item in items_to_merge:
        url = item.get("url")
        if url:
            url_counts[url] = url_counts.get(url, 0) + 1
    if url_counts:
        max_count = max(url_counts.values())
        candidates = [u for u, count in url_counts.items() if count == max_count]
        merged["url"] = sorted(candidates)[0]
    
    # Combine all lists
    for item in items_to_merge:
        for key in ["urls", "link_texts", "menu_files", "menu_weeks", "menu_seasons",
                    "meal_types", "sections", "source_hints", "item_texts"]:
            merged[key].extend(item.get(key, []))
    
    # Deduplicate all lists
    for key in ["urls", "link_texts", "menu_files", "menu_weeks", "menu_seasons",
                "meal_types", "sections", "source_hints", "item_texts"]:
        merged[key] = unique_preserve([x for x in merged[key] if x])
    
    # Calculate count
    merged["count"] = len(merged["menu_files"])
    
    return merged


def main():
    # Make a backup of the original file before processing
    backup_path = DATA_DIR / "menu_items_refactored.json.backup"
    if IN_PATH.exists():
        import shutil
        shutil.copy2(IN_PATH, backup_path)
        print(f"Created backup at {backup_path}")
    
    try:
        # Read input file
        data = json.loads(IN_PATH.read_text(encoding="utf-8"))
        items = data.get("items", [])
        
        print(f"Original item count: {len(items)}")
        
        # Group items by case-insensitive title
        grouped = defaultdict(list)
        no_title_items = []
        
        for item in items:
            title = get_primary_title(item)
            if title:
                # Use lowercase title as key for case-insensitive grouping
                key = title.lower()
                grouped[key].append(item)
            else:
                # Keep items with no title as-is
                no_title_items.append(item)
        
        # Merge items with duplicate titles
        merged_items = []
        merge_count = 0
        
        for title_key, items_list in grouped.items():
            if len(items_list) > 1:
                # Multiple items with same title - merge them
                print(f"Merging {len(items_list)} items with title: {get_primary_title(items_list[0])}")
                merged = merge_items(items_list)
                merged_items.append(merged)
                merge_count += 1
            else:
                # Single item with this title - keep as-is
                merged_items.append(items_list[0])
        
        # Add items with no title
        merged_items.extend(no_title_items)
        
        # Sort by count (descending) then by url
        merged_items.sort(key=lambda x: (-x["count"], x["url"] or ""))
        
        print(f"Merged item count: {len(merged_items)}")
        print(f"Number of title groups merged: {merge_count}")
        print(f"Items without titles: {len(no_title_items)}")
        
        # Write output
        output = {"items": merged_items}
        OUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")
        APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
        OUT_APP_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")
        
        print(f"Output written to {OUT_PATH} and {OUT_APP_PATH}")
        
        # If successful, delete the backup
        if backup_path.exists():
            backup_path.unlink()
            print(f"Backup deleted successfully")
    
    except Exception as e:
        # If an error occurs, restore from backup
        print(f"Error occurred: {e}")
        if backup_path.exists():
            import shutil
            shutil.copy2(backup_path, IN_PATH)
            print(f"Restored from backup")
        raise


if __name__ == "__main__":
    main()
