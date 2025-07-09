# ─── Stage 1: Dependencies installieren ───
FROM node:18 AS deps
WORKDIR /app

# 1) Backend-Dependencies (inkl. devDependencies für Jest & Supertest)
COPY backend/package*.json ./backend/
# 2) Frontend-Dependencies (inkl. devDependencies für Jest & Testing Library)
COPY frontend/package*.json ./frontend/

WORKDIR /app/backend
RUN npm install

WORKDIR /app/frontend
RUN npm install

# ─── Stage 2: Tests ausführen ───
FROM deps AS test-runner

# Damit config.js in den Test-Modus geht:
ENV NODE_ENV=test \
    ADMIN_PASSWORD=keule \
    PORT=4441

WORKDIR /app

# Quellcode kopieren (ohne node_modules, die schon aus deps da sind)
COPY jest.frontend.config.js ./
COPY backend ./backend
COPY frontend ./frontend

# 1) Backend-Tests
WORKDIR /app/backend
RUN node index.js & \
    sleep 5 && \
    npm test

# 2) Frontend-Tests
WORKDIR /app/frontend
RUN npm test

# ─── Stage 3: Frontend-Build (statische Assets) ───
FROM node:18 AS build-frontend
WORKDIR /frontend
COPY frontend/ .
RUN mkdir -p dist && cp -r * dist/ 2>/dev/null || true

# ─── Stage 4: Produktions-Image ───
FROM node:18 AS production
WORKDIR /app

# Backend: nur production-Dependencies installieren
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Backend-Code kopieren
COPY backend/ ./

# Frontend-Assets aus der Build-Stage übernehmen
COPY --from=build-frontend /frontend/dist /app/frontend/dist

EXPOSE 4441

# Startet /app/backend/index.js
CMD ["node", "index.js"]
