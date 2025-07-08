/* isAdmin.js */

// 1) GLOBALER CLICK-DELEGATE  → Passwort-Prompt + Event feuern
document.addEventListener("click", (e) => {
  if (e.target?.id !== "admin-login-btn") return;

  const pw = prompt("Bitte Admin-Passwort eingeben:");
  if (pw === "geheim") {
    // Event für alle interessierten Teile (Chat-UI, CSS-Toggle, …)
    document.dispatchEvent(new CustomEvent("admin-login"));
  } else {
    alert("Falsches Passwort.");
  }
});

// 2) Reaktion auf das Event  → Flag + Body-Klasse setzen
document.addEventListener("admin-login", () => {
  window.IS_ADMIN = true;               // muss ma gucke ob ma das brauche
  document.body.classList.add("is-admin");
});
