// Joins data/reference-summaries.json onto the book references (data/book-references.json) as `sum` (owner, 2026-11-26).
// Summaries are keyed by kind, then "Name|book code" or a plain "Name". Used by tools/build.mjs; tested in test/ref-summaries.test.mjs.
// It throws, stopping the build, when a key matches no reference (a typo) or when a plain name fits more than one
// reference (two books, or 2014 and 2024), which would put one summary on both.
export function joinSummaries(rows, summaries) {
  const used = new Set(), named = new Map(), id = (kind, name) => `${kind}\u0000${name}`;
  for (const row of rows) named.set(id(row.kind, row.name), (named.get(id(row.kind, row.name)) || 0) + 1);
  const out = rows.map(row => {
    const byKind = Object.hasOwn(summaries, row.kind) ? summaries[row.kind] : {};
    const key = [`${row.name}|${row.src}`, row.name].find(k => Object.hasOwn(byKind, k));
    if (!key) return row;
    if (key === row.name && named.get(id(row.kind, row.name)) > 1) {
      throw new Error(`data/reference-summaries.json: ${row.kind} "${row.name}" is in more than one book; use "${row.name}|${row.src}"`);
    }
    used.add(id(row.kind, key));
    return { ...row, sum: byKind[key] };
  });
  for (const [kind, byKind] of Object.entries(summaries)) {
    if (kind.startsWith("_")) continue;
    for (const key of Object.keys(byKind)) {
      if (!used.has(id(kind, key))) throw new Error(`data/reference-summaries.json: no ${kind} reference named ${key}`);
    }
  }
  return out;
}

// Joins data/reference-srd-items.json onto the book references as `srd`: the free-rules (SRD 5.1) name of an item
// that a book reference repeats, so the Compendium can show that item's full text (owner, 2026-11-26).
// `links` is { "<book code>": { "<reference name>": "<free-rules name>" } }; `srdNames` is the set of 2014 free-rules
// magic item names (data/items.json). A link whose reference or free-rules item is missing stops the build.
export function joinSrdItems(rows, links, srdNames) {
  const used = new Set(), id = (src, name) => `${src}\u0000${name}`;
  const out = rows.map(row => {
    const bySrc = row.kind === "Item" && Object.hasOwn(links, row.src) ? links[row.src] : null;
    if (!bySrc || !Object.hasOwn(bySrc, row.name)) return row;
    const srd = bySrc[row.name];
    if (!srdNames.has(srd)) throw new Error(`data/reference-srd-items.json: no free-rules item named ${srd} (for ${row.name})`);
    used.add(id(row.src, row.name));
    return { ...row, srd };
  });
  for (const [src, bySrc] of Object.entries(links)) {
    if (src.startsWith("_")) continue;
    for (const name of Object.keys(bySrc)) {
      if (!used.has(id(src, name))) throw new Error(`data/reference-srd-items.json: no ${src} item reference named ${name}`);
    }
  }
  return out;
}
