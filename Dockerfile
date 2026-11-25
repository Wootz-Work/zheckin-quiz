FROM node:20-alpine AS builder

# Install native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install & build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Move built frontend into backend/public
RUN mkdir -p backend/public && cp -r frontend/dist/. backend/public/

# ── Runtime image ──────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app/backend

COPY --from=builder /app/backend ./
# Rebuild native modules for the runtime image
RUN npm rebuild better-sqlite3

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
