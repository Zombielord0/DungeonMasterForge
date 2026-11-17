// Fillable PDF character sheets (run from char-import.cjs)
const fs = require("fs"), path = require("path");
module.exports = async (p, { URL, check, FIX }) => {
  const pdfPath = path.join(FIX, "sheet-wizard.pdf"), b64 = fs.readFileSync(pdfPath).toString("base64");
  await p.goto(URL + "#roster"); await p.waitForTimeout(300);
  await p.evaluate(() => { PCS.roster = []; pcPersist(); renderRosterTab(); });
  const r = await p.evaluate(async b64 => {
    const bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
    const F = await pdfFields(bytes.buffer), D = pdfImport(F, "2014"); if (D.error) return { error: D.error };
    const { c, report } = importBuild(D);
    return { report, homebrew: D.homebrew, c: { name: c.name, cls: c.cls, level: c.level, race: c.race, sub: c.sub, bg: c.bg, align: c.align, scores: c.scores, saves: c.saves, skills: c.skills.filter(s => s.p).map(s => s.s), prepared: c.prepared, hp: c.hp, hpCur: c.hpCur, ac: c.ac, coins: c.coins, inv: c.inv.map(i => [i.n, i.qty]), langs: c.langs, toolsChosen: c.toolsChosen, look: c.look, notes: c.notes, trait: c.trait } };
  }, b64);
  check("a fillable PDF reads without error", !r.error, r.error);
  if (r.error) return;
  const c = r.c;
  check("PDF: class, level, species with its subrace, background and alignment", c.cls === "Wizard" && c.level === 6 && c.race === "Halfling" && c.sub === "Lightfoot Halfling" && c.bg === "Charlatan" && c.align === "Chaotic Good", JSON.stringify([c.cls, c.level, c.race, c.sub, c.bg, c.align]));
  check("PDF: final scores equal the sheet's", JSON.stringify(c.scores) === JSON.stringify({ str: 8, dex: 20, con: 16, int: 18, wis: 13, cha: 15 }), JSON.stringify(c.scores));
  check("PDF: saves and skills from the check boxes", c.saves.includes("int") && c.saves.includes("wis") && ["Arcana", "Deception", "Investigation", "Sleight of Hand"].every(s => c.skills.includes(s)), JSON.stringify([c.saves, c.skills]));
  const prep = c.prepared.map(s => s.n);
  check("PDF: hand-typed spell names match the built-ins", ["Fire Bolt", "Mage Hand", "Detect Magic", "Magic Missile", "Protection from Evil and Good", "Mirror Image", "Haste"].every(n => prep.includes(n)), prep.join(", "));
  check("PDF: a spell named after its wizard matches the free rules' name", prep.includes("Floating Disk") && !r.homebrew.some(x => /Tenser/.test(x.name)), prep.join(", "));
  check("PDF: fuzzy matches are listed", r.report.matched.some(t => /Firebolt → Fire Bolt/.test(t)) && r.report.matched.some(t => /Magic Missle → Magic Missile/.test(t)), JSON.stringify(r.report.matched));
  const bs = r.homebrew.find(x => x.kind === "spell" && x.name === "Bone Shard"), mm = r.homebrew.find(x => x.kind === "spell" && /Melf/.test(x.name));
  check("PDF: an unknown spell becomes a name-only homebrew spell at its line's level", bs && bs.l === 2 && bs.desc === "" && prep.includes("Bone Shard"), JSON.stringify(bs));
  check("PDF: a spell in the 3rd-level column gets level 3", mm && mm.l === 3, JSON.stringify(mm));
  check("PDF: the first line under level 2 is a level 2 spell", c.prepared.find(s => s.n === "Mirror Image").l === 2);
  check("PDF: a missing subclass is pointed out", r.report.differ.some(t => /Wizard subclass/.test(t)), JSON.stringify(r.report.differ));
  check("PDF: the portrait isn't imported, and says so", r.report.dropped.some(t => /Portrait not imported/.test(t)));
  check("PDF: HP and AC agree with the sheet", !r.report.differ.some(t => /HP|Armor class/i.test(t)) && c.hp === 44 && c.ac === 15, JSON.stringify([c.hp, c.ac, r.report.differ]));
  check("PDF: current HP, coins and gear come across", c.hpCur === 40 && c.coins.gp === 120 && c.coins.sp === 7 && c.inv.some(([n, q]) => /^Dagger$/i.test(n) && q === 2) && c.inv.some(([n]) => /Spellbook/i.test(n)), JSON.stringify([c.hpCur, c.coins, c.inv]));
  check("PDF: languages and tools", /Common/.test(c.langs) && /Halfling/.test(c.langs) && /Disguise Kit/.test(c.toolsChosen) && /Forgery Kit/.test(c.toolsChosen), JSON.stringify([c.langs, c.toolsChosen]));
  check("PDF: appearance, story and notes", /23/.test(c.look) && /3' 1/.test(c.look) && /lie about almost everything/.test(c.trait) && /Copper Kettle/.test(c.notes) && /Free healing potion/.test(c.notes), JSON.stringify([c.look, c.notes]));
  // a PDF without fillable boxes
  const blank = await p.evaluate(async () => {
    const txt = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
    const F = await pdfFields(new TextEncoder().encode(txt).buffer); return pdfImport(F, "2014");
  });
  check("a PDF with no fillable boxes is refused with a clear reason", /no fillable fields/.test(blank.error || ""), JSON.stringify(blank));
  // through the window
  await p.click("#impCharBtn"); await p.waitForSelector("#impCharModal.open");
  await p.setInputFiles("#impCharFile", pdfPath);
  await p.waitForFunction(() => /Matched|isn't|can't/.test(document.querySelector("#impCharOut").textContent), null, { timeout: 20000 }).catch(() => { });
  const out = await p.textContent("#impCharOut");
  check("the window reads a PDF", /Pip Underbough/.test(out) && /Wizard 6/.test(out), out.slice(0, 200));
  check("the window says a PDF has names only", /names only/.test(out));
  await p.click("#impCharGo"); await p.waitForTimeout(700);
  check("the PDF character is imported", await p.evaluate(() => PCS.roster.some(c => c.name === "Pip Underbough" && c.cls === "Wizard")));
  await p.evaluate(() => { PCS.roster = []; pcPersist(); });
};
