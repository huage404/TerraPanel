ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter @terrapanel/backend...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend ./backend
RUN pnpm --filter @terrapanel/backend build

FROM ${NODE_IMAGE} AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates wget libgcc-s1 libstdc++6 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000
ENV TERRARIA_INSTALL_PATH=/data/terraria
ENV TERRARIA_DATA_PATH=/data/terraria

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
# pnpm 在 backend/node_modules 中使用相对 symlink，需保留 monorepo 目录结构
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/backend/node_modules ./node_modules

RUN mkdir -p /data/terraria/worlds

EXPOSE 3000 7777

CMD ["node", "dist/main.js"]
