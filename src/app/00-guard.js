/* 00-guard.js: a page-wide safety net against page code hidden in shared text (2026-11-19, security review).
   Characters, homebrew and campaign text come from other people, and the templates write that text into the page.
   Whatever HTML the app adds, this strips what could run code: event-handler attributes (on…), javascript: (and
   data:text/html) links, srcdoc, SVG animations, and frames, objects, embeds, <base> and <meta>. The app adds none of
   these itself (its few onsubmit attributes are in index.html, which loads before this runs). A MutationObserver's
   callback runs as a microtask, before images, toggles and the like can fire; test:chartab tries the usual payloads.
   It is NOT complete: an event fired synchronously right after an insertion (code that calls .focus() or .click() on
   new elements, which the app does) runs before the guard, and a <meta http-equiv=refresh> still redirects. So esc()
   in every template is the real protection; this only catches what slips through. */
const GUARD_URL_ATTRS = new Set(["href", "src", "action", "formaction", "xlink:href", "data", "poster", "background"]);
const GUARD_DROP = /^(IFRAME|FRAME|FRAMESET|OBJECT|EMBED|BASE|META|ANIMATE|SET|ANIMATEMOTION|ANIMATETRANSFORM)$/i; /* SVG animations can set href to javascript: without an attribute */
function guardNode(n) {
  if (GUARD_DROP.test(n.tagName) || GUARD_DROP.test(n.localName || "")) { n.remove(); return; }
  for (const a of [...n.attributes]) {
    const name = a.name.toLowerCase();
    if (name.startsWith("on") || name === "srcdoc" || (GUARD_URL_ATTRS.has(name) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value.replace(/[\u0000- ]/g, "")))) n.removeAttribute(a.name);
  }
}
function guardTree(root) {
  if (!root || root.nodeType !== 1) return;
  guardNode(root);
  if (root.isConnected === false && root.parentNode === null && GUARD_DROP.test(root.tagName)) return;
  root.querySelectorAll("*").forEach(guardNode);
}
new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(guardTree); }).observe(document.documentElement, { childList: true, subtree: true });
