import { createHash } from "node:crypto";

// These hashes cover the normalized subclass records reproduced by
// tools/convert-open5e-extras.py from the pinned Open5e fixture revision.
const REVISION = "7d21c969d9290259a04ab678addc6c758f4ffa03";
const SNAPSHOTS = {
  toh: ["kobold-press/toh", 76, "a89d98e85539cecd104cea804d34a91bb600cdd98fdeaba325132a2900837637"],
  tdcs: ["green-ronin/tdcs", 4, "cdb7cb808b0ddecc6df0dd51e998c2b5d3654b39688a0e34ee2733cad0ccbc79"],
  open5e: ["open5e/open5e", 16, "9d28f0aeb2059f1a8a6f68a48acaa92d5794bc2ef23cdbba955131e0d79aa071"],
  "open5e-2024": ["open5e/open5e-2024", 1, "11d06504c2572a9a20d7ab594e1695c4d7057858f0a42b999b22ac8a2e3a879b"],
};

// Cantrips that the source grants in the feature text outside the tables.
const BONUS_CANTRIPS = {
  "book-toh_animal-lords": ["Natural Blessing", "Druidcraft"],
  "book-toh_circle-of-bees": ["Circle Spells (Circle of Bees)", "True Strike"],
  "book-toh_circle-of-the-shapeless": ["Circle Spells (Circle of the Shapeless)", "Acid Splash"],
  "book-toh_circle-of-wind": ["Bonus Cantrip", "Message"],
};

const spellName = name => name.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/'S\b/g, "'s");

function tableCells(text) {
  return text.split(/\r?\n/).flatMap(line => {
    const cells = line.trim().replace(/^\|\s*|\s*\|$/g, "").split("|").map(cell => cell.trim());
    const level = cells.shift().match(/^(\d+)(?:st|nd|rd|th)?$/i);
    return level && cells.length ? [[Number(level[1]), cells]] : [];
  });
}

function spellCells(cell, level) {
  // Normal prose is deliberately excluded. A table spell may be italicized
  // and followed by a source restriction such as "(snakes only)".
  return cell.replace(/[\*_]/g, "").split(",").flatMap(value => {
    const read = value.trim().match(/^([\p{L}][\p{L}'’ /-]*?)(?:\s*\(([^()]+)\))?$/u);
    if (!value.trim()) return [];
    if (!read) throw new Error(`Invalid subclass spell table cell: ${value}`);
    const [, name, restriction] = read;
    return [{ name: spellName(name), level, ...(restriction ? { restriction } : {}) }];
  });
}

function openSpellTrack(option, feature) {
  const rows = tableCells(feature.d);
  if (rows.length === 0) return undefined;
  const { cls } = option;
  const prepared = (cls === "Cleric" && /Domain Spells\b/.test(feature.n)) ||
    (cls === "Druid" && /^Circle Spells\b/.test(feature.n)) ||
    (cls === "Paladin" && /^Oath Spells\b/.test(feature.n));
  const expanded = cls === "Warlock" && /^Expanded Spell List\b/.test(feature.n);
  const known = cls === "Ranger" && / Magic$/.test(feature.n);
  if (!prepared && !expanded && !known) return undefined;
  const mode = prepared ? "prepared" : expanded ? "expanded" : "known";
  const affinity = option.id === "book-toh_animal-lords" ? [null, "Air", "Earth", "Water"] : [null];
  const halfCaster = cls === "Paladin" || cls === "Ranger";
  const spells = rows.flatMap(([gate, cells]) => {
    if (cells.length !== affinity.length || gate < 1 || gate > 20) throw new Error(`Invalid spell table layout in ${option.id}`);
    const spellLevel = expanded ? gate : Math.ceil(gate / (halfCaster ? 4 : 2));
    return cells.flatMap((cell, i) => spellCells(cell, spellLevel).map(spell => ({
      ...spell, ...(expanded ? {} : { gate }), ...(affinity[i] ? { affinity: affinity[i] } : {}),
    })));
  });
  return { mode, feature: feature.n, spells };
}

export function recoverOpenSubclasses(options) {
  const checked = new Set();
  for (const [code, [, count, hash]] of Object.entries(SNAPSHOTS)) {
    const rows = options.filter(option => option.kind === "subclass" && option.src === code);
    const actual = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    if (rows.length !== count || actual !== hash) throw new Error(`Review changes to the Open5e subclass snapshot for ${code} before updating its checksum.`);
    rows.forEach(row => checked.add(row.id));
  }
  return options.map(option => {
    if (!checked.has(option.id)) return option;
    const [folder] = SNAPSHOTS[option.src];
    const features = option.id === "book-toh_circle-of-wind"
      ? option.features.map(feature => feature.n.startsWith("Circle Spells") ? { ...feature, l: 3 } : feature)
      : option.features;
    const spellTracks = features.map(feature => openSpellTrack(option, feature)).filter(Boolean);
    const bonus = BONUS_CANTRIPS[option.id];
    if (bonus) {
      const [feature, name] = bonus;
      const gate = features.find(row => row.n === feature)?.l;
      if (!gate) throw new Error(`Unmatched cantrip feature in ${option.id}`);
      spellTracks.push({ mode: "known", feature, spells: [{ name, level: 0, gate }] });
    }
    return {
      ...option, features, sourceEdition: option.src === "open5e-2024" ? "2024" : "2014",
      ...(spellTracks.length ? { openSpellTracks: spellTracks } : {}),
      featureSourceReview: {
        status: "provider_snapshot_matched",
        reference: `https://github.com/open5e/open5e-api/tree/${REVISION}/data/v2/${folder}`,
        primaryVerified: false, runtimeVerified: false,
        note: "Matched catalog identity, progression records, and feature wording to the pinned Open5e fixtures. Printed source, rule coverage, and individual license review are pending.",
      },
    };
  });
}
