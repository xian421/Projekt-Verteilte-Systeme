import assert from "node:assert/strict";
import sanitize from "../utils/sanitize.js";

const evil = '<img src=x onerror=alert(1)><span class="ip-info">Okay</span>';
const clean = sanitize(evil);

assert.equal(clean, '<span class="ip-info">Okay</span>');
console.log("✔ sanitize() removes disallowed tags");
