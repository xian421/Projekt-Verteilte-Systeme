// frontend/api.js
// ---------------
// Klare Methoden für jeden Endpoint

import { apiFetch } from "./utils.js";

// ========== Public API Endpoints ==========

export const getRooms = () => 
  apiFetch("/rooms.json");

export const getBlocklist = (room) =>
  apiFetch(`/blocklist.json?room=${room}`);

// ========== Admin API Endpoints ==========

export const addRoom = (name) =>
  apiFetch("/admin/add-room", { 
    method: "POST", 
    body: { name } 
  });

export const removeRoom = (hash) =>
  apiFetch("/admin/remove-room", { 
    method: "POST", 
    body: { hash } 
  });

export const updateBlocklist = (hash, list) =>
  apiFetch("/admin/update-blocklist", {
    method: "POST",
    body: { hash, list },
  });
