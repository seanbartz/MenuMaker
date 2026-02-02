import json
import re
from pathlib import Path
from datetime import datetime
from typing import Optional

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
URL_RE = re.compile(r"https?://[^\s\)\]\(]+")
CHECKBOX_TOKEN_RE = re.compile(r"-\s*\[(?P<mark>[xX\s])\]\s*")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
TRAILING_PAREN_RE = re.compile(r"\(([^)]+)\)\s*$")


def extract_links(text: str):
    md_matches = list(MD_LINK_RE.finditer(text))
    md_links = [{"text": m.group(1), "url": m.group(2)} for m in md_matches]
    md_spans = [m.span() for m in md_matches]
    md_urls = {m.group(2) for m in md_matches}

    def overlaps_md(span):
        return any(span[0] >= start and span[1] <= end for start, end in md_spans)

    urls = []
    for m in URL_RE.finditer(text):
        span = m.span()
        if overlaps_md(span):
            continue
        url = m.group(0)
        if url in md_urls:
            continue
        urls.append(url)

    return md_links, urls


def strip_urls_from_text(text: str):
    """Remove markdown links and plain URLs from text, leaving only the description."""
    # First, replace markdown links with their text (e.g., [text](url) -> text)
    text = MD_LINK_RE.sub(r'\1', text)
    # Then remove any remaining plain URLs
    text = URL_RE.sub('', text)
    # Remove URLs without protocol (e.g., domain.com/path)
    text = re.sub(r'\b[a-z0-9-]+\.(com|net|org|edu|gov)/[^\s]*', '', text, flags=re.IGNORECASE)
    # Remove orphaned HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    # Remove URL fragments that look like path/to/recipe/#anchor
    text = re.sub(r'\b[a-z]+-[a-z]+-[a-z]+(?:-[a-z]+)*/#[^\s]*', '', text)
    # Clean up extra whitespace
    text = ' '.join(text.split())
    return text.strip()


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


def season_label(iso_date: Optional[str]):
    if not iso_date:
        return "unknown"
    try:
        dt = datetime.fromisoformat(iso_date)
    except ValueError:
        return "unknown"
    month = dt.month
    if month <= 2 or month == 12:
        return "winter"
    if 3 <= month <= 5:
        return "spring"
    if 6 <= month <= 8:
        return "summer"
    return "fall"


def infer_meal_type(section: Optional[str], item_text: str):
    text = " ".join(filter(None, [section, item_text])).lower()
    if any(word in text for word in ["breakfast", "brunch"]):
        return "breakfast"
    if "lunch" in text:
        return "lunch"
    if any(word in text for word in ["snack", "snacks"]):
        return "snack"
    if "dessert" in text:
        return "dessert"
    if "drink" in text:
        return "drink"
    return "dinner"


def warn_if_dirty_lines(path: Path, lines):
    for idx, line in enumerate(lines, start=1):
        checkbox_tokens = list(CHECKBOX_TOKEN_RE.finditer(line))
        if len(checkbox_tokens) > 1:
            print(f"Warning: {path} has multiple checkbox items on one line at {idx}")
            continue

        if checkbox_tokens:
            text = line[checkbox_tokens[0].end():].strip()
            md_links, urls = extract_links(text)
            if len(md_links) + len(urls) > 1:
                print(f"Warning: {path} has multiple links on one item at {idx}")


def parse_menu_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    warn_if_dirty_lines(path, lines)

    title = None
    week_of_date = parse_date_from_filename(path.name)
    season = season_label(week_of_date)

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
            # Strip URLs from the text since they're now in clickable pills
            clean_text = strip_urls_from_text(item_text)
            items.append({
                "text": clean_text,
                "section": current_section,
                "meal_type": infer_meal_type(current_section, item_text),
                "season": season,
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
        "season": season,
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
