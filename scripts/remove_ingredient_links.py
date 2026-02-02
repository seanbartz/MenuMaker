#!/usr/bin/env python3
"""
Script to remove URLs from ingredient bullets in recipe markdown files.
Also removes incorrect main recipe links at the end of files.
"""

import re
from pathlib import Path

RECIPES_DIR = Path(__file__).resolve().parents[1] / "Recipes"

# Pattern to match markdown links: [text](url)
MD_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')

# Pattern to match underlined markdown links: <u>[text](url)</u>
UNDERLINED_LINK_PATTERN = re.compile(r'<u>\[([^\]]+)\]\(([^)]+)\)</u>')

# Pattern to match malformed links at end of file like:
# [
# https://url](https://url)
MALFORMED_LINK_PATTERN = re.compile(r'\[\s*\n\s*(https?://[^\]]+)\]\([^)]+\)\s*$', re.MULTILINE)


def should_keep_link(url):
    """
    Determine if a link should be kept.
    Keep only attachment links.
    """
    return url.startswith('attachments/') or url.startswith('../attachments/')


def remove_links_from_line(line):
    """
    Remove markdown links from a line, but keep attachment links.
    Replace links with just their text for non-attachment links.
    """
    # First handle underlined links
    def replace_underlined(match):
        text, url = match.groups()
        if should_keep_link(url):
            return match.group(0)  # Keep the link as-is
        return text  # Just return the text
    
    line = UNDERLINED_LINK_PATTERN.sub(replace_underlined, line)
    
    # Then handle regular markdown links
    def replace_link(match):
        text, url = match.groups()
        if should_keep_link(url):
            return match.group(0)  # Keep the link as-is
        return text  # Just return the text
    
    line = MD_LINK_PATTERN.sub(replace_link, line)
    
    return line


def clean_recipe_file(file_path):
    """
    Clean a recipe file by removing ingredient links and malformed recipe links.
    Returns True if changes were made.
    """
    content = file_path.read_text(encoding='utf-8')
    original_content = content
    
    # Remove malformed links at end of file
    content = MALFORMED_LINK_PATTERN.sub('', content)
    
    # Process line by line to remove ingredient links
    lines = content.splitlines(keepends=True)
    new_lines = []
    
    for line in lines:
        new_line = remove_links_from_line(line)
        new_lines.append(new_line)
    
    content = ''.join(new_lines)
    
    # Check if changes were made
    if content != original_content:
        file_path.write_text(content, encoding='utf-8')
        return True
    
    return False


def main():
    """
    Process all recipe markdown files and remove ingredient/recipe links.
    """
    recipe_files = sorted(RECIPES_DIR.glob("*.md"))
    
    print(f"Processing {len(recipe_files)} recipe files...")
    
    modified_count = 0
    modified_files = []
    
    for recipe_file in recipe_files:
        if clean_recipe_file(recipe_file):
            modified_count += 1
            modified_files.append(recipe_file.name)
            print(f"  ✓ Cleaned: {recipe_file.name}")
    
    print(f"\nModified {modified_count} recipe files:")
    for name in modified_files:
        print(f"  - {name}")
    
    if modified_count > 0:
        print("\nRemember to regenerate data files by running:")
        print("  python scripts/extract_menus.py")


if __name__ == "__main__":
    main()
