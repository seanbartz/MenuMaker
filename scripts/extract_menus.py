import json
import re
from pathlib import Path
from datetime import datetime

MENUS_DIR = Path(__file__).resolve().parents[1] / "Menus"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
OUT_MENUS_PATH = DATA_DIR / "menus.json"
OUT_RECIPES_PATH = DATA_DIR / "recipes.json"

DATE_PATTERNS = [
    # Menu week of 6-1-21, Menu week of 12-31-2020, Week of 7-27-25
    re.compile(r"(?:Menu\s+week\s+of|Week\s+of)\s+(\d{1,2})-(\d{1,2})-(\d{2,4})", re.IGNORECASE),
]

CHECKBOX_RE = re.compile(r"^\s*-\s*\[(?P<mark>[xX\s])\]\s*(?P<text>.+?)\s*$")
HEADING_RE = re.compile(r"^\s*#{1,6}\s*(?P<text>.+?)\s*$")
SECTION_RE = re.compile(r"^\s*([A-Za-z][A-Za-z\s'&]+?)(?:\s*\(\d+\))?\s*$")
URL_RE = re.compile(r"https?://[^\s)]+")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
TRAILING_PAREN_RE = re.compile(r"\(([^)]+)\)\s*$")


def extract_links(text: str):
    md_links = [{"text": m.group(1), "url": m.group(2)} for m in MD_LINK_RE.finditer(text)]
    urls = [m.group(0) for m in URL_RE.finditer(text)]
    return md_links, urls


def extract_source_hint(text: str):
    m = TRAILING_PAREN_RE.search(text)
    if not m:
        return None
    hint = m.group(1).strip()
    if not hint:
        return None
    # Ignore parens with digits (often dates/quantities/notes)
    if any(ch.isdigit() for ch in hint):
        return None
    return hint


def parse_date_from_filename(name: str):
    for pat in DATE_PATTERNS:
        m = pat.search(name)
        if not m:
            continue
        month, day, year = m.group(1), m.group(2), m.group(3)
        year = int(year)
        if year < 100:
            # Assume 2000s for 2-digit years
            year += 2000
        try:
            dt = datetime(year, int(month), int(day))
            return dt.date().isoformat()
        except ValueError:
            return None
    return None


def parse_menu_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    title = None
    week_of_date = parse_date_from_filename(path.name)

    items = []
    current_section = None

    for line in lines:
        if title is None:
            m = HEADING_RE.match(line)
            if m:
                title = m.group("text").strip()

        cb = CHECKBOX_RE.match(line)
        if cb:
            mark = cb.group("mark")
            item_text = cb.group("text").strip()
            md_links, urls = extract_links(item_text)
            items.append({
                "text": item_text,
                "checked": mark.lower() == "x",
                "section": current_section,
                "source_hint": extract_source_hint(item_text),
                "links": md_links,
                "urls": urls,
            })
            continue

        # Lightweight section detection (e.g., Breakfast, Lunches, Dinner, Snacks, Drinks)
        if line.strip() and not line.strip().startswith("-"):
            sm = SECTION_RE.match(line.strip())
            if sm and sm.group(1).lower() in {
                "breakfast", "breakfasts", "lunch", "lunches", "dinner", "dinners",
                "snack", "snacks", "drinks", "dessert", "desserts",
            }:
                current_section = sm.group(1).strip()

    return {
        "file": str(path.relative_to(path.parents[1])),
        "title": title,
        "week_of_date": week_of_date,
        "items": items,
    }


def parse_recipe_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    title = None
    for line in lines:
        m = HEADING_RE.match(line)
        if m:
            title = m.group("text").strip()
            break

    md_links, urls = extract_links(text)
    attachments = [
        {"text": m.group(1), "url": m.group(2)}
        for m in MD_LINK_RE.finditer(text)
        if m.group(2).startswith("attachments/") or m.group(2).startswith("../attachments/")
    ]

    return {
        "file": str(path.relative_to(path.parents[1])),
        "title": title,
        "links": md_links,
        "urls": urls,
        "attachments": attachments,
        "text": text,
    }


def main():
    menu_files = sorted(MENUS_DIR.glob("*.md"))
    menus = [parse_menu_file(p) for p in menu_files]

    recipe_files = sorted((MENUS_DIR.parent / "Recipes").glob("*.md"))
    recipes = [parse_recipe_file(p) for p in recipe_files]

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_MENUS_PATH.write_text(
        json.dumps({"menus": menus}, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )
    OUT_RECIPES_PATH.write_text(
        json.dumps({"recipes": recipes}, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
