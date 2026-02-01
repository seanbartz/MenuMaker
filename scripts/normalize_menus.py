import re
from pathlib import Path

MENUS_DIR = Path(__file__).resolve().parents[1] / "Menus"

CHECKBOX_TOKEN_RE = re.compile(r"-\s*\[(?P<mark>[xX\s])\]\s*")
CHECKBOX_PREFIX_RE = re.compile(r"^(?P<indent>\s*)-\s*\[(?P<mark>[xX\s])\]\s*")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
URL_RE = re.compile(r"https?://[^\s\)\]\(]+")


def split_multi_checkbox(line: str):
    tokens = list(CHECKBOX_TOKEN_RE.finditer(line))
    if len(tokens) <= 1:
        return None

    prefix = CHECKBOX_PREFIX_RE.match(line)
    indent = prefix.group("indent") if prefix else ""

    lines = []
    for i, token in enumerate(tokens):
        start = token.end()
        end = tokens[i + 1].start() if i + 1 < len(tokens) else len(line)
        text = line[start:end].strip()
        if not text:
            continue
        mark = token.group("mark")
        lines.append(f"{indent}- [{mark}] {text}")
    return lines if lines else None


def extract_link_tokens(text: str):
    md_matches = list(MD_LINK_RE.finditer(text))
    md_links = [("md", m.group(0), m.span()) for m in md_matches]
    md_urls = {m.group(2) for m in md_matches}
    md_spans = [m.span() for m in md_matches]

    def overlaps_md(span):
        return any(span[0] >= start and span[1] <= end for start, end in md_spans)

    url_links = []
    for m in URL_RE.finditer(text):
        span = m.span()
        if overlaps_md(span):
            continue
        url = m.group(0)
        if url in md_urls:
            continue
        url_links.append(("url", url, span))

    tokens = md_links + url_links
    tokens.sort(key=lambda t: t[2][0])
    return tokens


def split_multi_links(line: str):
    prefix = CHECKBOX_PREFIX_RE.match(line)
    if not prefix:
        return None

    mark = prefix.group("mark")
    indent = prefix.group("indent")
    text = line[prefix.end():].strip()
    if not text:
        return None

    tokens = extract_link_tokens(text)
    if len(tokens) <= 1:
        return None

    segments = []
    last = 0
    for _, _, span in tokens:
        segments.append(text[last:span[0]])
        last = span[1]
    segments.append(text[last:])

    lines = []
    last_index = len(tokens) - 1
    for idx, (_, link_repr, _) in enumerate(tokens):
        desc = segments[idx].strip()
        if idx == last_index:
            tail = segments[idx + 1].strip()
            desc = f"{desc} {tail}".strip()

        item_text = f"{desc} {link_repr}".strip() if desc else link_repr
        lines.append(f"{indent}- [{mark}] {item_text}")

    return lines if lines else None


def normalize_file(path: Path):
    original = path.read_text(encoding="utf-8", errors="replace").splitlines()
    updated = []
    changed = False

    for line in original:
        # Split if multiple checkbox tokens in one line
        multi_checkbox = split_multi_checkbox(line)
        if multi_checkbox:
            updated.extend(multi_checkbox)
            changed = True
            continue

        # Split if multiple links in a single checkbox item
        multi_links = split_multi_links(line)
        if multi_links:
            updated.extend(multi_links)
            changed = True
            continue

        updated.append(line)

    if changed:
        path.write_text("\n".join(updated) + "\n", encoding="utf-8")

    return changed


def main():
    changed_files = []
    for path in sorted(MENUS_DIR.glob("*.md")):
        if normalize_file(path):
            changed_files.append(path)

    if changed_files:
        print("Updated:")
        for path in changed_files:
            print(f"- {path}")
    else:
        print("No changes needed.")


if __name__ == "__main__":
    main()
