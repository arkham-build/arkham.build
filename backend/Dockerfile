# Migrations
FROM amacneil/dbmate:2 AS dbmate

# Base image
FROM node:24-alpine AS base

RUN apk add --update busybox-suid && rm -rf /var/cache/apk/*
COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY backend/config/crontab /app/config/crontab

# Dependencies stage
FROM base AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend
COPY shared ./shared

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE $PORT
CMD ["npm", "run", "start", "-w", "backend"]
