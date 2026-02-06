#!/usr/bin/env python3
import argparse
import json
from collections import OrderedDict
from pathlib import Path
import html

LIST_KEYS = {
    'urls', 'link_texts', 'menu_files', 'menu_weeks', 'menu_seasons',
    'meal_types', 'sections', 'source_hints', 'item_texts', 'side_dish'
}

TEMPLATE = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Menu Item Merge Tool</title>
  <style>
    :root {
      --bg: #f7f4ef;
      --ink: #1f1a12;
      --accent: #1a6d5c;
      --muted: #6d6254;
      --card: #ffffff;
      --border: #e4ddd2;
      --warn: #a84d2b;
    }
    body {
      margin: 0;
      font-family: "Georgia", "Times New Roman", serif;
      background: var(--bg);
      color: var(--ink);
    }
    header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, #fff, #f3efe8);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
    }
    .sub {
      color: var(--muted);
      font-size: 13px;
    }
    .layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
      padding: 16px 20px 40px;
    }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    button {
      background: var(--accent);
      color: white;
      border: none;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    button.ghost {
      background: transparent;
      color: var(--accent);
      border: 1px solid var(--accent);
    }
    button.warn {
      background: var(--warn);
    }
    input[type="text"] {
      width: 100%;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 13px;
      margin-top: 6px;
    }
    .row {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .row-main {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .title {
      font-size: 16px;
      font-weight: 600;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      margin-left: 22px;
    }
    .tag {
      display: inline-block;
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 6px;
      border: 1px solid var(--border);
      font-size: 11px;
    }
    .list {
      max-height: calc(100vh - 220px);
      overflow: auto;
      padding-right: 4px;
    }
    .group {
      border: 1px dashed var(--border);
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 10px;
      background: #fffdf9;
    }
    .group h3 {
      margin: 0 0 6px 0;
      font-size: 14px;
    }
    .group-items {
      font-size: 12px;
      color: var(--muted);
      margin: 6px 0 0 0;
      max-height: 120px;
      overflow: auto;
    }
    .group-items div {
      margin-bottom: 4px;
    }
    .footer {
      color: var(--muted);
      font-size: 12px;
      margin-top: 10px;
    }
    .search {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Menu Item Merge Tool</h1>
    <div class="sub">Select items, assign them to a group, choose a merged title, export a merge plan.</div>
    <div class="sub">Items shown: __COUNT__</div>
  </header>

  <div class="layout">
    <section class="panel">
      <div class="search">
        <input id="search" type="text" placeholder="Filter titles…" />
        <button class="ghost" onclick="clearSearch()">Clear</button>
      </div>
      <div class="controls">
        <button class="ghost" onclick="selectAllVisible(true)">Select All</button>
        <button class="ghost" onclick="selectAllVisible(false)">Clear Selected</button>
        <button class="ghost" onclick="toggleNoLinkOnly()" id="noLinkBtn">Show Only No‑Link: Off</button>
        <button onclick="addGroupFromSelection()">Add Group from Selection</button>
      </div>
      <div class="list" id="itemList">
        __ROWS__
      </div>
    </section>

    <aside class="panel">
      <div class="controls">
        <button onclick="addEmptyGroup()">New Empty Group</button>
        <button class="ghost" onclick="saveState()">Save Draft</button>
        <button class="ghost" onclick="loadState()">Load Draft</button>
      </div>
      <div id="groups"></div>
      <div class="controls">
        <button onclick="exportPlan()">Export Merge Plan</button>
        <button class="warn" onclick="clearAllGroups()">Clear All Groups</button>
      </div>
      <div class="footer">Exports are saved with a timestamp so they won't overwrite previous files.</div>
    </aside>
  </div>

  <script>
    const rows = Array.from(document.querySelectorAll('.row'));
    let noLinkOnly = false;

    function getSelectedIds() {
      return Array.from(document.querySelectorAll('.item-check:checked')).map(i => Number(i.dataset.id));
    }

    function clearSelection() {
      document.querySelectorAll('.item-check:checked').forEach(i => i.checked = false);
    }

    function selectAllVisible(state) {
      rows.forEach(row => {
        if (row.style.display === 'none') return;
        const chk = row.querySelector('.item-check');
        chk.checked = state;
      });
    }

    function filterList() {
      const q = document.getElementById('search').value.trim().toLowerCase();
      rows.forEach(row => {
        const title = row.querySelector('.title').textContent.toLowerCase();
        const hasNoLink = row.querySelector('.tag') !== null;
        const match = (!q || title.includes(q)) && (!noLinkOnly || hasNoLink);
        row.style.display = match ? '' : 'none';
      });
    }

    function clearSearch() {
      document.getElementById('search').value = '';
      filterList();
    }

    document.getElementById('search').addEventListener('input', filterList);

    function toggleNoLinkOnly() {
      noLinkOnly = !noLinkOnly;
      document.getElementById('noLinkBtn').textContent = `Show Only No‑Link: ${noLinkOnly ? 'On' : 'Off'}`;
      filterList();
    }

    let groupId = 1;

    function addEmptyGroup() {
      addGroup({ id: groupId++, title: '', itemIds: [] });
    }

    function addGroupFromSelection() {
      const ids = getSelectedIds();
      if (!ids.length) return;
      addGroup({ id: groupId++, title: '', itemIds: ids });
      clearSelection();
    }

    function addGroup(group) {
      const container = document.getElementById('groups');
      const div = document.createElement('div');
      div.className = 'group';
      div.dataset.groupId = group.id;
      div.innerHTML = `
        <h3>Group ${group.id}</h3>
        <label>Merge title</label>
        <input type="text" class="group-title" value="${group.title || ''}" placeholder="e.g., Spicy peanut tofu bowls" />
        <div class="controls">
          <button class="ghost" onclick="appendSelection(${group.id})">Add Selection</button>
          <button class="ghost" onclick="removeSelection(${group.id})">Remove Selection</button>
          <button class="warn" onclick="deleteGroup(${group.id})">Delete Group</button>
        </div>
        <div class="group-items" id="group-items-${group.id}"></div>
      `;
      container.appendChild(div);
      setGroupItems(group.id, group.itemIds || []);
    }

    function getGroupItems(groupId) {
      const el = document.getElementById(`group-items-${groupId}`);
      return (el.dataset.ids || '').split(',').filter(Boolean).map(Number);
    }

    function setGroupItems(groupId, ids) {
      const el = document.getElementById(`group-items-${groupId}`);
      const uniq = Array.from(new Set(ids));
      el.dataset.ids = uniq.join(',');
      el.innerHTML = uniq.map(id => {
        const row = document.querySelector(`.row[data-id="${id}"]`);
        const title = row ? row.querySelector('.title').textContent : `Item ${id}`;
        return `<div>${title}</div>`;
      }).join('');
    }

    function appendSelection(groupId) {
      const ids = getSelectedIds();
      if (!ids.length) return;
      const current = getGroupItems(groupId);
      setGroupItems(groupId, current.concat(ids));
      clearSelection();
    }

    function removeSelection(groupId) {
      const ids = new Set(getSelectedIds());
      if (!ids.size) return;
      const current = getGroupItems(groupId).filter(id => !ids.has(id));
      setGroupItems(groupId, current);
      clearSelection();
    }

    function deleteGroup(groupId) {
      const div = document.querySelector(`.group[data-group-id="${groupId}"]`);
      if (div) div.remove();
    }

    function exportPlan() {
      const groups = Array.from(document.querySelectorAll('.group')).map(div => {
        const id = Number(div.dataset.groupId);
        const title = div.querySelector('.group-title').value.trim();
        const itemIds = getGroupItems(id);
        return { id, title, itemIds };
      }).filter(g => g.itemIds.length > 1 && g.title);

      const payload = {
        generatedAt: new Date().toISOString(),
        groups
      };

      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const filename = `merge_plan_${ts}.json`;

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function saveState() {
      const groups = Array.from(document.querySelectorAll('.group')).map(div => {
        const id = Number(div.dataset.groupId);
        const title = div.querySelector('.group-title').value.trim();
        const itemIds = getGroupItems(id);
        return { id, title, itemIds };
      });
      const state = { groupId, groups };
      localStorage.setItem('mergeToolState', JSON.stringify(state));
      alert('Draft saved');
    }

    function loadState() {
      const raw = localStorage.getItem('mergeToolState');
      if (!raw) return;
      const state = JSON.parse(raw);
      groupId = state.groupId || 1;
      document.getElementById('groups').innerHTML = '';
      (state.groups || []).forEach(addGroup);
    }

    function clearAllGroups() {
      document.getElementById('groups').innerHTML = '';
    }
  </script>
</body>
</html>
""".strip()


def merge_items(group_items, canonical_title):
    merged = {}
    all_keys = set()
    for g in group_items:
        all_keys.update(g.keys())

    for k in all_keys:
        if k == 'count':
            merged[k] = sum(int(g.get('count', 0) or 0) for g in group_items)
            continue
        if k == 'url':
            urls = [g.get('url') for g in group_items if g.get('url')]
            uniq = list(OrderedDict.fromkeys(urls))
            merged[k] = uniq[0] if len(uniq) == 1 else None
            continue
        if k in LIST_KEYS:
            combined = []
            for g in group_items:
                v = g.get(k)
                if not v:
                    continue
                if isinstance(v, list):
                    combined.extend(v)
                else:
                    combined.append(v)
            seen = OrderedDict()
            for v in combined:
                if v not in seen:
                    seen[v] = True
            merged[k] = list(seen.keys())
            continue
        values = [g.get(k) for g in group_items if k in g]
        uniq = list(OrderedDict.fromkeys(values))
        merged[k] = uniq[0] if len(uniq) == 1 else uniq

    if merged.get('link_texts'):
        lt = merged['link_texts']
        if canonical_title in lt:
            lt = [canonical_title] + [x for x in lt if x != canonical_title]
        else:
            lt = [canonical_title] + lt
        merged['link_texts'] = lt
    else:
        it = merged.get('item_texts', [])
        if canonical_title in it:
            it = [canonical_title] + [x for x in it if x != canonical_title]
        else:
            it = [canonical_title] + it
        merged['item_texts'] = it

    return merged


def apply_merge_plan(data, merge_plan):
    items = data['items']
    groups = merge_plan.get('groups', [])
    to_remove = set()
    merged_items = []

    for group in groups:
        item_ids = group.get('itemIds') or []
        title = (group.get('title') or '').strip()
        if len(item_ids) < 2 or not title:
            continue
        valid_ids = [i for i in item_ids if isinstance(i, int) and 0 <= i < len(items)]
        if len(valid_ids) < 2:
            continue
        group_items = [items[i] for i in valid_ids]
        merged_items.append(merge_items(group_items, title))
        to_remove.update(valid_ids)

    if to_remove:
        new_items = [item for idx, item in enumerate(items) if idx not in to_remove]
        new_items.extend(merged_items)
        data['items'] = new_items


def regenerate_merge_tool(data_path, tool_path):
    with open(data_path) as f:
        data = json.load(f)

    items = []
    for idx, item in enumerate(data['items']):
        title = (item.get('link_texts') or [None])[0] or (item.get('item_texts') or [None])[0] or ''
        items.append({
            'id': idx,
            'title': title,
            'count': item.get('count', 0),
            'has_url': bool(item.get('url') or (item.get('urls') or [])),
        })

    items.sort(key=lambda x: (x['title'].lower(), x['count']))

    rows = '\n'.join(
        (
            f"""
    <div class=\"row\" data-id=\"{it['id']}\">\n      <label class=\"row-main\">\n        <input type=\"checkbox\" class=\"item-check\" data-id=\"{it['id']}\">\n        <span class=\"title\">{html.escape(it['title'])}</span>\n      </label>\n      <div class=\"meta\">Occurrences: {it['count']} {'' if it['has_url'] else '<span class=\"tag\">no link</span>'}</div>\n    </div>\n    """.strip()
        )
        for it in items
    )

    html_doc = TEMPLATE.replace('__COUNT__', str(len(items))).replace('__ROWS__', rows)
    Path(tool_path).write_text(html_doc, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='Apply merge plan(s) and regenerate merge tool.')
    parser.add_argument('--plan', action='append', required=True, help='Path to merge_plan_*.json (repeatable)')
    parser.add_argument('--data', default='data/menu_items_refactored.json', help='Refactored data JSON')
    parser.add_argument('--public', default='app/public/data/menu_items_refactored.json', help='Public data JSON')
    parser.add_argument('--tool', default='merge_items_tool.html', help='Output HTML tool path')
    args = parser.parse_args()

    for path in [args.data, args.public]:
        with open(path) as f:
            data = json.load(f)

        for plan_path in args.plan:
            with open(plan_path) as f:
                merge_plan = json.load(f)
            apply_merge_plan(data, merge_plan)

        with open(path, 'w') as f:
            json.dump(data, f, ensure_ascii=True, indent=2, sort_keys=False)

    regenerate_merge_tool(args.data, args.tool)


if __name__ == '__main__':
    main()
