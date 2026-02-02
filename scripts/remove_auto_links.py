import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "menus.json"
APP_DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "public" / "data" / "menus.json"

REMOVE_URLS = {
    "https://foodbymars.com/instant-pot-chicken-chili-verde-paleo-whole30/",
    "https://www.foodnetwork.com/recipes/food-network-kitchen/bulgur-salad-recipe-2103552",
    "https://www.campbells.com/recipes/easy-irish-potato-soup/",
}


def prune(menus):
    removed = 0
    for menu in menus:
        for item in menu.get("items", []):
            links = item.get("links", [])
            if not links:
                continue
            new_links = []
            for link in links:
                url = link.get("url")
                if url in REMOVE_URLS and link.get("auto_added") is True:
                    removed += 1
                    continue
                new_links.append(link)
            item["links"] = new_links
    return removed


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    menus = data.get("menus", [])
    removed = prune(menus)

    DATA_PATH.write_text(json.dumps({"menus": menus}, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_PATH.write_text(json.dumps({"menus": menus}, indent=2, ensure_ascii=True), encoding="utf-8")

    print(f"Removed auto-added links: {removed}")


if __name__ == "__main__":
    main()
