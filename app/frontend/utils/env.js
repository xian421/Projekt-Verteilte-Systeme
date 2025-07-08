// utils/env.js
// ------------
// Liefert die HTTP‑ und WS‑Basen (memoisiert) sowie diverse kleine
// URL‑Utilities, die bisher in jeder Komponente kopiert wurden.

let _cachedBases = null;

/**
 * Ermittelt http://…  und ws://…  Basis‑URLs.
 *  – Zieht Werte aus Attributen `http-base` / `ws-base`, falls eine
 *    Komponente sie setzt (z.B. in Tests oder Storybook).
 *  – Fällt sonst auf location.origin zurück.
 * @param {HTMLElement} [el]  – Optional: Komponente, von der aus gelesen wird.
 */
export function getBases(el) {
  if (_cachedBases && !el) return _cachedBases;     // speed‑up für globale Calls

  const http = el?.getAttribute?.("http-base") ||
               location.origin;

  const ws   = el?.getAttribute?.("ws-base")  ||
               (http.startsWith("https") ? "wss://" : "ws://") +
               new URL(http).host;

  return (_cachedBases = { http, ws });
}

/* ---------- Room‑Token aus URL -------------------------- */
const HASH_RE = /(?:\/pages)?\/chat(?:\.html)?\/([a-f0-9]{64})$/i;
export function roomHashFromPath(pathname = location.pathname) {
  return HASH_RE.exec(pathname.replace(/\/{2,}/g, "/"))?.[1]?.toLowerCase() || "";
}
