// frontend/tests/sanitize.test.js
import sanitize from "../utils/sanitize.js";

describe("sanitize()", () => {
  it("entfernt alle unerlaubten Tags", () => {
    const evil = '<img src=x onerror=alert(1)><span class="ip-info">Okay</span>';
    expect(sanitize(evil)).toBe('<span class="ip-info">Okay</span>');
  });
});
