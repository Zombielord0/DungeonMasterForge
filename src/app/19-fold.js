/* 19-fold.js: folding list groups and sheet sections.
   Any ".sec" with a ".sec-h" header inside the lists below gets a ▾ button; clicking the header bar folds the section
   (CSS hides everything in it but the header). Which sections are folded is remembered per browser in dmforge.fold.v1,
   keyed by list and header title (e.g. "it|Your custom items", "sheet|Skills"). It's a display choice, not saved data,
   so it isn't in BACKUP_KEYS. Lists with several groups get one Fold all / Unfold all switch in their first title bar. A MutationObserver re-adds the buttons whenever a list is redrawn. */
const FOLD_KEY = "dmforge.fold.v1";
const FOLD = (() => { try { const v = JSON.parse(localStorage.getItem(FOLD_KEY) || "[]"); return new Set(Array.isArray(v) ? v.map(String).slice(0, 500) : []); } catch { return new Set(); } })();
const FOLD_LISTS = { spList: "sp", itList: "it", bsList: "mm", pcOut: "sheet", rosterMain: "sheet" };
const FOLD_ALL_MIN = 2; // a list with at least this many groups gets Fold all / Unfold all
function foldSave() { try { localStorage.setItem(FOLD_KEY, JSON.stringify([...FOLD])); } catch { } }
function foldTitle(h) { const h3 = h.querySelector("h3"); if (!h3) return ""; const t = [...h3.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); return (t ? t.textContent : h3.textContent).trim().slice(0, 60); }
function foldSet(sec, folded) {
  const k = sec.dataset.foldk; if (!k) return;
  sec.classList.toggle("folded", folded);
  const b = sec.querySelector(":scope > .sec-h > .fold-btn"); if (b) { b.setAttribute("aria-expanded", String(!folded)); b.title = folded ? "Show this list" : "Fold this list away"; }
  if (folded) FOLD.add(k); else FOLD.delete(k);
}
function foldify(box) {
  const pre = FOLD_LISTS[box.id]; if (!pre) return;
  const secs = [...box.querySelectorAll(".sec")].filter(s => s.firstElementChild && s.firstElementChild.classList.contains("sec-h"));
  for (const s of secs) {
    if (s.dataset.foldk) continue;
    const title = foldTitle(s.firstElementChild); if (!title) continue;
    s.dataset.foldk = pre + "|" + title; s.classList.add("foldable");
    const b = document.createElement("button"); b.type = "button"; b.className = "fold-btn"; b.setAttribute("aria-label", "Fold " + title);
    b.textContent = "▾"; s.firstElementChild.appendChild(b);
    foldSet(s, FOLD.has(s.dataset.foldk));
  }
  foldAllSync(box);
}
/* One "Fold all" / "Unfold all" switch, in the first group's title bar so the list doesn't move down on phones.
   It reads Unfold all once every group is folded. */
function foldAllSync(box) {
  if (FOLD_LISTS[box.id] === "sheet") return;
  const groups = [...box.querySelectorAll(":scope > .sec.foldable")], old = box.querySelector(".fold-all");
  if (groups.length < FOLD_ALL_MIN) { if (old) old.remove(); return; }
  const fold = groups.some(s => !s.classList.contains("folded")), label = fold ? "Fold all" : "Unfold all";
  let b = old;
  if (!b || b.closest(".sec") !== groups[0]) { if (b) b.remove(); b = document.createElement("button"); b.type = "button"; b.className = "fold-all"; groups[0].firstElementChild.lastElementChild.before(b); }
  if (b.dataset.foldall !== (fold ? "1" : "0")) b.innerHTML = `<span aria-hidden="true">${fold ? "▸▸" : "▾▾"}</span><span class="fold-all-w"> ${label}</span>`;
  b.dataset.foldall = fold ? "1" : "0"; b.setAttribute("aria-label", label); b.title = fold ? "Fold every group in this list" : "Open every group in this list";
}
function foldToggle(sec) { foldSet(sec, !sec.classList.contains("folded")); foldSave(); const box = sec.closest("[id]"); if (box && FOLD_LISTS[box.id]) foldAllSync(box); }
// open a folded section (used when jumping to it from the sheet's jump bar)
function foldOpen(el) { const s = el && el.closest(".sec.foldable"); if (s && s.classList.contains("folded")) { foldSet(s, false); foldSave(); } }
document.addEventListener("click", e => {
  const all = e.target.closest("[data-foldall]");
  if (all) { const box = all.closest(".sec").parentElement; box.querySelectorAll(":scope > .sec.foldable").forEach(s => foldSet(s, all.dataset.foldall === "1")); foldSave(); foldAllSync(box); return; }
  const h = e.target.closest(".sec.foldable > .sec-h"); if (!h) return;
  // buttons, links and fields in the header keep their own job; only the ▾ button and the bar itself fold
  const ctl = e.target.closest("button,a,input,select,textarea,label,[role=button]");
  if (ctl && !ctl.classList.contains("fold-btn")) return;
  foldToggle(h.parentElement);
});
Object.keys(FOLD_LISTS).forEach(id => {
  const box = document.getElementById(id); if (!box) return;
  foldify(box);
  new MutationObserver(() => foldify(box)).observe(box, { childList: true, subtree: true });
});
