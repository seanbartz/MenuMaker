import json
import re
from pathlib import Path
from urllib.parse import urlparse

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "recipes.json"
APP_DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "public" / "data" / "recipes.json"

URL_RE = re.compile(r"https?://[^\s)]+")
HEADING_RE = re.compile(r"^\s*#\s+(?P<text>.+?)\s*$")


def title_from_url(url: str):
    try:
        parsed = urlparse(url)
    except Exception:
        return None
    path = parsed.path.strip("/")
    if not path:
        return None
    slug = path.split("/")[-1]
    slug = re.sub(r"\.[a-zA-Z0-9]+$", "", slug)
    slug = slug.replace("-", " ").replace("_", " ")
    slug = re.sub(r"\s+", " ", slug).strip()
    if not slug:
        return None
    return slug.title()


def looks_like_url(text: str) -> bool:
    lowered = text.lower()
    return lowered.startswith("http://") or lowered.startswith("https://") or ".com/" in lowered


def first_external_url(recipe):
    for url in recipe.get("urls", []):
        if url.startswith("http://") or url.startswith("https://"):
            return url
    for link in recipe.get("links", []):
        url = link.get("url")
        if url and (url.startswith("http://") or url.startswith("https://")):
            return url
    text = recipe.get("text", "")
    m = URL_RE.search(text)
    if m:
        return m.group(0)
    return None


def extract_heading_title(recipe):
    text = recipe.get("text", "")
    for line in text.splitlines():
        m = HEADING_RE.match(line)
        if m:
            heading = m.group("text").strip()
            if heading and not looks_like_url(heading):
                return heading
    return None


def fix_titles(recipes):
    changed = 0
    for recipe in recipes:
        title = (recipe.get("title") or "").strip()
        heading_title = extract_heading_title(recipe)

        if not title or looks_like_url(title):
            if heading_title:
                recipe["title"] = heading_title
                changed += 1
                continue

            url = first_external_url(recipe) or title
            new_title = title_from_url(url) if url else None
            if new_title:
                recipe["title"] = new_title
                changed += 1
                continue

        # If title looks like a URL but heading has a proper title, fix it.
        if looks_like_url(title) and heading_title:
            recipe["title"] = heading_title
            changed += 1

    return changed


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    recipes = data.get("recipes", [])
    changed = fix_titles(recipes)

    DATA_PATH.write_text(json.dumps({"recipes": recipes}, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_PATH.write_text(json.dumps({"recipes": recipes}, indent=2, ensure_ascii=True), encoding="utf-8")

    print(f"Fixed titles: {changed}")


if __name__ == "__main__":
    main()
