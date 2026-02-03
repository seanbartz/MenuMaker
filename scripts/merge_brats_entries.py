#!/usr/bin/env python3
"""
Script to merge brats entries in menu_items_refactored.json.

For entries with "brats and X" in item_texts:
1. Extract X (the side dish) and add to "side_dish" field
2. Update item_texts to remove the side dish, leaving just "brats" or "Brats"
3. Add "grill" to meal_types if not already present
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
APP_DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "public" / "data"

MENU_ITEMS_PATH = DATA_DIR / "menu_items_refactored.json"
MENU_ITEMS_APP_PATH = APP_DATA_DIR / "menu_items_refactored.json"


def extract_side_dish_from_text(text):
    """
    Extract side dish from text containing "brats and X".
    Returns (cleaned_text, side_dish) or (text, None) if no match.
    Only matches the whole word "brats", not as part of another word.
    """
    # Match text containing "brats and" (case insensitive) as a whole word
    # Use word boundary \b to ensure we only match "brats" not "brats" in "burgers and brats"
    pattern = r'(.*)\b([Bb]rats)\s+and\s+(.+?)$'
    match = re.search(pattern, text)
    
    if match:
        prefix = match.group(1).strip()
        brats_word = match.group(2)
        side_dish = match.group(3).strip()
        
        # Remove trailing punctuation and whitespace from side dish
        side_dish = re.sub(r'[,\.\s]+$', '', side_dish)
        
        # Construct cleaned text with space between prefix and brats
        if prefix:
            cleaned_text = f"{prefix} {brats_word}".strip()
        else:
            cleaned_text = brats_word
        
        return cleaned_text, side_dish
    
    return text, None


def process_entry(entry):
    """
    Process a single menu item entry to merge brats entries.
    Returns (modified_entry, was_modified).
    """
    modified = False
    item_texts = entry.get("item_texts", [])
    side_dishes = []
    new_item_texts = []
    
    # Process each item text
    for text in item_texts:
        cleaned_text, side_dish = extract_side_dish_from_text(text)
        new_item_texts.append(cleaned_text)
        
        if side_dish:
            modified = True
            side_dishes.append(side_dish)
    
    if not modified:
        return entry, False
    
    # Update the entry
    entry["item_texts"] = new_item_texts
    
    # Add side_dish field
    # Remove duplicates while preserving order
    unique_side_dishes = []
    seen = set()
    for sd in side_dishes:
        sd_lower = sd.lower()
        if sd_lower not in seen:
            seen.add(sd_lower)
            unique_side_dishes.append(sd)
    
    entry["side_dish"] = unique_side_dishes
    
    # Add "grill" to meal_types if not present
    meal_types = entry.get("meal_types", [])
    if "grill" not in meal_types:
        meal_types.append("grill")
        entry["meal_types"] = meal_types
    
    return entry, True


def main():
    print("Loading menu_items_refactored.json...")
    with open(MENU_ITEMS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data.get("items", [])
    print(f"Total items: {len(items)}")
    
    # Find and process entries with "brats and"
    modified_count = 0
    for i, entry in enumerate(items):
        # Check if any item_texts contain "brats and"
        entry_str = json.dumps(entry.get("item_texts", [])).lower()
        if "brats and" in entry_str:
            new_entry, was_modified = process_entry(entry)
            if was_modified:
                items[i] = new_entry
                modified_count += 1
                print(f"\nModified entry {i}:")
                print(f"  Old item_texts: {entry.get('item_texts', [])[:2]}...")
                print(f"  New item_texts: {new_entry.get('item_texts', [])[:2]}...")
                print(f"  Side dishes: {new_entry.get('side_dish', [])}")
                print(f"  Meal types: {new_entry.get('meal_types', [])}")
    
    print(f"\n\nTotal entries modified: {modified_count}")
    
    # Save the modified data
    data["items"] = items
    
    print(f"\nSaving to {MENU_ITEMS_PATH}...")
    with open(MENU_ITEMS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=True)
    
    print(f"Saving to {MENU_ITEMS_APP_PATH}...")
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(MENU_ITEMS_APP_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=True)
    
    print("\nDone!")


if __name__ == "__main__":
    main()
