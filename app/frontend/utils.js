// frontend/utils.js
// -----------------
// Basis-HTTP-Helper: einheitliches JSON-API-Schema
// und dynamisches Auslesen von http-base/ws-base aus <chat-admin> oder <chat-app>

export function getBases() {
  // Suche zuerst im Modul-Scope, dann global nach chat-admin oder chat-app
  const el =
    (document.currentScript?.ownerDocument || document)
      .querySelector("chat-admin, chat-app") ||
    document.querySelector("chat-admin, chat-app");

  // Lese die Attribute oder falle auf window.location.origin zurück
  const httpBase = el?.getAttribute("http-base") || window.location.origin;

  // Ermittle ws-base, ggf. aus http → ws
  let wsBase = el?.getAttribute("ws-base");
  if (!wsBase) {
    wsBase = httpBase.replace(/^http/, "ws");
  }

  return { http: httpBase, ws: wsBase };
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  // Hole die Base-URLs bei jedem Aufruf
  const { http: HTTP_BASE } = getBases();

  // Baue die URL
  const url = new URL(path, HTTP_BASE);
  if (method === "GET") {
    // Cache-Buster
    url.searchParams.set("_", Date.now());
  }

  // Header mit Admin-Token und ggf. JSON-Content-Type
  const headers = {
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  // Anfrage abschicken
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Antwort parsen und auf OK prüfen
  const payload = await res.json();
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || res.statusText);
  }
  return payload.data;
}
