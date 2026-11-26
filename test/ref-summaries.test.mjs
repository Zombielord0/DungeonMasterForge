// The book-reference summaries join (tools/ref-summaries.mjs, 2026-11-26).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { joinSummaries, joinSrdItems } from "../tools/ref-summaries.mjs";

const rows = [
  { kind: "Feat", name: "Alert", src: "phb-2014", details: [] },
  { kind: "Other rules", name: "Dueling", src: "phb-2014", details: [] },
  { kind: "Other rules", name: "Dueling", src: "xge", details: [] },
  { kind: "Other rules", name: "Bastions", src: "dmg-2024", ed: "2024", details: [] }
];

test("a summary joins by plain name or by Name|book", () => {
  const out = joinSummaries(rows, { _about: "x", Feat: { Alert: "A" }, "Other rules": { "Dueling|xge": "D" } });
  assert.equal(out[0].sum, "A");
  assert.equal(out[1].sum, undefined);
  assert.equal(out[2].sum, "D");
});

test("a plain name shared by two books stops the build", () => {
  assert.throws(() => joinSummaries(rows, { "Other rules": { Dueling: "D" } }), /more than one book; use "Dueling\|phb-2014"/);
});

test("a plain name shared by a 2014 and a 2024 reference stops the build", () => {
  const both = [...rows, { kind: "Other rules", name: "Bastions", src: "dmg-2014", details: [] }];
  assert.throws(() => joinSummaries(both, { "Other rules": { Bastions: "B" } }), /more than one book/);
});

test("a key that matches no reference stops the build", () => {
  assert.throws(() => joinSummaries(rows, { Feat: { Alret: "typo" } }), /no Feat reference named Alret/);
});

test("the real summaries cover every reference that has no details", () => {
  const refs = JSON.parse(readFileSync(new URL("../data/book-references.json", import.meta.url), "utf8"));
  const out = joinSummaries(refs, JSON.parse(readFileSync(new URL("../data/reference-summaries.json", import.meta.url), "utf8")));
  assert.deepEqual(out.filter(r => !r.details.length && !r.sum).map(r => `${r.kind}: ${r.name}`), []);
  assert.ok(!out.some(r => r.details.some(([k, v]) => k === "Rarity" && v === "unknown" && r.name !== "Ivana's Whisper")));
});

test("review wording: ritual copying limit and Cloud Rune's targets", () => {
  const other = JSON.parse(readFileSync(new URL("../data/reference-summaries.json", import.meta.url), "utf8"))["Other rules"];
  assert.match(other["Book of Ancient Secrets"], /spell level is no higher than half your warlock level \(rounded up\)/);
  assert.match(other["Cloud Rune"], /hits you or a creature/);
  assert.match(other["Cloud Rune"], /not the attacker/);
});

test("book items link to their free-rules name", () => {
  const items = [{ kind: "Item", name: "Ioun Stone, Agility", src: "dmg-2014", details: [] }, { kind: "Item", name: "Ioun Stone, Agility", src: "xge", details: [] }];
  const srd = new Set(["Ioun Stone of Agility"]);
  const out = joinSrdItems(items, { _about: "x", "dmg-2014": { "Ioun Stone, Agility": "Ioun Stone of Agility" } }, srd);
  assert.equal(out[0].srd, "Ioun Stone of Agility");
  assert.equal(out[1].srd, undefined);
  assert.throws(() => joinSrdItems(items, { "dmg-2014": { "Ioun Stone, Agility": "Ioun Stone of Agilty" } }, srd), /no free-rules item named Ioun Stone of Agilty/);
  assert.throws(() => joinSrdItems(items, { "dmg-2014": { "Ioun Stone, Agilty": "Ioun Stone of Agility" } }, srd), /no dmg-2014 item reference named Ioun Stone, Agilty/);
});

test("every Dungeon Master's Guide magic item has free-rules text or a summary", () => {
  const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
  const srd = new Set(read("items.json")["2014"].mi.filter(m => !m.src).map(m => m.n));
  const out = joinSrdItems(joinSummaries(read("book-references.json"), read("reference-summaries.json")), read("reference-srd-items.json"), srd);
  const bare = out.filter(r => r.kind === "Item" && r.src === "dmg-2014" && !["none", undefined].includes(Object.fromEntries(r.details).Rarity) && !r.srd && !r.sum);
  assert.deepEqual(bare.map(r => r.name), []);
});
