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
    "gnocchi with brussels sprouts, chicken sausage, and pesto": {
        "url": "https://www.gimmesomeoven.com/gnocchi-with-brussels-sprouts-chicken-sausage-and-kale-pesto/",
        "title": "Gnocchi with Brussels Sprouts, Chicken Sausage and Kale Pesto",
    },
    "gnocchi with brussuls sprouts": {
        "url": "https://www.gimmesomeoven.com/gnocchi-with-brussels-sprouts-chicken-sausage-and-kale-pesto/",
        "title": "Gnocchi with Brussels Sprouts, Chicken Sausage and Kale Pesto",
    },
    "gnocchi with brussels sprouts chicken sausage and pesto": {
        "url": "https://www.gimmesomeoven.com/gnocchi-with-brussels-sprouts-chicken-sausage-and-kale-pesto/",
        "title": "Gnocchi with Brussels Sprouts, Chicken Sausage and Kale Pesto",
    },
    "slow cooker butternut squash tortellini": {
        "url": "https://www.melskitchencafe.com/slow-cooker-butternut-squash-tortellini/",
        "title": "Slow Cooker Butternut Squash Tortellini",
    },
    "turkey": {
        "url": "https://www.seriouseats.com/herb-butter-rubbed-crisp-skinned-butterflied-spatchcock-roast-turkey-thanksgiving-recipe",
        "title": "Herb-Butter Rubbed Crisp-Skinned Butterflied Roast Turkey",
    },
    "instant pot butter chicken": {
        "url": "https://www.wellplated.com/instant-pot-butter-chicken/",
        "title": "Instant Pot Butter Chicken",
    },
    "cauliflower, potato, and green pea daal": {
        "url": "https://www.flourishingfoodie.com/blog/cauliflower-potato-and-green-pea-daal",
        "title": "Cauliflower, Potato, and Green Pea Daal",
    },
    "asparagus pasta salad with honey mustard dressing": {
        "url": "https://www.howsweeteats.com/2021/03/asparagus-pasta-salad/",
        "title": "Asparagus Pasta Salad with Honey Mustard Dressing",
    },
    "leek, chard, goat cheese, and corn flatbread": {
        "url": "https://smittenkitchen.com/2012/08/leek-chard-and-corn-flatbread/",
        "title": "Leek, Chard, and Corn Flatbread",
    },
    "leek chard goat cheese and corn flatbread": {
        "url": "https://smittenkitchen.com/2012/08/leek-chard-and-corn-flatbread/",
        "title": "Leek, Chard, and Corn Flatbread",
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
    "cauliflower walnut taco meat burrito bowls": {
        "url": "https://pinchofyum.com/easy-vegan-burrito-bowls",
        "title": "Easy Vegan Burrito Bowls",
    },
    "instant pot cauliflower mac and cheese": {
        "url": "https://www.wellplated.com/instant-pot-cauliflower-mac-and-cheese/",
        "title": "Instant Pot Cauliflower Mac and Cheese",
    },
    "instant pot cauliflower curry": {
        "url": "https://pinchofyum.com/instant-pot-cauliflower-curry",
        "title": "Instant Pot Cauliflower Curry",
    },
    "butternut squash and black bean enchiladas": {
        "url": "https://www.skinnytaste.com/butternut-squash-and-black-bean/",
        "title": "Butternut Squash and Black Bean Enchiladas",
    },
    "butternut squash mac and cheese": {
        "url": "https://www.wellplated.com/butternut-squash-mac-and-cheese/",
        "title": "Butternut Squash Mac and Cheese",
    },
    "baja grain bowls": {
        "url": "https://www.howsweeteats.com/2020/04/baja-grain-bowls/",
        "title": "Baja Grain Bowls",
    },
    "bulgur salad": {
        "url": "https://www.pbs.org/food/recipes/bulgur-salad-with-grapes-and-feta-cheese",
        "title": "Bulgur Salad with Grapes and Feta Cheese",
    },
    "pancakes": {
        "url": "https://www.browneyedbaker.com/best-buttermilk-pancakes/",
        "title": "Best Buttermilk Pancakes",
    },
    "red pepper cashew pasta with roasted cauliflower": {
        "url": "https://pinchofyum.com/red-pepper-cashew-pasta",
        "title": "Red Pepper Cashew Pasta with Roasted Cauliflower",
    },
    "roasted red pepper pasta and cauliflower": {
        "url": "https://pinchofyum.com/red-pepper-cashew-pasta",
        "title": "Red Pepper Cashew Pasta with Roasted Cauliflower",
    },
    "black pepper stir fry noodles": {
        "url": "https://pinchofyum.com/black-pepper-stir-fried-udon",
        "title": "Black Pepper Stir Fried Udon",
    },
    "black pepper stir fry udon": {
        "url": "https://pinchofyum.com/black-pepper-stir-fried-udon",
        "title": "Black Pepper Stir Fried Udon",
    },
    "gnocchi with brussels sprouts, chicken sausage and pesto": {
        "url": "https://www.gimmesomeoven.com/gnocchi-with-brussels-sprouts-chicken-sausage-and-kale-pesto/",
        "title": "Gnocchi with Brussels Sprouts, Chicken Sausage and Kale Pesto",
    },
    "egg roll in a bowl": {
        "url": "https://pinchofyum.com/15-minute-meal-prep-egg-roll-in-a-bowl",
        "title": "15 Minute Meal Prep Egg Roll in a Bowl",
    },
    "instant pot cilantro lime chicken and lentil rice bowls": {
        "url": "https://pinchofyum.com/15-minute-meal-prep-cilantro-lime-chicken-and-lentils",
        "title": "Cilantro Lime Chicken and Lentil Rice Bowls",
    },
    "red chile chicken tacos with creamy corn": {
        "url": "https://pinchofyum.com/red-chile-chicken-tacos-with-creamy-corn",
        "title": "Red Chile Chicken Tacos with Creamy Corn",
    },
    "thai coconut soup with tofu and rice": {
        "url": "https://pinchofyum.com/thai-coconut-soup-with-tofu-and-rice",
        "title": "Thai Coconut Soup with Tofu and Rice",
    },
    "plantain and pinto stew with aji verde": {
        "url": "https://pinchofyum.com/plantain-and-pinto-stew-with-aji-verde",
        "title": "Plantain and Pinto Stew with Aji Verde",
    },
    "spanish chicken and potatoes": {
        "url": "https://pinchofyum.com/one-pot-spanish-chicken-potatoes",
        "title": "One Pot Spanish Chicken and Potatoes",
    },
    "everything greek pork pitas": {
        "url": "https://pinchofyum.com/everything-greek-pork-pitas",
        "title": "Everything Greek Pork Pitas",
    },
    "chicken and broccoli stir fry": {
        "url": "https://damndelicious.net/2021/08/13/chicken-and-broccoli-stir-fry/",
        "title": "Chicken and Broccoli Stir Fry",
    },
    "baked salmon with amazing lemon sauce": {
        "url": "https://pinchofyum.com/baked-salmon-with-amazing-lemon-sauce",
        "title": "Baked Salmon with Amazing Lemon Sauce",
    },
    "chicken wontons with spicy sauce": {
        "url": "https://pinchofyum.com/chicken-wontons-in-spicy-chili-sauce",
        "title": "Chicken Wontons in Spicy Chili Sauce",
    },
    "crock pot white chicken chili": {
        "url": "https://iowagirleats.com/crock-pot-white-chicken-chili-recipe/",
        "title": "CrockPot White Chicken Chili",
    },
    "lighter broccoli beef": {
        "url": "https://iowagirleats.com/broccoli-beef-recipe/",
        "title": "Lighter Broccoli Beef",
    },
    "instant pot chicken noodle soup": {
        "url": "https://www.spendwithpennies.com/instant-pot-chicken-noodle-soup/",
        "title": "Instant Pot Chicken Noodle Soup",
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
                if norm.startswith(key) or key in norm:
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
