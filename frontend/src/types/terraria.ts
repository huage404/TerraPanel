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
}

export interface InstallProgressDto {
  phase: InstallPhase
  progress: number
  message: string
  error?: string
}

export interface LogsHistoryPayload {
  logs: LogEntry[]
}

export interface ApiErrorBody {
  message?: string | string[]
  statusCode?: number
}
