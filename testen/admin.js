const params = new URLSearchParams(window.location.search);

// --- Passwortschutz ---
const CORRECT_PASSWORD = "keule123"; 

document.addEventListener("DOMContentLoaded", () => {
  const authScreen = document.getElementById("auth-screen");
  const adminPanel = document.getElementById("admin-panel");
  const submitBtn = document.getElementById("auth-submit");
  const passwordInput = document.getElementById("auth-password");
  const errorText = document.getElementById("auth-error");

  submitBtn.addEventListener("click", () => {
    const entered = passwordInput.value;
    //Hier Funktion aufrufen mit adminlogin
    /*
  authScreen.style.display = "none";
      adminPanel.style.display = "block";
    } else {
      errorText.style.display = "block";
      passwordInput.value = "";
      passwordInput.focus();

    */
    admin_login(entered).then(success => {
      if (success) {
        authScreen.style.display = "none";
        adminPanel.style.display = "block";
      } else {
        errorText.style.display = "block";
        passwordInput.value = "";
        passwordInput.focus();
      }
    });
  });

  // Optional: Enter-Taste drücken zum Einloggen
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitBtn.click();
  });
});


// --- State
let allRooms = [];
let currentRoomHash = null;
let currentRoomName = null;

// --- DOM Elements
const $blockList = document.getElementById("blocklist");
const $blockInput = document.getElementById("block-ip");
const $addIpBtn = document.getElementById("add-ip");
const $roomsList = document.getElementById("rooms-list");
const $roomInput = document.getElementById("room-name");
const $addRoom = document.getElementById("add-room");
const $roomNameDisplay = document.getElementById("room-name-display");

// --- Copy-Feedback
function copyWithFeedback(text, el) {
    // Fallback für HTTP
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; // damit es nicht springt
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  

  const span = document.createElement("span");
  span.className = "copied";
  span.textContent = "Kopiert!";
  el.after(span);
  setTimeout(() => span.remove(), 1000);
}


// --- Blocklist für aktuellen Raum laden und anzeigen
async function fetchBlocklist(hash) {
  if (!hash) {
    $blockList.innerHTML = "<li>Bitte zuerst einen Raum auswählen</li>";
    return;
  }
  const res = await fetch(`/blocklist.json?room=${hash}`);
  const ips = await res.json();
  renderBlockList(ips, hash);
}

function renderBlockList(ips, hash) {
  $blockList.innerHTML = "";
  ips.forEach(ip => {
    const li = document.createElement("li");

    const ipSpan = document.createElement("span");
    ipSpan.className = "ip-entry";
    ipSpan.textContent = ip;
    li.appendChild(ipSpan);

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "⧉";
    copyBtn.className = "copy";
    copyBtn.title = "IP kopieren";
    copyBtn.onclick = () => copyWithFeedback(ip, copyBtn);
    li.appendChild(copyBtn);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.className = "remove";
    removeBtn.title = "IP entfernen";
    removeBtn.onclick = async () => {
      const updated = ips.filter(entry => entry !== ip);
      await updateBlocklist(hash, updated);
      fetchBlocklist(hash);
    };
    li.appendChild(removeBtn);

    $blockList.appendChild(li);
  });
}

async function updateBlocklist(hash, newList) {
  await fetch("/admin/update-blocklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash, list: newList })
  });
}

async function admin_login(enteredPassword) {
  const res = await fetch("/admin/login", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ password: enteredPassword })
  });
  return res.ok;          // true bei 200, false bei 4xx/5xx
}




// --- Block-IP Button
$addIpBtn.addEventListener("click", async () => {
  if (!currentRoomHash) return;
  const ip = $blockInput.value.trim();
  if (!ip) return;
  const res = await fetch(`/blocklist.json?room=${currentRoomHash}`);
  const list = await res.json();
  if (!list.includes(ip)) {
    list.push(ip);
    await updateBlocklist(currentRoomHash, list);
    fetchBlocklist(currentRoomHash);
  }
  $blockInput.value = "";
});

// --- Räume laden & anzeigen
async function fetchRooms() {
  const res = await fetch("/rooms.json");
  const list = await res.json(); // [{ hash, name, blocklist }]
  allRooms = list;
  renderRooms(list);
}

function renderRooms(list) {
  $roomsList.innerHTML = "";
  list.forEach(({ hash, name }) => {
    const li = document.createElement("li");

    // Copy-Button für Hash
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "⧉";
    copyBtn.className = "copy";
    copyBtn.title = "Hash kopieren";
    copyBtn.onclick = () => copyWithFeedback(hash, copyBtn);
    li.appendChild(copyBtn);

    // Raumdaten
    const roomMain = document.createElement("div");
    roomMain.className = "room-main";

    const title = document.createElement("a");
    title.className = "room-title room-link";
    title.href = `/chat.html/${hash}`;
    title.textContent = `💬 ${name}`;

    title.onclick = e => {
      e.preventDefault();
      currentRoomHash = hash;
      currentRoomName = name;
      $roomNameDisplay.textContent = `${currentRoomName}`;

      // Markierung
      document.querySelectorAll(".room-title.selected").forEach(el => el.classList.remove("selected"));
      title.classList.add("selected");
      fetchBlocklist(hash);
    };
    roomMain.appendChild(title);

    const hashEl = document.createElement("div");
    hashEl.className = "hash";
    hashEl.textContent = hash;
    roomMain.appendChild(hashEl);

    li.appendChild(roomMain);

    // Remove-Button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.className = "remove";
    removeBtn.title = "Raum löschen";
    removeBtn.onclick = async () => {
      await fetch("/admin/remove-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash })
      });
      if (currentRoomHash === hash) {
        currentRoomHash = null;
        $blockList.innerHTML = "";
      }
      fetchRooms();
    };
    li.appendChild(removeBtn);

    $roomsList.appendChild(li);
  });

  // Nach Laden, ersten Raum auswählen
  if (!currentRoomHash && list.length > 0) {
    // Automatisch ersten Raum wählen

    currentRoomHash = list[0].hash;
    currentRoomName = list[0].name;
    $roomNameDisplay.textContent = currentRoomName;
    document.querySelectorAll(".room-title")[0].classList.add("selected");
    fetchBlocklist(currentRoomHash);
  }
}

// --- Raum anlegen
$addRoom.addEventListener("click", async () => {
  const name = $roomInput.value.trim();
  if (!name) return;

  try {
    const res = await fetch("/admin/add-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error("Fehler beim Anlegen");
    $roomInput.value = "";
    await fetchRooms();
  } catch (err) {
    alert("Konnte den Raum nicht anlegen.");
  }
});

fetchRooms();

