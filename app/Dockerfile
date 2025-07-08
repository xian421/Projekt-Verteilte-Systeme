# Dockerfile
# Multi-Stage für statische Assets + Node-Backend

# 1) Frontend-Copy-Stage
FROM node:18 AS build
WORKDIR /frontend
COPY frontend/ .
RUN mkdir -p dist && cp -r * dist/ 2>/dev/null || true

# 2) Runtime-Stage
FROM node:18
WORKDIR /app

# Backend + Dependencies
COPY backend ./backend
RUN cd backend && npm install

# Frontend-Assets aus build/dist
COPY --from=build /frontend/dist ./frontend/dist

EXPOSE 4441
CMD ["node", "backend/index.js"]
