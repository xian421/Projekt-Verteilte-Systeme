# Chat System - Produktive Version

## 📁 Projektstruktur

```
/app
├─ backend/         ← Server-Code
│  ├─ index.js      ← Haupteingang
│  ├─ package.json
│  └─ lib/          ← Module (WebSocket, Static, API)
└─ frontend/        ← Client-Code  
   ├─ components/   ← Chat & Admin Web Components
   ├─ pages/        ← Einzelseiten (/chat.html, /admin.html)
   └─ index.html    ← Dashboard (für /dashboard oder /)
```

## 🚀 Verwendung

### Development
```bash
cd app/backend
npm install
npm start
```

### Production (Docker)
```bash
# Komplettes System bauen und starten
docker-compose up --build

# Im Hintergrund
docker-compose up -d --build

# Logs anzeigen
docker-compose logs -f
```

## 🌐 Routen

- `/` oder `/dashboard` → Dashboard mit Navigation
- `/chat.html` → Chat-Interface
- `/admin.html` → Admin-Panel
- `/api/rooms` → JSON-API für Räume

## ✨ Features

### CSS-Härtung
- Container-Queries statt Media-Queries
- Flexible Layout-Komponenten
- Responsive Design in jeder Containerbreite

### Token-basierter Chat-Zugang
- Ohne Room-Hash: Token-Eingabe erforderlich
- Mit Hash: Direkter Chat-Zugang
- Robust gegen URL-Manipulation

### Multi-Stage Docker Build
- Vorbereitet für Build-Tools (Vite, etc.)
- Optimierte Production-Images
- Getrennte Dependencies

## 🔧 Erweiterungen

Für Build-System (Vite/Webpack) in frontend/:
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Dann Dockerfile Build-Stage aktivieren:
```dockerfile
RUN npm ci && npm run build    # statt cp -r . dist/
```
