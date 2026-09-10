# Migrations
FROM amacneil/dbmate:2 AS dbmate

# Base image
FROM node:24-alpine AS base

COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate

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
RUN --mount=from=deps,source=/app/backend,target=/deps-backend \
    if [ -d /deps-backend/node_modules ]; then \
      mkdir -p backend && \
      cp -a /deps-backend/node_modules backend/node_modules; \
    fi
COPY backend ./backend
COPY shared ./shared

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app/backend

USER nodejs

EXPOSE $PORT
CMD ["node", "--experimental-strip-types", "src/main.ts"]
