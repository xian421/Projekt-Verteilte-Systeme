export const CHAT_TEMPLATE = /*html*/`
<style>
/* -------------------------------------------------- */
/*  Layer-Deklaration                                */
/* -------------------------------------------------- */
@layer reset, tokens, base, components, utilities;

/* -------------------- 1 | Reset ------------------- */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

/* --------------- 2 | Design-Tokens ---------------- */
@layer tokens {
  :host {
    /* Farben & Schatten */
    --primary:        220 90% 56%;
    --surface:        0  0% 100% / 65%;
    --surface-border: 0  0%   0% / .12;

    /* Radius & Elevation */
    --radius: 1rem;
    --shadow: 0 8px 24px rgb(0 0 0 / .15);
  }

  /* Dark-Mode-Varianten */
  @media (prefers-color-scheme: dark) {
    :host {
      --primary:        205 100% 66%;
      --surface:        220 10% 20% / 60%;
      --surface-border: 0   0% 100% / .12;
      --shadow:         0 8px 24px rgb(0 0 0 / .40);
    }
  }
}

/* ------------------ 3 | Base/Layout --------------- */
@layer base {
  :host {
    height: 100%;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* ---------------- 4 | Components ------------------ */
@layer components {

  /* ---------- Layout ---------- */
  .chat-container {
    width: min(98vw, 420px);
    margin: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 2rem 1rem;
    border-radius: var(--radius);
    background: hsl(var(--surface));
    backdrop-filter: blur(12px) saturate(150%);
    border: 1.5px solid hsl(var(--surface-border));
    box-shadow: var(--shadow);
    min-height: 60dvh;
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  }

  @media (max-width: 480px) {
    .chat-container {
      width: 100%;
      min-height: 100dvh;
      border-radius: 0;
      padding-inline: .5rem;
      padding-block: 1rem env(safe-area-inset-bottom);
      box-shadow: none;
    }
  }

  /* ---------- Chat-Log ---------- */
  .chat-box {
    min-height: 32dvh;
    max-height: 48dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: .6rem;
    padding: .7rem .5rem;
    border-radius: calc(var(--radius) * .75);
    background: rgb(255 255 255 / .7);
    scroll-snap-type: y proximity;
    scrollbar-width: thin;
  }
  .chat-box::-webkit-scrollbar       { width: .6rem; }
  .chat-box::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, hsl(var(--primary)) 30%, transparent);
    border-radius: 999px;
  }
  @media (max-width: 480px) {
    .chat-box { scrollbar-width: none; }
    .chat-box::-webkit-scrollbar { display: none; }
  }

  /* ---------- Messages ---------- */
  .chat-message,
  .system-message {
    --bg: #eef4ff;
    align-self: flex-start;
    padding: .5rem .85rem;
    border-radius: calc(var(--radius) * .5);
    animation: fade-in .3s;
    font-size: 1rem;
  }
  .chat-message {
    background: var(--bg);
    border-left: 3px solid hsl(var(--primary));
  }
  .chat-message:nth-child(odd) { --bg: #f4f8ff; }

  .system-message {
    background: none;
    font-size: .92rem;
    font-style: italic;
    align-self: center;
  }

  @keyframes fade-in {
    from { opacity: 0; translate: 0 12px; }
    to   { opacity: 1; translate: 0 0;  }
  }

  /* ---------- Form ---------- */
  .chat-form { display: flex; gap: .5rem; }
  @media (max-width: 380px) { .chat-form { flex-direction: column; } }

  input,
  button {
    font: inherit;
    border-radius: calc(var(--radius) * .5);
    border: 1px solid transparent;
  }

  input {
    flex: 1 1 0;
    min-width: 0;
    padding: .7rem;
    background: rgb(255 255 255 / .95);
    border: 1px solid rgb(0 0 0 / .12);
    transition: border-color .2s, box-shadow .2s;
    width: 100%;
  }
  input:focus-visible {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px color-mix(in srgb, hsl(var(--primary)) 30%, transparent);
  }

  button.primary {
    padding: .7rem 1.1rem;
    background: hsl(var(--primary));
    color: #fff;
    cursor: pointer;
    border: 1px solid #1113;
    transition: background .18s;
    width: 100%;
  }
  button.primary:disabled { opacity: .6; cursor: not-allowed; }
  button.primary:is(:hover, :focus-visible) {
    background: color-mix(in srgb, hsl(var(--primary)) 80%, #fff);
  }

  /* ---------- Icon-Button ---------- */
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    margin-left: .4rem;
    color: hsl(var(--primary));
    line-height: 1;
    padding: .25rem;
    border-radius: 50%;
    transition: background .18s;
  }
  .icon-btn:hover {
    background: color-mix(in srgb, hsl(var(--primary)) 22%, transparent);
  }
  .icon-btn:focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }
}

/* ---------------- 5 | Utilities ------------------- */
@layer utilities {
  .card {
    background: hsl(var(--surface) / .8);
    padding: 1rem;
    border-radius: var(--radius);
    border: 1px solid hsl(var(--surface-border));
  }

  .blocked {
    text-align: center;
    background: #ffe8e8;
    border: 1px solid #ff8a8a;
  }
  .blocked p { margin: .5rem 0; font-weight: 600; }

  .visually-hidden {
    position: absolute !important;
    width: 1px; height: 1px; margin: -1px;
    border: 0; padding: 0; overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>

<main class="chat-container">
  <header class="brand">
    <h1 id="room-name-display" class="room-name"></h1>
    <span id="user-display" aria-live="polite"></span>
    <button id="edit-name" class="icon-btn"
            title="Namen ändern" hidden>✏️</button>
  </header>

  <!-- Name -->
  <section id="name-form" class="card">
    <label class="visually-hidden" for="name-input">Dein Name</label>
    <input  id="name-input" type="text" placeholder="Dein Name …"
            required autofocus />
    <button id="start-btn" class="primary" type="button">Starten</button>
  </section>

  <!-- Chat -->
  <section id="chat-ui" hidden>
    <div id="chat-box" class="chat-box"
         role="log" aria-live="polite"></div>

    <form id="chat-form" class="chat-form" autocomplete="off">
      <input  id="chat-input" type="text"
              placeholder="Nachricht eingeben …" required />
      <button id="send-btn" class="primary"
              type="submit" disabled>Senden</button>
    </form>
  </section>

  <!-- Blockiert -->
  <section id="blocked-ui" hidden
           class="card blocked">
    <p>⛔ Du wurdest vom Chat gesperrt.</p>
    <p>Falls das ein Fehler ist, kontaktiere den Admin.</p>
  </section>

  <!-- Zu viele Verbindungen -->
  <section id="too-many-connections-ui" hidden
           class="card blocked">
    <p>⛔ Schließe deinen anderen Tab und lade die Seite neu.</p>
  </section>
</main>
`;
