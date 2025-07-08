# Multi-stage Dockerfile für Chat-System
# ========================================

### 1. Build-Stage (Vorbereitung für künftige Build-Steps) ###
FROM node:18 as build

WORKDIR /frontend
COPY frontend/ .

# Für später: npm ci && npm run build
# Aktuell: nur kopieren, da noch kein Build-System
RUN mkdir -p dist && cp -r * dist/ 2>/dev/null || true

### 2. Runtime-Stage ###
FROM node:18

WORKDIR /app

# Backend kopieren und Dependencies installieren
COPY backend ./backend
RUN cd backend && npm install --production

# Frontend (später: nur gebaute Assets aus Build-Stage)
COPY --from=build /frontend/dist ./frontend/dist

# Port freigeben
EXPOSE 4441

# Startkommando
CMD ["node", "backend/index.js"]
