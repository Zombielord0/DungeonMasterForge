// Turns two versions of a Forge character into a short, readable change line,
// e.g. "HP 44 → 31, added Potion of Healing".

const LABELS = {
  name: "name", level: "level", hpCur: "HP", hp: "max HP", ac: "AC", xp: "XP",
  hpTemp: "temp HP", speed: "speed", cls: "class", race: "race", sub: "subclass",
  bg: "background", align: "alignment", inspiration: "inspiration",
};
const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const IGNORE = new Set(["id", "seed", "updated", "created"]);
// Worked out by the Forge from other fields, so they change whenever a sheet is
// opened or a score moves; the score or level change itself is what gets reported.
const DERIVED = new Set(["mods", "init", "passive", "prof", "saves", "skills", "attacks", "spell", "hd", "acSrc"]);
const blank = v => v === undefined || v === null || v === "" || v === 0 || v === false ||
  (Array.isArray(v) && !v.length) || (isObj(v) && Object.values(v).every(blank));
const MAX_PARTS = 5;

// Postgres hands JSON back with its keys reordered, so compare by content only.
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(",")}]`
  : isObj(v) ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",")}}`
  : JSON.stringify(v ?? null);
const same = (a, b) => canon(a) === canon(b);
const short = v => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 24 ? s.slice(0, 22) + "…" : s;
};

function itemName(i) { return (i && (i.n || i.name)) || ""; }

function diffList(before = [], after = [], { add, remove, qty }) {
  const parts = [];
  const count = list => {
    const m = new Map();
    for (const i of list || []) { const n = itemName(i).trim(); if (n) m.set(n, (m.get(n) || 0) + (+i.qty || 1)); }
    return m;
  };
  const a = count(before), b = count(after);
  for (const [n, q] of b) {
    if (!a.has(n)) parts.push(`${add} ${q > 1 ? q + " × " : ""}${n}`);
    else if (qty && a.get(n) !== q) parts.push(`${n} ×${a.get(n)} → ×${q}`);
  }
  for (const n of a.keys()) if (!b.has(n)) parts.push(`${remove} ${n}`);
  return parts;
}

export function describeChange(before, after) {
  if (!before) return "created this character";
  if (!after) return "deleted this character";
  const parts = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (IGNORE.has(k) || DERIVED.has(k) || k.startsWith("_")) continue;
    const x = before[k], y = after[k];
    if (same(x, y)) continue;
    if ((x === undefined || x === null) && (blank(y) || typeof y === "object")) continue; // filled in on first open
    if (k === "inv") { parts.push(...diffList(x, y, { add: "added", remove: "removed", qty: true })); continue; }
    if (k === "prepared") { parts.push(...diffList(x, y, { add: "prepared", remove: "unprepared" })); continue; }
    if (k === "notes" || k === "backstory") { parts.push(`edited ${k}`); continue; }
    if (isObj(x) && isObj(y)) {
      const sub = Object.keys({ ...x, ...y }).filter(s => !same(x[s], y[s]));
      if (sub.length && sub.length <= 3 && sub.every(s => typeof (y[s] ?? x[s]) !== "object")) {
        for (const s of sub) parts.push(`${s.toUpperCase()} ${short(x[s] ?? 0)} → ${short(y[s] ?? 0)}`);
      } else parts.push(`updated ${LABELS[k] || k}`);
      continue;
    }
    if (typeof y === "object" || typeof x === "object") { parts.push(`updated ${LABELS[k] || k}`); continue; }
    parts.push(`${LABELS[k] || k} ${short(x ?? "—")} → ${short(y ?? "—")}`);
  }
  if (!parts.length) return "";
  return parts.length > MAX_PARTS
    ? parts.slice(0, MAX_PARTS).join(", ") + ` and ${parts.length - MAX_PARTS} more`
    : parts.join(", ");
}
