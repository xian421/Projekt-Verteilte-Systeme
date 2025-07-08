/* chat-admin.js – <chat-admin>
   ------------------------------------------------------------
   • Shadow-DOM-Komponente
   • Optimistic UI für Räume & Blocklist
   • Backend-Calls OHNE Auth-Header (Endpunkte sind offen)
   ------------------------------------------------------------ */

const ADMIN_TEMPLATE = /*html*/`
  <style>
    :host{
      --bg:#f8fafc;--card:#fff;--text:#0f172a;--accent:#2563eb;--accent-bg:#eef2ff;
      --danger:#dc2626;--danger-bg:#fee2e2;--muted:#64748b;--border:#e2e8f0;
      --radius:1.2rem;--shadow:0 2px 12px rgb(16 30 54/.08);display:block;
      font-family:system-ui,sans-serif;color:var(--text);background:var(--bg);
      min-height:100vh;padding:2rem .7rem 3.5rem}
    @media(prefers-color-scheme:dark){
      :host{--bg:#101324;--card:#18192e;--text:#f1f5f9;--accent-bg:#29346a;
            --danger-bg:#6d2323;--muted:#94a3b8;--border:#232347;
            --shadow:0 2px 16px rgb(36 54 98/.17)}}
    h1{font-size:2.2rem;font-weight:800;letter-spacing:-1px;text-align:center;
       color:var(--accent);margin:0 0 1.8rem}
    main{display:grid;gap:2rem;grid-template-columns:1fr 1fr;max-width:950px;margin:auto}
    @media(max-width:900px){main{grid-template-columns:1fr}}
    section{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);
            padding:2rem 1.5rem 1.6rem;border:1px solid var(--border);min-width:0}
    h2{font-size:1.28rem;margin:0 0 1.2rem;font-weight:700;color:var(--accent)}
    ul{list-style:none;display:flex;flex-direction:column;gap:1rem;margin:0;padding:0}
    li{background:var(--accent-bg);border-radius:.9rem;padding:1.1rem 1rem .95rem;
       border:1.5px solid var(--border);display:flex;gap:1rem;transition:border .12s,box-shadow .12s}
    li:hover{border-color:var(--accent);box-shadow:0 2px 8px 0 rgb(38 99 235/.1)}
    .room-main{flex:1;display:flex;flex-direction:column;gap:.25em;min-width:0}
    .room-title{font-weight:600;font-size:1.07rem;white-space:nowrap;overflow:hidden;
                text-overflow:ellipsis;color:var(--text);text-decoration:none}
    .room-title.selected{text-decoration:underline}
    .room-link{background:var(--accent-bg);color:var(--accent);border-radius:.45em;
               font-size:.98em;font-weight:500;padding:.13em .55em;margin-bottom:.05em;
               text-decoration:none;display:inline-block}
    .room-link:hover{background:var(--accent);color:#fff}
    .hash{font-family:ui-monospace,monospace;color:var(--muted);font-size:.94em;word-break:break-all}
    button{border:none;border-radius:.6em;padding:.37em .9em;font-size:1.05rem;font-weight:600;
           background:var(--accent);color:#fff;cursor:pointer;transition:background .13s;
           box-shadow:0 2px 8px rgb(37 99 235/.08)}
    button.copy{background:transparent;color:var(--accent);font-size:1.18em;padding:.2em .42em;box-shadow:none}
    button.copy:hover{background:var(--accent);color:#fff}
    button.remove{background:var(--danger);font-size:1.12em;padding:.23em .73em;margin-left:.5em}
    button.remove:hover{background:var(--danger-bg);color:var(--danger)}
    .inputRow{display:flex;gap:.7em;margin-top:1.3rem}
    .inputRow input{flex:1;padding:.6em 1em;font-size:1rem;border-radius:.5em;border:1.5px solid var(--border);
                    background:var(--card);color:var(--text);transition:border .13s}
    .inputRow input:focus{border-color:var(--accent);outline:none}
    .copied{color:var(--accent);background:#e0e7ff;border-radius:.5em;padding:.12em .5em;margin-left:.2em;
            font-size:.96em;animation:fadeout 1.2s linear}
    @keyframes fadeout{0%,90%{opacity:1}100%{opacity:0}}
    @media(max-width:600px){section{padding:1.2rem .7rem}.inputRow{flex-direction:column}}
  </style>

  <h1>🛠️ Admin Panel</h1>
  <main>
    <section>
      <h2>Blockierte&nbsp;IPs <span id="room-name-display"></span></h2>
      <ul id="blocklist"><li>Keine IPs blockiert</li></ul>
      <div class="inputRow">
        <input id="block-ip" type="text" placeholder="Neue IP sperren">
        <button id="add-ip">Hinzufügen</button>
      </div>
    </section>
    <section>
      <h2>Räume</h2>
      <ul id="rooms-list"><li>Lade…</li></ul>
      <div class="inputRow">
        <input id="room-name" type="text" placeholder="Raumname …">
        <button id="add-room">Anlegen</button>
      </div>
    </section>
  </main>
`;

