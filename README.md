# TerraPanel

泰拉瑞亚（Terraria）专用服务器 Web 管理面板。Monorepo 结构，包含 NestJS 后端与 React 前端。

## 平台支持

### 支持

| 环境 | 管理面板 | Terraria 专用服务器 | 说明 |
|------|:--------:|:-------------------:|------|
| **Linux**（原生） | ✅ | ✅ | 推荐的生产部署方式 |
| **Linux**（Docker） | ✅ | ✅ | 使用 `docker compose`，镜像基于 Debian（glibc，兼容 Terraria 二进制） |
| **macOS**（Docker） | ✅ | ✅ | 通过 Docker Desktop 运行 Linux 容器，功能与 Linux 部署一致 |

### 部分支持

| 环境 | 管理面板 | Terraria 专用服务器 | 说明 |
|------|:--------:|:-------------------:|------|
| **macOS**（原生） | ✅ | ❌ | 可在 macOS 上开发、调试 Web 面板；**无法**在本机直接托管 Terraria 专用服务器（默认使用 Linux 二进制 `TerrariaServer.bin.x86_64`） |

在 macOS 上若需完整使用（含开服），请使用 **Docker 部署**，而非原生 `pnpm dev` 一键安装。

### 不支持

| 环境 | 说明 |
|------|------|
| **Windows** | **不支持。** 不提供 Windows 专用服务器安装、启动或相关适配，请勿在 Windows 上部署或运行 Terraria 服务器托管功能。 |

> 说明：前端为浏览器应用，可在任意系统访问；上表针对的是 **后端进程管理与 Terraria 服务器托管** 的运行环境。

## 技术栈

- **后端**：NestJS、Socket.IO、Swagger
- **前端**：Vite、React、TypeScript
- **Monorepo**：pnpm workspaces、Turborepo

## 项目结构

```
TerraPanel/
├── backend/     # NestJS API + WebSocket
├── frontend/    # React 管理界面
└── packages/    # 共享包（预留）
```

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 10
- **Linux 或 macOS + Docker**（用于完整开服能力）

### 本地开发

```bash
pnpm install

# 配置环境变量（全项目共用根目录 .env）
cp .env.example .env
# 编辑 .env，至少设置 TERRARIA_DOWNLOAD_URL

# 同时启动前后端（建议在 Linux 上使用）
pnpm dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3000/api
- Swagger：http://localhost:3000/api/docs

### Docker 部署（推荐，macOS / Linux 均可）

```bash
cp .env.example .env
# 编辑 TERRARIA_DOWNLOAD_URL 等变量

docker compose up -d --build
```

游戏本体不会打入镜像，首次需在 Web 面板中执行「一键安装」，文件保存在 Docker volume `terraria-data`（挂载路径 `/data/terraria`）。

首次启动时若世界文件不存在，TerraPanel 会根据配置自动生成 `serverconfig.txt`，并通过 `-config` 参数让 Terraria 按配置创建世界。

#### Docker 构建失败：`context deadline exceeded`

说明无法从 Docker Hub 拉取 `node:22-bookworm-slim`（国内网络常见）。任选一种方式：

**方式 A：配置 Docker Desktop 镜像加速（推荐）**

打开 Docker Desktop → Settings → Docker Engine，在 JSON 中加入：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ]
}
```

Apply & Restart 后重试 `docker compose up -d --build`。

**方式 B：在项目 `.env` 中指定镜像源**

```bash
# 构建阶段（Alpine，体积小）
NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine
# 运行阶段（Debian，Terraria 需要 glibc，不可使用 Alpine）
RUNNER_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim
```

然后重新构建：

```bash
docker compose up -d --build
```

**方式 C：先手动拉取再构建**

```bash
docker pull docker.m.daocloud.io/library/node:22-alpine
docker pull docker.m.daocloud.io/library/node:22-bookworm-slim
docker compose up -d --build
```


## 配置说明

全项目统一使用**根目录 `.env`**（本地开发与 Docker 部署共用）。复制模板：

```bash
cp .env.example .env
```

| 变量 | 说明 |
|------|------|
| `TERRARIA_DOWNLOAD_URL` | 官方 Linux 专用服务器 ZIP 下载地址 |
| `TERRARIA_INSTALL_PATH` | 服务器安装目录 |
| `TERRARIA_EXECUTABLE` | 可执行文件名，默认 `TerrariaServer.bin.x86_64` |
| `TERRARIA_SERVER_PORT` | 默认游戏端口（兼容旧配置/迁移） |
| `TERRARIA_PORT_START` | 多实例端口范围起始，默认 `7777` |
| `TERRARIA_PORT_END` | 多实例端口范围结束，默认 `7799` |
| `TERRARIA_MAX_PLAYERS` | 最大玩家数 |
| `TERRARIA_WORLD_NAME` | 世界名称（自动创建时使用） |
| `TERRARIA_WORLD_SIZE` | 世界尺寸：`1`=小，`2`=中，`3`=大（首次自动创建时生效） |
| `TERRARIA_WORLD_SEED` | 世界种子（留空则随机） |
| `TERRARIA_WORLD_DIFFICULTY` | 世界难度：`0`=普通，`1`=专家，`2`=大师，`3`=旅途 |
| `VITE_API_BASE` | 前端 API 前缀，默认 `/api`（前后端同域时无需修改） |
| `CORS_ORIGIN` | 允许跨域的前端地址 |

官方下载地址格式示例：

```
https://terraria.org/api/download/pc-dedicated-server/terraria-server-1456.zip
```

版本号需与客户端一致，请以 [Terraria 官网](https://terraria.org) 为准。

## 常用命令

```bash
pnpm dev          # 开发模式（前后端）
pnpm build        # 构建
pnpm test         # 运行测试

pnpm --filter @terrapanel/backend dev
pnpm --filter @terrapanel/frontend dev
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/terraria/status` | 聚合服务器状态 |
| POST | `/api/terraria/start` | 启动所有已停止实例 |
| POST | `/api/terraria/stop` | 停止所有运行中实例 |
| POST | `/api/terraria/restart` | 重启所有实例 |
| POST | `/api/terraria/install` | 一键安装 |
| GET | `/api/instances` | 实例列表 |
| POST | `/api/instances` | 创建实例 |
| POST | `/api/instances/:id/start` | 启动单个实例 |
| POST | `/api/instances/:id/stop` | 停止单个实例 |
| GET | `/api/worlds` | 世界列表（含各世界实例状态） |
| POST | `/api/worlds` | 创建世界并启动生成 |
| POST | `/api/worlds/start` | 启动指定世界 |
| POST | `/api/worlds/stop` | 停止指定世界 |
| DELETE | `/api/worlds` | 删除世界及关联实例（需先停止） |
| GET | `/api/config` | 读取配置 |

WebSocket 命名空间：`/terminal`（实时日志、实例状态、安装进度；日志与命令需指定 `instanceId`）
