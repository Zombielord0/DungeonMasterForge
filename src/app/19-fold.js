/* 19-fold.js: folding list groups and sheet sections.
   Any ".sec" with a ".sec-h" header inside the lists below gets a ▾ button; clicking the header bar folds the section
   (CSS hides everything in it but the header).
   - Lists (Items, Spells, the Monster Manual) with 2 or more groups start folded; character sheets start open (owner, 2026-11-18).
   - What someone folds or opens is remembered per browser in dmforge.fold.v2 ({key: true = folded, false = open}), keyed by
     list and header title (e.g. "it|Your custom items", "sheet|Skills"). Older dmforge.fold.v1 (a list of folded keys) is read once.
     It's a display choice, not saved data, so it isn't in BACKUP_KEYS.
   - While a list's search box has text, its groups show open (without changing what's remembered), so results aren't hidden.
   - Lists with several groups get one Fold all / Unfold all switch in their first title bar.
   A MutationObserver re-adds the buttons whenever a list is redrawn. */
const FOLD_KEY = "dmforge.fold.v2";
const FOLD = (() => {
  const out = new Map();
  try { const v = JSON.parse(localStorage.getItem(FOLD_KEY) || "null"); if (v && typeof v === "object" && !Array.isArray(v)) Object.entries(v).slice(0, 500).forEach(([k, f]) => out.set(String(k), !!f)); } catch { }
  if (!out.size) try { const v = JSON.parse(localStorage.getItem("dmforge.fold.v1") || "[]"); if (Array.isArray(v)) v.slice(0, 500).forEach(k => out.set(String(k), true)); } catch { }
  return out;
})();
const FOLD_LISTS = { spList: "sp", itList: "it", bsList: "mm", pcOut: "sheet", rosterMain: "sheet" };
const FOLD_SEARCH = { spList: "spQ", itList: "itQ", bsList: "bsQ" };
const FOLD_ALL_MIN = 2; // a list with at least this many groups starts folded and gets Fold all / Unfold all
function foldSave() { try { localStorage.setItem(FOLD_KEY, JSON.stringify(Object.fromEntries(FOLD))); } catch { } }
function foldTitle(h) { const h3 = h.querySelector("h3"); if (!h3) return ""; const t = [...h3.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); return (t ? t.textContent : h3.textContent).trim().slice(0, 60); }
function foldSet(sec, folded) {
  const k = sec.dataset.foldk; if (!k) return;
  sec.classList.toggle("folded", folded);
  const b = sec.querySelector(":scope > .sec-h > .fold-btn"); if (b) { b.setAttribute("aria-expanded", String(!folded)); b.title = folded ? "Show this list" : "Fold this list away"; }
}
/* the user's own choice: fold or open, and remember it */
function foldChoose(sec, folded) { foldSet(sec, folded); if (sec.dataset.foldk) FOLD.set(sec.dataset.foldk, folded); }
function foldify(box) {
  const pre = FOLD_LISTS[box.id]; if (!pre) return;
  const secs = [...box.querySelectorAll(".sec")].filter(s => s.firstElementChild && s.firstElementChild.classList.contains("sec-h"));
  const fresh = [];
  for (const s of secs) {
    if (s.dataset.foldk) continue;
    const title = foldTitle(s.firstElementChild); if (!title) continue;
    s.dataset.foldk = pre + "|" + title; s.classList.add("foldable");
    const b = document.createElement("button"); b.type = "button"; b.className = "fold-btn"; b.setAttribute("aria-label", "Fold " + title);
    b.textContent = "▾"; s.firstElementChild.appendChild(b);
    fresh.push(s);
  }
  if (fresh.length) {
    const q = FOLD_SEARCH[box.id] && document.getElementById(FOLD_SEARCH[box.id]), searching = !!(q && q.value.trim());
    const startFolded = pre !== "sheet" && box.querySelectorAll(":scope > .sec.foldable").length >= FOLD_ALL_MIN;
    fresh.forEach(s => { const k = s.dataset.foldk; foldSet(s, !searching && (FOLD.has(k) ? FOLD.get(k) : startFolded)); });
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
function foldToggle(sec) { foldChoose(sec, !sec.classList.contains("folded")); foldSave(); const box = sec.closest("[id]"); if (box && FOLD_LISTS[box.id]) foldAllSync(box); }
// open a folded section (used when jumping to it from the sheet's jump bar)
function foldOpen(el) { const s = el && el.closest(".sec.foldable"); if (s && s.classList.contains("folded")) { foldChoose(s, false); foldSave(); } }
document.addEventListener("click", e => {
  const all = e.target.closest("[data-foldall]");
  if (all) { const box = all.closest(".sec").parentElement; box.querySelectorAll(":scope > .sec.foldable").forEach(s => foldChoose(s, all.dataset.foldall === "1")); foldSave(); foldAllSync(box); return; }
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
