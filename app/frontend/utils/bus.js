// utils/bus.js
// ------------
// Super‑leichter Event‑Bus auf Basis von EventTarget.
//  bus.on('evt', fn)           – subscribe
//  bus.off('evt', fn)          – unsubscribe
//  bus.emit('evt', {…})        – publish

const bus = new EventTarget();

export const on  = (evt, fn) => bus.addEventListener(evt, fn);
export const off = (evt, fn) => bus.removeEventListener(evt, fn);
export const emit = (evt, detail = {}) =>
  bus.dispatchEvent(new CustomEvent(evt, { detail }));

export default { on, off, emit };
