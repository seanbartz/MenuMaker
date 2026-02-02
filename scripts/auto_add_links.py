import json
import re
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "menus.json"
APP_DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "public" / "data" / "menus.json"

MAPPING = {
    "spicy peanut tofu bowls": {
        "url": "https://pinchofyum.com/spicy-peanut-tofu-bowls",
        "title": "Spicy Peanut Tofu Bowls",
    },
    "instant pot short rib ragu": {
        "url": "https://pinchofyum.com/instant-pot-short-rib-ragu",
        "title": "Instant Pot Short Rib Ragu",
    },
    "roasted sweet potato tacos": {
        "url": "https://www.gimmesomeoven.com/roasted-sweet-potato-tacos/",
        "title": "Roasted Sweet Potato Tacos",
    },
    "chicken quinoa broccoli casserole": {
        "url": "https://pinchofyum.com/creamy-chicken-quinoa-broccoli-casserole",
        "title": "Creamy Chicken Quinoa and Broccoli Casserole",
    },
    "salmon burgers with slaw": {
        "url": "https://pinchofyum.com/yummy-salmon-burgers-slaw",
        "title": "Yummy Salmon Burgers with Slaw",
    },
    "chickpea couscous bowls with tahini sauce": {
        "url": "https://www.acouplecooks.com/chickpea-couscous-bowls-tahini-sauce/",
        "title": "Chickpea Couscous Bowls with Tahini Sauce",
    },
    "roasted tomato caprese pasta salad": {
        "url": "https://www.forkknifeswoon.com/quick-roasted-tomato-caprese-pasta-salad/",
        "title": "Quick Roasted Tomato Caprese Pasta Salad",
    },
    "quinoa crunch salad with peanut dressing": {
        "url": "https://pinchofyum.com/quinoa-crunch-salad-with-peanut-dressing",
        "title": "Quinoa Crunch Salad with Peanut Dressing",
    },
    "spicy peanut soup with sweet potato": {
        "url": "https://pinchofyum.com/sweet-potato-peanut-soup",
        "title": "Spicy Peanut Soup with Sweet Potato + Kale",
    },
    "gnocchi with brussels sprouts, chicken sausage and pesto": {
        "url": "https://www.gimmesomeoven.com/gnocchi-with-brussels-sprouts-chicken-sausage-and-kale-pesto/",
        "title": "Gnocchi with Brussels Sprouts, Chicken Sausage and Kale Pesto",
    },
    "crockpot lentil quesadillas": {
        "url": "https://pinchofyum.com/quick-and-easy-lentil-quesadillas",
        "title": "Quick and Easy Lentil Quesadillas",
    },
    "chickpea couscous bowls with tahini sauce": {
        "url": "https://www.acouplecooks.com/chickpea-couscous-bowls-tahini-sauce/",
        "title": "Mediterranean Couscous Bowls",
    },
    "vegetarian moo shu": {
        "url": "https://www.gimmesomeoven.com/vegetarian-moo-shu/",
        "title": "Vegetarian Moo Shu",
    },
    "garlicky roasted squash and ricotta pizza": {
        "url": "https://cravingsbychrissyteigen.com/blogs/recipes/squash-and-ricotta-pizza-recipe",
        "title": "Garlicky Roasted Squash and Ricotta Pizza",
    },
    "chicken caesar salad": {
        "url": "https://damndelicious.net/2023/04/21/best-chicken-caesar-salad-with-homemade-croutons/",
        "title": "Best Chicken Caesar Salad with Homemade Croutons",
    },
    "vegetarian italian chopped salad": {
        "url": "https://cookieandkate.com/vegetarian-italian-chopped-salad-recipe/",
        "title": "Vegetarian Italian Chopped Salad",
    },
    "chicken tinga tacos": {
        "url": "https://pinchofyum.com/the-best-chicken-tinga-tacos",
        "title": "The Best Chicken Tinga Tacos",
    },
    "cilantro orange chicken": {
        "url": "https://pinchofyum.com/cilantro-orange-chicken-with-rice-and-beans",
        "title": "Cilantro Orange Chicken with Rice and Beans",
    },
    "roasted vegetable bowls": {
        "url": "https://pinchofyum.com/30-minute-meal-prep-roasted-vegetable-bowls-with-green-tahini",
        "title": "Roasted Vegetable Bowls with Green Tahini",
    },
    "butter chicken meatballs": {
        "url": "https://pinchofyum.com/butter-chicken-meatballs",
        "title": "Butter Chicken Meatballs",
    },
    "bbq salmon bowls": {
        "url": "https://pinchofyum.com/bbq-salmon-mango-salsa",
        "title": "BBQ Salmon Bowls with Mango Avocado Salsa",
    },
    "pearl cous cous skillet": {
        "url": "https://pinchofyum.com/couscous-skillet-with-tomatoes-chickpeas-and-feta",
        "title": "Couscous Skillet with Tomatoes, Chickpeas, and Feta",
    },
    "napa chicken salad": {
        "url": "https://pinchofyum.com/napa-chicken-salad-with-sesame-dressing",
        "title": "Napa Chicken Salad with Sesame Dressing",
    },
    "burst tomato pappardelle": {
        "url": "https://pinchofyum.com/burst-tomato-pappardelle",
        "title": "Burst Tomato Pappardelle",
    },
    "spaghetti with crispy zucchini": {
        "url": "https://pinchofyum.com/spaghetti-with-crispy-zucchini",
        "title": "Spaghetti with Crispy Zucchini",
    },
    "autumn glow salad": {
        "url": "https://pinchofyum.com/autumn-glow-salad-with-lemon-dressing",
        "title": "Autumn Glow Salad with Lemon Dressing",
    },
    "sheet pan pesto gnocchi": {
        "url": "https://www.twopeasandtheirpod.com/sheet-pan-pesto-gnocchi/",
        "title": "Sheet Pan Pesto Gnocchi",
    },
    "sesame apricot tofu": {
        "url": "https://pinchofyum.com/sesame-apricot-tofu",
        "title": "Sesame Apricot Tofu",
    },
}


def normalize(text: str):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = " ".join(text.split())
    text = text.replace("cous cous", "couscous")
    text = text.replace("bbq", "bbq")
    return text


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    menus = data.get("menus", [])

    added = 0
    for menu in menus:
        for item in menu.get("items", []):
            if item.get("links") or item.get("urls"):
                continue
            text = item.get("text", "")
            norm = normalize(text)
            for key, info in MAPPING.items():
                if norm.startswith(key):
                    item.setdefault("links", []).append({
                        "text": info["title"],
                        "url": info["url"],
                        "auto_added": True,
                    })
                    added += 1
                    break

    DATA_PATH.write_text(json.dumps({"menus": menus}, indent=2, ensure_ascii=True), encoding="utf-8")
    APP_DATA_PATH.write_text(json.dumps({"menus": menus}, indent=2, ensure_ascii=True), encoding="utf-8")

    print(f"Auto-added links: {added}")


if __name__ == "__main__":
    main()
