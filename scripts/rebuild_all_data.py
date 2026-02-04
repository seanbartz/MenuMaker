#!/usr/bin/env python3
"""Rebuild all derived data in the correct order.

Order:
1) extract_menus.py (base menus + recipes)
2) auto_add_links.py (restore auto-added menu links)
3) build_menu_items_refactored.py (refactored items)
4) fix_refactored_item_titles.py (clean titles from URLs)
5) merge_brats_entries.py (split brats/burgers sides)
6) build_menu_sources.py (menu item sources by domain)
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

STEPS = [
    "scripts/extract_menus.py",
    "scripts/auto_add_links.py",
    "scripts/build_menu_items_refactored.py",
    "scripts/fix_refactored_item_titles.py",
    "scripts/merge_brats_entries.py",
    "scripts/build_menu_sources.py",
]


def run(step):
    print(f"\n==> Running {step}")
    result = subprocess.run([sys.executable, str(ROOT / step)], check=False)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main():
    for step in STEPS:
        run(step)
    print("\nAll data rebuilt successfully.")


if __name__ == "__main__":
    main()
