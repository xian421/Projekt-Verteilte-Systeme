**Benutzer-Dokumentation für das Realtime-Chat-Projekt**

Diese Anleitung richtet sich an Admins und Studierende, die das Chat-System nutzen.

---

## 1. Admin-Oberfläche (/admin)

1. Öffnen Sie im Browser die URL: `http://<SERVER>:<PORT>/admin`.
2. Geben Sie Ihr Admin-Passwort ein und klicken Sie auf **Einloggen**.
3. Nach erfolgreicher Authentifizierung sehen Sie das Admin-Panel:

   * Links: **Blockierte IPs** des aktuell gewählten Raums.
   * Rechts: **Liste aller Räume** mit Namen.

### Räume anlegen

* Im Feld „Raumname …“ einen Namen eingeben und auf **Anlegen** klicken.
* Der neue Raum erscheint sofort in der Liste.
* Kopieren Sie den Raum-Link (z.B. `/chat/<Raum-Hash>`) und geben Sie ihn an Ihre Studierenden weiter.

### Blockliste verwalten

1. Wählen Sie oben in der Raum-Liste den gewünschten Raum aus.
2. Unter **Blockierte IPs** werden alle aktuell gebannten IP-Adressen angezeigt.
3. Neue IP blockieren:

   * Adresse im Feld eingeben, auf **Hinzufügen** klicken.
4. IP freigeben:

   * In der Liste bei der jeweiligen IP auf das ❌-Symbol klicken.
5. Bei Fehlern (z.B. Raum konnte nicht angelegt werden) erscheint eine kurze Fehlermeldung.

---

## 2. Chat-Nutzung (Studierende)

1. Öffnen Sie im Browser den Raum-Link: `http://<SERVER>:<PORT>/chat/<Raum-Hash>`.
2. Geben Sie im Namensfeld Ihren Wunsch-Namen ein und klicken Sie auf **Starten**.
3. Schreiben Sie Ihre Nachrichten im unteren Eingabefeld und senden Sie sie ab.

### Funktionen

* **Live-Chat:** Nachrichten werden in Echtzeit angezeigt.
* **Systemnachrichten:** Automatische Einträge bei Beitritt, Verlassen und Reconnects.
* **IP-Information:** Ihre IP wird beim Join und in Nachrichten im Chat angezeigt (für Admins zur Identifikation).

---

## 3. Bannen & Auto-Ban

* **Manuelles Bannen:** Im Admin-Panel über die Blockliste.
* **Auto-Ban bei Spam:** Bei Überschreitung des Nachrichten-Limits wird die IP automatisch gebannt.
* **Benachrichtigung:** Admins erhalten im Chat eine Systemnachricht, wenn eine IP manuell oder automatisch gebannt wurde.

---

## 4. Mobile Nutzung

* Das Interface ist **responsive** und passt sich Smartphones/Tablets an.

---

*Stand: 09.07.2025*
