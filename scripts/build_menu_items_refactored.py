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

    items.sort(key=lambda x: (-x["count"], x["url"] or "")) 

    output = {"items": items}
    OUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_APP_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")


if __name__ == "__main__":
    main()
