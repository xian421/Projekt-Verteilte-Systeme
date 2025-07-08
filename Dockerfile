# Dockerfile – Chat-Server + statische Assets
FROM node:18

# 1) Basisordner
WORKDIR /app

# 2) Backend-Abhängigkeiten installieren
COPY testen/backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# 3) Komplette Projektstruktur in den Container kopieren
WORKDIR /app
COPY testen/frontend ./frontend
#COPY testen/img      ./img
COPY testen/backend  ./backend
#COPY testen/*.html   ./

# 4) Start-Befehl
WORKDIR /app/backend
CMD ["npm", "start"]
