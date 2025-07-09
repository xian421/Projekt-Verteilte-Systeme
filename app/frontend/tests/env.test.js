// @jest-environment jsdom
import { roomHashFromPath } from "../utils/env.js";

describe("roomHashFromPath", () => {
  it("extrahiert den Hash aus `/chat/<hash>`-URLs", () => {
    const hash =
      "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
    const path = `/chat/${hash}`;
    expect(roomHashFromPath(path)).toBe(hash);
  });

  it("extrahiert den Hash aus `/chat.html/<hash>`-URLs", () => {
    const hash =
      "ABCDEF1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const path = `/chat.html/${hash}`;  // kein trailing slash
    expect(roomHashFromPath(path)).toBe(hash.toLowerCase());
  });

  it("gibt einen leeren String zurück, wenn der Pfad nicht passt", () => {
    expect(roomHashFromPath("/some/other/path")).toBe("");
  });
});
