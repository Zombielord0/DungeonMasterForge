/* 14-boot.js: The collapsible toolbar, routing between tabs (route), and start-up. */

/* ======================= Minimizable toolbar ======================= */
const hdrPhone = matchMedia("(max-width:600px)");
let hdrHold = 0; // until then, scrolling doesn't move the header (the page shifts when the full header opens)
function hdrSync() {
  const H = document.documentElement, mini = hdrPhone.matches ? !H.classList.contains("hdr-full") : H.classList.contains("hdr-mini"), btn = document.getElementById("hdrToggle");
  btn.textContent = mini ? "▾ Show tabs" : "▴ Hide tabs";
  btn.setAttribute("aria-expanded", String(!mini));
  btn.title = mini ? "Show the toolbar and tabs" : "Hide the toolbar to give this tab more room";
  const sel = document.getElementById("hdrTabSel"), tabs = $$("nav a").filter(a => !a.hidden);
  sel.innerHTML = tabs.map(a => `<option value="${esc(a.dataset.view)}"${a.classList.contains("active") ? " selected" : ""}>${esc(a.firstChild.textContent.trim())}</option>`).join("");
}
document.getElementById("hdrTabSel").addEventListener("change", e => { location.hash = e.target.value; });
document.getElementById("hdrTabSel").addEventListener("focus", hdrSync); // pick up tabs revealed after sign-in
document.getElementById("hdrToggle").addEventListener("click", () => {
  const H = document.documentElement;
  if (hdrPhone.matches) { hdrHold = performance.now() + 500; H.classList.toggle("hdr-full"); H.classList.remove("hdr-away"); hdrSync(); return; } // phones: just for this visit
  const mini = H.classList.toggle("hdr-mini");
  try { localStorage.setItem("dmforge.hdrMini", mini ? "1" : "0"); } catch (e) {}
  hdrSync();
});
hdrPhone.addEventListener("change", () => { document.documentElement.classList.remove("hdr-away", "hdr-full"); hdrSync(); });
/* Phones: the header slides away when scrolling down past its height or while typing in a box, and comes back after
   scrolling up 24px or more, or near the top of the page. */
(function hdrAuto() {
  const H = document.documentElement, head = document.querySelector("header");
  let lastY = scrollY, up = 0, typing = false;
  const set = v => H.classList.toggle("hdr-away", v);
  const field = e => e && e.matches && e.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select") && !e.closest("header");
  addEventListener("scroll", () => {
    const y = scrollY, d = y - lastY; lastY = y;
    if (!hdrPhone.matches) { set(false); return; }
    if (performance.now() < hdrHold) return;
    if (!document.getElementById("newsPanel").hidden) { set(false); return; } // What's new opens from the header
    if (typing) { set(true); return; }
    if (y < 80) { up = 0; set(false); return; }
    if (d > 0) { up = 0; if (y > head.offsetHeight) set(true); }
    else if (d < 0) { up -= d; if (up >= 24) set(false); }
  }, { passive: true });
  document.addEventListener("focusin", e => { if (field(e.target)) { typing = true; if (hdrPhone.matches) set(true); } });
  document.addEventListener("focusout", e => { if (field(e.target)) typing = false; });
})();

/* ======================= Routing ======================= */
function route() {
  const views = (window.Portal && Portal.views) || ["generate", "npc", "world", "monsters", "character", "roster", "spells", "feats", "items", "map", "tracker", "homebrew"];
  const v = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : ((window.Portal && Portal.home) || "generate");
  $$("section.view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  $$("nav a").forEach(a => a.classList.toggle("active", a.dataset.view === v));
  { const n = $("nav"), on = $("nav a.active"); if (n && on && n.scrollWidth > n.clientWidth) n.scrollTo({ left: Math.max(0, on.offsetLeft - n.clientWidth / 2 + on.offsetWidth / 2), behavior: "smooth" }); }
  if (v === "map" && !currentMap) renderMap();
  if (v === "map") mapPlaceFill();
  if (v === "tracker") renderTracker();
  if (v === "npc") { worldAdopt(); renderNpcLib(); }
  if (v === "world") renderWorld();
  if (v === "spells") renderSpells();
  if (v === "items") renderItems();
  if (v === "roster") renderRosterTab();
  if (v === "homebrew") renderHomebrew();
  if (v === "feats") renderFeats();
  if (v === "party" && window.Portal) Portal.renderParty();
  if (v === "whispers" && window.Portal) Portal.renderWhispers();
  hdrSync();
}
window.addEventListener("hashchange", route);

/* ======================= Boot ======================= */
hbLoadLocal(); // the campaign's homebrew replaces this once signed in
pcRestore();
route();
renderCampList();
Store.init().then(() => { try { worldAdopt(); } catch (e) { console.warn(e); } renderCampList(); pcAdoptRemote(); itemsAdopt(); if (location.hash === "#tracker") renderTracker(); if (location.hash === "#roster") renderRosterTab(); });
