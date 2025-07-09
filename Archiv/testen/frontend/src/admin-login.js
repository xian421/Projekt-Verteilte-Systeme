/* ---------- 0 | zentrale Basis-URL --------------------- */
const CFG       = window.ChatConfig || {};
const HTTP_BASE = CFG.httpBase
               || `${location.protocol}//${location.host}`;

// Steuert den Login-Flow des Admin-Panels
function handleLogin(pwInput, errBox, authScreen) {
  return async () => {
    errBox.hidden = true;

    try {
      const res = await fetch(`${HTTP_BASE}/admin/login`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ password: pwInput.value })
      });
      if (!res.ok) throw new Error('Bad Credentials');

      const { token } = await res.json();
      localStorage.setItem('adminToken', token);  

      authScreen.remove();
    document.body.classList.add('admin-panel');
    const tpl = document.getElementById('panel-tpl');
    document.body.append(tpl.content.cloneNode(true));
    } catch {
      errBox.hidden = false;
      pwInput.value = '';
      pwInput.focus();
    }
  };
}

function init() {
  const authScreen = document.getElementById('auth-screen');
  const pwInput    = document.getElementById('auth-password');
  const submitBtn  = document.getElementById('auth-submit');
  const errBox     = document.getElementById('auth-error');

  const login = handleLogin(pwInput, errBox, authScreen);
  submitBtn.addEventListener('click', login);
  pwInput .addEventListener('keydown', e => e.key === 'Enter' && login());
}

document.addEventListener('DOMContentLoaded', init);
