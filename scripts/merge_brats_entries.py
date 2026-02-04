#!/usr/bin/env python3
"""
Script to merge brats/burgers entries in menu_items_refactored.json.

For entries with "brats and X" or "burgers and X" in item_texts:
1. Extract X (the side dish) and add to "side_dish" field
2. Update item_texts to remove the side dish, leaving just "brats" or "burgers"
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
    Extract side dish from text containing "brats and X" or "burgers and X".
    Returns (cleaned_text, side_dish) or (text, None) if no match.
    Only matches the whole word "brats" or "burgers".
    """
    pattern = r'(.*)\b([Bb]rats|[Bb]urgers)\s+and\s+(.+?)$'
    match = re.search(pattern, text)

    if match:
        prefix = match.group(1).strip()
        main_word = match.group(2)
        side_dish = match.group(3).strip()

        # Skip if side dish is just the other main word
        if side_dish.lower() in {"brats", "burgers"}:
            return text, None

        # Remove trailing punctuation and whitespace from side dish
        side_dish = re.sub(r'[,.\s]+$', '', side_dish)

        if prefix:
            cleaned_text = f"{prefix} {main_word}".strip()
        else:
            cleaned_text = main_word

        return cleaned_text, side_dish

    return text, None


def process_entry(entry):
    modified = False
    item_texts = entry.get("item_texts", [])
    side_dishes = []
    new_item_texts = []

    for text in item_texts:
        cleaned_text, side_dish = extract_side_dish_from_text(text)
        new_item_texts.append(cleaned_text)

        if side_dish:
            modified = True
            side_dishes.append(side_dish)

    if not modified:
        return entry, False

    entry["item_texts"] = new_item_texts

    unique_side_dishes = []
    seen = set()
    for sd in side_dishes:
        sd_lower = sd.lower()
        if sd_lower not in seen:
            seen.add(sd_lower)
            unique_side_dishes.append(sd)

    entry["side_dish"] = unique_side_dishes

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

    modified_count = 0
    for i, entry in enumerate(items):
        entry_str = json.dumps(entry.get("item_texts", [])).lower()
        if "brats and" in entry_str or "burgers and" in entry_str:
            new_entry, was_modified = process_entry(entry)
            if was_modified:
                items[i] = new_entry
                modified_count += 1

    print(f"Total entries modified: {modified_count}")

    data["items"] = items

    print(f"Saving to {MENU_ITEMS_PATH}...")
    with open(MENU_ITEMS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=True)

    print(f"Saving to {MENU_ITEMS_APP_PATH}...")
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(MENU_ITEMS_APP_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=True)

    print("Done!")


if __name__ == "__main__":
    main()
