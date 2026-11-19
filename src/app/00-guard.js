/* 00-guard.js: a page-wide guard against page code hidden in shared text (2026-11-19, security review).
   Characters, homebrew and campaign text come from other people, and many templates write that text into the page.
   Whatever HTML the app adds, this strips what could run code before it can: event-handler attributes (on…),
   javascript: (and data:text/html) links, srcdoc, and frames, objects, embeds, <base> and <meta>. The app itself never
   adds any of these (its own few onsubmit attributes are in index.html, which loads before this runs), so nothing it
   draws changes. A MutationObserver's callback runs as a microtask, before any of those handlers could fire; a check
   in test:chartab tries the usual payloads. This is the safety net: keep escaping text with esc() in new code. */
const GUARD_URL_ATTRS = new Set(["href", "src", "action", "formaction", "xlink:href", "data", "poster", "background"]);
const GUARD_DROP = /^(IFRAME|FRAME|FRAMESET|OBJECT|EMBED|BASE|META)$/;
function guardNode(n) {
  if (GUARD_DROP.test(n.tagName)) { n.remove(); return; }
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
