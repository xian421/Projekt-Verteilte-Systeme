// Leitet vom Token-Formular zur Chat-Seite um
function init() {
  const form  = document.getElementById('enter-form');
  const input = document.getElementById('token-input');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const hash = input.value.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) return;           

    location.href = `/chat/${hash}`;                     
  });
}

document.addEventListener('DOMContentLoaded', init);
