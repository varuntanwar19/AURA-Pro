# ─────────────────────────────────────────────
# AURA Frontend Dockerfile
# Multi-stage build: Node build → Nginx serve
# ─────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

# Install all dependencies
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# ── Stage 2: Serve ──────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
