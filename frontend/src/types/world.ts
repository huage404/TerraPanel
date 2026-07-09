import type { InstanceStatusDto, ServerStatusDto } from './terraria'

export interface WorldSummary {
  fileName: string
  worldName: string
  path: string
  sizeBytes: number
  modifiedAt: string
  instanceId: string | null
  status: InstanceStatusDto['status']
  port: number | null
  playerCount: number
  maxPlayers: number
  pid: number | null
  uptimeSeconds: number
}

export interface WorldsResponse {
  worlds: WorldSummary[]
}

export interface CreateWorldPayload {
  worldName: string
  worldSize: number
  worldSeed?: string
  worldDifficulty: number
}

export interface WorldExportMeta {
  version: 1
  exportedAt: string
  worldName: string
  port?: number
  maxPlayers?: number
  password?: string
  motd?: string
  worldSize?: number
  worldSeed?: string
  worldDifficulty?: number
}

export interface ImportWorldPayload {
  worldName: string
  file: File
  port?: number
  maxPlayers?: number
  password?: string
  motd?: string
}

export interface CreateWorldResponse extends WorldsResponse {
  status: ServerStatusDto
  instance?: InstanceStatusDto
}

export const WORLD_SIZE_OPTIONS = [
  { value: 1, label: '小 (4200×1200)' },
  { value: 2, label: '中 (6400×1800)' },
  { value: 3, label: '大 (8400×2400)' },
] as const

export const WORLD_DIFFICULTY_OPTIONS = [
  { value: 0, label: '普通' },
  { value: 1, label: '专家' },
  { value: 2, label: '大师' },
  { value: 3, label: '旅途' },
] as const

export const DEFAULT_CREATE_WORLD_FORM: CreateWorldPayload = {
  worldName: 'world',
  worldSize: 2,
  worldSeed: '',
  worldDifficulty: 0,
}

export const WORLD_EXPORT_META_FILENAME = 'terrapanel-meta.json'
