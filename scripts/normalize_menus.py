import re
from pathlib import Path

MENUS_DIR = Path(__file__).resolve().parents[1] / "Menus"

CHECKBOX_TOKEN_RE = re.compile(r"-\s*\[(?P<mark>[xX\s])\]\s*")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
URL_RE = re.compile(r"https?://[^\s)]+")


def split_multi_checkbox(line: str):
    tokens = list(CHECKBOX_TOKEN_RE.finditer(line))
    if len(tokens) <= 1:
        return None

    lines = []
    for i, token in enumerate(tokens):
        start = token.end()
        end = tokens[i + 1].start() if i + 1 < len(tokens) else len(line)
        text = line[start:end].strip()
        if not text:
            continue
        mark = token.group("mark")
        lines.append(f"- [{mark}] {text}")
    return lines if lines else None


def extract_links(text: str):
    md_links = [(m.group(1), m.group(2), m.span()) for m in MD_LINK_RE.finditer(text)]
    url_links = [(m.group(0), m.span()) for m in URL_RE.finditer(text)]

    # Remove URLs that are inside markdown links
    md_url_set = {url for _, url, _ in md_links}
    url_links = [(url, span) for url, span in url_links if url not in md_url_set]

    return md_links, url_links


def remove_spans(text: str, spans):
    if not spans:
        return text
    spans = sorted(spans, key=lambda s: s[0])
    out = []
    last = 0
    for start, end in spans:
        out.append(text[last:start])
        last = end
    out.append(text[last:])
    return "".join(out)


def split_multi_links(line: str):
    token = CHECKBOX_TOKEN_RE.match(line)
    if not token:
        return None

    mark = token.group("mark")
    text = line[token.end():].strip()
    if not text:
        return None

    md_links, url_links = extract_links(text)
    total_links = len(md_links) + len(url_links)
    if total_links <= 1:
        return None

    spans = [span for _, _, span in md_links] + [span for _, span in url_links]
    base_text = remove_spans(text, spans)
    base_text = re.sub(r"\s+", " ", base_text).strip()

    lines = []
    for link_text, link_url, _ in md_links:
        link_repr = f"[{link_text}]({link_url})"
        item_text = f"{base_text} {link_repr}".strip() if base_text else link_repr
        lines.append(f"- [{mark}] {item_text}")

    for link_url, _ in url_links:
        item_text = f"{base_text} {link_url}".strip() if base_text else link_url
        lines.append(f"- [{mark}] {item_text}")

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
