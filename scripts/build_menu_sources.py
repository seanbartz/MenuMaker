import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
APP_DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "public" / "data"

MENUS_PATH = DATA_DIR / "menus.json"
OUT_PATH = DATA_DIR / "menu_item_sources.json"
OUT_APP_PATH = APP_DATA_DIR / "menu_item_sources.json"


def domain_from_url(url: str):
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        return host or None
    except Exception:
        return None


def main():
    data = json.loads(MENUS_PATH.read_text(encoding="utf-8"))
    menus = data.get("menus", [])

    domain_to_items = defaultdict(list)
    domain_counts = defaultdict(int)
    seen_url_items = defaultdict(set)

    for menu in menus:
        for item in menu.get("items", []):
            urls = []
            for link in item.get("links", []):
                if link.get("url"):
                    urls.append(link["url"])
            for url in item.get("urls", []):
                urls.append(url)

            for url in urls:
                domain = domain_from_url(url)
                if not domain:
                    continue

                if url in seen_url_items[domain]:
                    continue
                seen_url_items[domain].add(url)

                domain_counts[domain] += 1
                domain_to_items[domain].append({
                    "url": url,
                    "menu_file": menu.get("file"),
                    "menu_date": menu.get("week_of_date"),
                    "menu_season": menu.get("season"),
                    "item_text": item.get("text"),
                    "meal_type": item.get("meal_type"),
                })

    websites = []
    for domain, items in sorted(domain_to_items.items()):
        websites.append({
            "domain": domain,
            "count": domain_counts[domain],
            "items": items,
        })

    output = {
        "websites": websites,
    }

    OUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_APP_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")


if __name__ == "__main__":
    main()
