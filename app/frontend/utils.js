// frontend/utils.js
// -----------------
// Basis-HTTP-Helper: einheitliches JSON-API-Schema

const HTTP_BASE = window.location.origin;

export async function apiFetch(path, { method = "GET", body } = {}) {
  const url = new URL(path, HTTP_BASE);
  if (method === "GET") url.searchParams.set("_", Date.now());

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json();
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || res.statusText);
  }
  return payload.data;
}
