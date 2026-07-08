export type ServerStatus =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'

export type InstallPhase =
  | 'idle'
  | 'downloading'
  | 'extracting'
  | 'chmod'
  | 'completed'
  | 'failed'

export type LogStream = 'stdout' | 'stderr' | 'system'

export interface LogEntry {
  id: number
  instanceId: string
  timestamp: string
  stream: LogStream
  message: string
}

export interface ServerStatusDto {
  status: ServerStatus
  installed: boolean
  port: number
  playerCount: number
  maxPlayers: number
  startedAt: string | null
  uptimeSeconds: number
  pid: number | null
  runningCount: number
  totalInstances: number
  totalPlayerCount: number
}

export interface InstanceStatusDto {
  id: string
  worldPath: string
  worldName: string
  status: ServerStatus
  installed: boolean
  port: number
  playerCount: number
  maxPlayers: number
  startedAt: string | null
  uptimeSeconds: number
  pid: number | null
}

export interface InstallProgressDto {
  phase: InstallPhase
  progress: number
  message: string
  error?: string
}

export interface LogsHistoryPayload {
  instanceId: string
  logs: LogEntry[]
}

export interface InstancesPayload {
  instances: InstanceStatusDto[]
}

export interface ApiErrorBody {
  message?: string | string[]
  statusCode?: number
}
