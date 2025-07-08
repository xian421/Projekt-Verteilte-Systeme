// chat-template.js  (v3)
export const CHAT_TEMPLATE = /*html*/ `
<style>
@layer reset, tokens, base, components, utilities;

/* ---------- 1 | Reset ----------------------------- */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

/* ---------- 2 | Theme-Tokens ---------------------- */
@layer tokens {
  :host {
    /* ===== Basis (= helle Karte) ===== */
    --chat-surface:        0 0% 100% / 90%;  /* ⬅️ bleibt IMMER gleich */
    --chat-surface-border: 0 0%   0% / .12;
    --chat-text:           0 0%  15%;

    /* Light-Akzentfarben */
    --chat-primary:        220 90% 56%;
    --chat-input-border:   0 0%   0% / .12;
    --chat-shadow:         0 8px 24px rgb(0 0 0 / .15);

    /* Aliase */
    --primary:        var(--chat-primary);
    --surface:        var(--chat-surface);
    --surface-border: var(--chat-surface-border);
    --text:           var(--chat-text);
    --input-border:   var(--chat-input-border);
    --radius:         1rem;
    --shadow:         var(--chat-shadow);

    height: 100dvh;
    overscroll-behavior: contain;
    color: hsl(var(--text));
  }

  /* ===== Dark-Overrides per OS ===== */
  @media (prefers-color-scheme: dark) {
    :host:not([theme]) {
      --chat-primary:      205 100% 66%;
      --chat-text:         0 0%  98%;
      --chat-input-border: 0 0% 100% / .15;
      --chat-shadow:       0 8px 24px rgb(0 0 0 / .40);
      /* --chat-surface bleibt unverändert → helle Karte */
    }
  }

  /* ===== Manueller Switch bleibt möglich ===== */
  :host([theme="dark"]) {
    --chat-primary:        var(--chat-primary, 205 100% 66%);
    --chat-text:           var(--chat-text,   0 0% 98%);
    --chat-input-border:   var(--chat-input-border, 0 0% 100% / .15);
    --chat-shadow:         var(--chat-shadow, 0 8px 24px rgb(0 0 0 / .40));
  }
}

/* ---------- 3 | Base ------------------------------ */
@layer base {
  :host{
    display:flex;align-items:center;justify-content:center;
    font:100%/1.5 system-ui,sans-serif;
    accent-color:hsl(var(--primary));
  }
}

/* ---------- 4 | Components ------------------------ */
@layer components {
  .chat-container{
    container-type:inline-size;container-name:chat;
    width:min(98vw,420px);margin:auto;display:flex;flex-direction:column;
    gap:1.25rem;padding:2rem 1rem;border-radius:var(--radius);
    background:hsl(var(--surface));
    backdrop-filter:blur(12px)saturate(150%);
    border:1.5px solid hsl(var(--surface-border));
    box-shadow:var(--shadow);min-height:60dvh;
    padding-bottom:calc(2rem + env(safe-area-inset-bottom));
  }
  @container chat (max-width:30rem){
    .chat-container{width:100%;min-height:100dvh;border-radius:0;
      padding-inline:.5rem;padding-block:1rem env(safe-area-inset-bottom);box-shadow:none;}
  }

  .chat-box{
    flex:1;min-height:32dvh;max-height:48dvh;overflow-y:auto;
    display:flex;flex-direction:column;gap:.6rem;padding:.7rem .5rem;
    border-radius:calc(var(--radius)*.75);
    background:color-mix(in srgb,hsl(var(--surface)) 95%,transparent);
    scroll-snap-type:y proximity;scrollbar-width:thin;
  }
  .chat-box::-webkit-scrollbar{width:.6rem}
  .chat-box::-webkit-scrollbar-thumb{
    background:color-mix(in srgb,hsl(var(--primary)) 30%,transparent);
    border-radius:999px;
  }
  @container chat (max-width:30rem){
    .chat-box{scrollbar-width:none}.chat-box::-webkit-scrollbar{display:none}
  }

  .chat-message,.system-message{
    --bg:color-mix(in srgb,hsl(var(--surface)) 96%,hsl(var(--primary)) 5%);
    align-self:flex-start;padding:.5rem .85rem;border-radius:calc(var(--radius)*.5);
    animation:fade-in .3s;font-size:1rem;background:var(--bg);
  }
  .chat-message:nth-child(odd){
    --bg:color-mix(in srgb,hsl(var(--surface)) 98%,hsl(var(--primary)) 4%);
  }
  .chat-message{border-left:3px solid hsl(var(--primary));}
  .system-message{background:none;font-size:.92rem;font-style:italic;align-self:center}
  @keyframes fade-in{from{opacity:0;translate:0 12px}to{opacity:1;translate:0 0}}

  .chat-form{display:flex;gap:.5rem;margin-top:auto;}
  @container chat (max-width:23.75rem){.chat-form{flex-direction:column}}

  input,button{font:inherit;border-radius:calc(var(--radius)*.5);border:1px solid transparent}
  input{
    flex:1 1 0;min-width:0;padding:.7rem;width:100%;
    background:color-mix(in srgb,hsl(var(--surface)) 97%,transparent);
    color:hsl(var(--text));border:1px solid hsl(var(--input-border));
    transition:border-color .2s,box-shadow .2s;
  }
  input:focus-visible{outline:none;border-color:hsl(var(--primary));
    box-shadow:0 0 0 2px color-mix(in srgb,hsl(var(--primary)) 30%,transparent);}
  button.primary{
    padding:.7rem 1.1rem;background:hsl(var(--primary));color:#fff;cursor:pointer;
    border:1px solid #1113;transition:background .18s;flex:0 0 auto;
  }
  button.primary:disabled{opacity:.6;cursor:not-allowed}
  button.primary:is(:hover,:focus-visible){
    background:color-mix(in srgb,hsl(var(--primary)) 80%,#fff);}
  button.primary:focus-visible{outline:2px solid currentColor;outline-offset:2px}

  .icon-btn{
    background:none;border:none;cursor:pointer;font-size:1rem;margin-left:.4rem;
    color:hsl(var(--primary));line-height:1;padding:.25rem;border-radius:50%;
    transition:background .18s;
  }
  .icon-btn:hover{background:color-mix(in srgb,hsl(var(--primary)) 22%,transparent)}
  .icon-btn:focus-visible{outline:2px solid hsl(var(--primary));outline-offset:2px}
}

/* ---------- 5 | Utilities -------------------------- */
@layer utilities{
  .card{
    background:color-mix(in srgb,hsl(var(--surface)) 92%,transparent);
    padding:1rem;border-radius:var(--radius);
    border:1px solid hsl(var(--surface-border));
  }
  .blocked{text-align:center;background:#ffe8e8;border:1px solid #ff8a8a;}
  .blocked p{margin:.5rem 0;font-weight:600}
  .visually-hidden{
    position:absolute!important;width:1px;height:1px;margin:-1px;border:0;padding:0;
    overflow:hidden;clip-path:inset(50%);white-space:nowrap;
  }
}
</style>




<main class="chat-container">
  <header class="brand">
    <h1 id="room-name-display" class="room-name"></h1>
    <span id="user-display" aria-live="polite"></span>
    <button id="edit-name" class="icon-btn" aria-label="Namen ändern" hidden>✏️</button>
  </header>

  <!-- Name-Formular -->
  <section id="name-form" class="card">
    <label class="visually-hidden" for="name-input">Dein Name</label>
    <input id="name-input" type="text" placeholder="Dein Name …" required autofocus />
    <button id="start-btn" class="primary" type="button">Starten</button>
  </section>

  <!-- Chat-Bereich -->
  <section id="chat-ui" hidden>
    <div id="chat-box" class="chat-box" role="log" aria-live="polite" aria-relevant="additions"></div>
    <form id="chat-form" class="chat-form" autocomplete="off">
      <input id="chat-input" type="text" placeholder="Nachricht eingeben …" required />
      <button id="send-btn" class="primary" type="submit" disabled>Senden</button>
    </form>
  </section>

  <!-- Blockiert-Status -->
  <section id="blocked-ui" hidden class="card blocked" tabindex="-1" role="alert">
    <p>⛔ Du wurdest vom Chat gesperrt.</p>
    <p>Falls das ein Fehler ist, kontaktiere den Admin.</p>
  </section>

  <!-- Zu viele Verbindungen -->
  <section id="too-many-connections-ui" hidden class="card blocked" tabindex="-1" role="alert">
    <p>⛔ Schließe deinen anderen Tab und lade die Seite neu.</p>
  </section>
</main>
`;
