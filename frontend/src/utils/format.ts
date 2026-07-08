import type { ServerStatus } from '../types/terraria'

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false })
}

const STATUS_LABELS: Record<ServerStatus, string> = {
  stopped: '已停止',
  starting: '启动中',
  running: '运行中',
  stopping: '停止中',
  error: '异常',
}

export function getStatusLabel(status: ServerStatus): string {
  return STATUS_LABELS[status]
}

export function isBusyStatus(status: ServerStatus): boolean {
  return status === 'starting' || status === 'stopping'
}

export function canStart(status: ServerStatus): boolean {
  return status === 'stopped' || status === 'error'
}

export function canStop(status: ServerStatus): boolean {
  return status === 'running' || status === 'starting'
}

export function canRestart(status: ServerStatus): boolean {
  return status === 'running' || status === 'stopped' || status === 'error'
}

export function canDelete(status: ServerStatus): boolean {
  return status === 'stopped' || status === 'error'
}