class ChatAdmin extends HTMLElement {
  state = new Proxy({ rooms: [], blocklist: [] },
    { set: (o, p, v) => (o[p] = v, this.#render(p), true) });

  #currentHash = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = ADMIN_TEMPLATE;

    this.$rooms  = this.shadowRoot.getElementById('rooms-list');
    this.$blocks = this.shadowRoot.getElementById('blocklist');
    this.$roomInp= this.shadowRoot.getElementById('room-name');
    this.$addRoom= this.shadowRoot.getElementById('add-room');
    this.$ipInp  = this.shadowRoot.getElementById('block-ip');
    this.$addIp  = this.shadowRoot.getElementById('add-ip');
    this.$roomNameDisplay = this.shadowRoot.getElementById('room-name-display');

    this.$addRoom.addEventListener('click', () => this.#createRoom());
    this.$addIp  .addEventListener('click', () => this.#addIp());

    this.#fetchRooms();
  }

  async #fetchJSON(path, body){
    if(!body) path += (path.includes('?') ? '&':'?') + '_=' + Date.now();
    const opt = body
      ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}
      : {};
    const res = await fetch(path,opt);
    return res.ok ? res.json() : null;
  }

  async #fetchRooms(){
    const list = await this.#fetchJSON('/rooms.json');
    if(list) this.state.rooms = list;
  }

  async #createRoom(){
    const name = this.$roomInp.value.trim(); if(!name) return;
    const tmp = 'tmp-'+Math.random().toString(36).slice(2,10);
    this.state.rooms = [...this.state.rooms,{hash:tmp,name}];
    this.$roomInp.value = '';
    const ok = await this.#fetchJSON('/admin/add-room',{name});
    if(!ok){
      this.state.rooms = this.state.rooms.filter(r=>r.hash!==tmp);
      alert('❌ Raum konnte nicht angelegt werden.');
    }else this.#fetchRooms();
  }

  async #removeRoom(hash){
    const prev=[...this.state.rooms];
    this.state.rooms=prev.filter(r=>r.hash!==hash);
    const ok = await this.#fetchJSON('/admin/remove-room',{hash});
    if(!ok){
      this.state.rooms=prev;alert('❌ Raum konnte nicht gelöscht werden.');
    }else if(this.#currentHash===hash){
      this.#currentHash='';this.state.blocklist=[];
    }
  }

  #renderRooms(){
    const list=this.state.rooms;
    this.$rooms.replaceChildren();
    list.forEach(({hash,name})=>{
      const li=document.createElement('li');
      li.append(
        this.#btnCopy(hash),
        (()=>{const d=document.createElement('div');d.className='room-main';
          const a=document.createElement('a');a.className='room-title room-link';
          a.href=`/chat.html/${hash}`;a.textContent=`💬 ${name}`;
          a.onclick=e=>{e.preventDefault();this.#selectRoom(hash,name);
            this.shadowRoot.querySelectorAll('.room-title')
                    .forEach(el=>el.classList.toggle('selected',el===a));};
          if(hash===this.#currentHash)a.classList.add('selected');d.append(a);
          const h=document.createElement('div');h.className='hash';h.textContent=hash;d.append(h);
          return d;})(),
        this.#btn('✖','remove',()=>this.#removeRoom(hash))
      );
      this.$rooms.append(li);
    });
    if(!this.#currentHash && list[0]){
      this.#selectRoom(list[0].hash,list[0].name);
      this.shadowRoot.querySelector('.room-title')?.classList.add('selected');
    }
  }

  async #selectRoom(hash,name){
    this.#currentHash=hash;this.$roomNameDisplay.textContent=name;
    const ips=await this.#fetchJSON(`/blocklist.json?room=${hash}`);
    if(ips) this.state.blocklist=ips;
  }

  async #updateBlocklist(list){
    const prev=[...this.state.blocklist];this.state.blocklist=list;
    const ok=await this.#fetchJSON('/admin/update-blocklist',{hash:this.#currentHash,list});
    if(!ok){this.state.blocklist=prev;alert('❌ Konnte die Blockliste nicht speichern.');}
  }
  async #addIp(){const ip=this.$ipInp.value.trim();
    if(!ip||!this.#currentHash||this.state.blocklist.includes(ip))return;
    await this.#updateBlocklist([...this.state.blocklist,ip]);this.$ipInp.value='';}
  async #removeIp(ip){await this.#updateBlocklist(this.state.blocklist.filter(x=>x!==ip));}

  #renderBlocklist(){
    const ips=this.state.blocklist;this.$blocks.replaceChildren();
    if(!ips.length){this.$blocks.innerHTML='<li>Keine IPs blockiert</li>';return;}
    ips.forEach(ip=>{
      const li=document.createElement('li');
      li.append(this.#span('ip-entry',ip),this.#btnCopy(ip),this.#btn('✖','remove',()=>this.#removeIp(ip)));
      this.$blocks.append(li);});}

  #btnCopy(t){return this.#btn('⧉','copy',()=>navigator.clipboard.writeText(t)
              .catch(()=>this.#fallbackCopy(t)));}
  #fallbackCopy(t){const ta=document.createElement('textarea');ta.value=t;
    ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);
    ta.select();document.execCommand('copy');ta.remove();}
  #btn(l,c,cb){const b=document.createElement('button');b.textContent=l;b.className=c;b.onclick=cb;return b;}
  #span(c,t){const s=document.createElement('span');s.className=c;s.textContent=t;return s;}
  #render(p){if(p==='rooms')this.#renderRooms();if(p==='blocklist')this.#renderBlocklist();}
}
customElements.define('chat-admin', ChatAdmin);
