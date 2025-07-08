// Kleine Utility-Lib: weniger Boilerplate im ganzen Projekt
export const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  Object.assign(n, props);
  kids.flat().forEach(k => k != null && n.append(k));
  return n;
};

export const span  = (cls, txt)          => el('span',  { className: cls, textContent: txt });
export const btn   = (txt, cls, fn)      => el('button',{ className: cls, textContent: txt, onclick: fn });
export const copyBtn = (value) => {
  const b = btn('📋', 'copy', async e => {
    await navigator.clipboard.writeText(value);
    const badge = span('copied', '✓');
    b.after(badge);
    setTimeout(() => badge.remove(), 1200);
  });
  return b;
};
