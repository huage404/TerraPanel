import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { terrariaApi } from '../api/terraria'
import type {
  InstallProgressDto,
  LogEntry,
  ServerStatusDto,
} from '../types/terraria'

const DEFAULT_INSTALL: InstallProgressDto = {
  phase: 'idle',
  progress: 0,
  message: '等待安装',
}

const DEFAULT_STATUS: ServerStatusDto = {
  status: 'stopped',
  installed: false,
  port: 7777,
  playerCount: 0,
  maxPlayers: 8,
  startedAt: null,
  uptimeSeconds: 0,
  pid: null,
}

export function useTerrariaPanel() {
  const [status, setStatus] = useState<ServerStatusDto>(DEFAULT_STATUS)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [installProgress, setInstallProgress] =
    useState<InstallProgressDto>(DEFAULT_INSTALL)
  const [connected, setConnected] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('/terminal', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('status', (payload: ServerStatusDto) => {
      setStatus(payload)
    })

    socket.on('log', (entry: LogEntry) => {
      setLogs((prev) => [...prev, entry].slice(-2000))
    })

    socket.on('logs:history', (payload: { logs: LogEntry[] }) => {
      setLogs(payload.logs ?? [])
    })

    socket.on('install:progress', (payload: InstallProgressDto) => {
      setInstallProgress(payload)
    })

    socket.on('error', (payload: { message?: string }) => {
      setError(payload.message ?? 'WebSocket 错误')
    })

    terrariaApi.getStatus().then(setStatus).catch(() => undefined)
    terrariaApi.getInstallStatus().then(setInstallProgress).catch(() => undefined)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (
      installProgress.phase === 'idle' ||
      installProgress.phase === 'completed' ||
      installProgress.phase === 'failed'
    ) {
      return
    }

    const timer = window.setInterval(() => {
      terrariaApi.getInstallStatus().then(setInstallProgress).catch(() => undefined)
    }, 2000)

    return () => window.clearInterval(timer)
  }, [installProgress.phase])

  const runAction = useCallback(
    async (key: string, action: () => Promise<ServerStatusDto | InstallProgressDto>) => {
      setActionLoading(key)
      setError(null)
      try {
        const result = await action()
        if ('status' in result) setStatus(result)
        if ('phase' in result) setInstallProgress(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败')
      } finally {
        setActionLoading(null)
      }
    },
    [],
  )

  const start = useCallback(
    () => runAction('start', terrariaApi.start),
    [runAction],
  )

  const stop = useCallback(
    () => runAction('stop', terrariaApi.stop),
    [runAction],
  )

  const restart = useCallback(
    () => runAction('restart', terrariaApi.restart),
    [runAction],
  )

  const install = useCallback(
    () => runAction('install', terrariaApi.install),
    [runAction],
  )

  const sendCommand = useCallback((command: string) => {
    const trimmed = command.trim()
    if (!trimmed) return

    setError(null)
    socketRef.current?.emit('command', { command: trimmed })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    status,
    logs,
    installProgress,
    connected,
    actionLoading,
    error,
    start,
    stop,
    restart,
    install,
    sendCommand,
    clearError,
  }
}
