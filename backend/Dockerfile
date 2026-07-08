# 构建阶段镜像（可用 Alpine，体积小、拉取快）
ARG NODE_IMAGE=node:22-alpine
# 运行阶段镜像（固定 Debian/glibc，Terraria 专用服务器需要）
ARG RUNNER_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

FROM base AS builder-backend
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend ./backend
RUN pnpm --filter @terrapanel/backend build

FROM base AS builder-frontend
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
ENV VITE_API_BASE=/api
RUN pnpm --filter @terrapanel/frontend build

FROM ${RUNNER_IMAGE} AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates wget libgcc-s1 libstdc++6 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3847
ENV TERRARIA_INSTALL_PATH=/data/terraria
ENV TERRARIA_DATA_PATH=/data/terraria

COPY --from=builder-backend /app/backend/dist ./dist
COPY --from=builder-backend /app/backend/package.json ./package.json
COPY --from=builder-frontend /app/frontend/dist ./public
# pnpm 在 backend/node_modules 中使用相对 symlink，需保留 monorepo 目录结构
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/backend/node_modules ./node_modules

RUN mkdir -p /data/terraria/worlds

EXPOSE 3847 7777-7799

CMD ["node", "dist/main.js"]
