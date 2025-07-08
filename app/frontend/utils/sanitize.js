// utils/sanitize.js
// -----------------
// Kein externes Paket erlaubt.  VERY simple allow‑list Sanitizer:
// • Erlaubt <span>, <b>, <i>, <strong>, <em>, <br>
// • Entfernt jegliche Attribute außer class.
//
// → Für unseren Chat reicht das, da nur <span class="ip-info …"> vorkommt.

const ALLOWED_TAGS = new Set(["SPAN","B","I","EM","STRONG","BR"]);

export default function sanitize(html) {
  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!ALLOWED_TAGS.has(node.tagName)) {
        node.replaceWith(...node.childNodes);           // unwrap verbotene Tags
        return;
      }
      // Attribute‑Whitelist
      [...node.attributes].forEach(attr => {
        if (attr.name !== "class") node.removeAttribute(attr.name);
      });
    }
    node.childNodes.forEach(walk);
  };
  template.content.childNodes.forEach(walk);
  return template.innerHTML;
}
