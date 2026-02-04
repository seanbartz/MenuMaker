import json
import re
from pathlib import Path
from urllib.parse import urlparse

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "menu_items_refactored.json"
APP_DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "public" / "data" / "menu_items_refactored.json"

URL_LIKE_RE = re.compile(r"https?://|\.(com|net|org|edu|gov)/", re.IGNORECASE)


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
    return bool(URL_LIKE_RE.search(text))


def clean_titles(item):
    link_texts = item.get("link_texts", [])
    url = item.get("url")
    derived = title_from_url(url) if url else None

    # If link_texts are URL-like, replace with derived title
    if link_texts and all(looks_like_url(t) for t in link_texts):
        if derived:
            item["link_texts"] = [derived]
            return True

    # If no link_texts and we can derive from url
    if (not link_texts or all(not t.strip() for t in link_texts)) and url:
        if derived:
            item["link_texts"] = [derived]
            return True

    # Replace any individual URL-like link_texts if we can derive a title
    if derived and link_texts and any(looks_like_url(t) for t in link_texts):
        new_texts = [derived if looks_like_url(t) else t for t in link_texts]
        item["link_texts"] = new_texts
        return True

    return False


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])
    changed = 0

    for item in items:
        if clean_titles(item):
            changed += 1

    DATA_PATH.write_text(json.dumps({"items": items}, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_PATH.write_text(json.dumps({"items": items}, indent=2, ensure_ascii=True), encoding="utf-8")

    print(f"Fixed refactored titles: {changed}")


if __name__ == "__main__":
    main()
