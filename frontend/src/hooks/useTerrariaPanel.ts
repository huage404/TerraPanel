import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { terrariaApi } from '../api/terraria'
import { worldsApi } from '../api/worlds'
import type {
  InstallProgressDto,
  InstanceStatusDto,
  LogEntry,
  ServerStatusDto,
} from '../types/terraria'
import type { CreateWorldPayload, WorldSummary } from '../types/world'

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
  runningCount: 0,
  totalInstances: 0,
  totalPlayerCount: 0,
}

export function useTerrariaPanel() {
  const [status, setStatus] = useState<ServerStatusDto>(DEFAULT_STATUS)
  const [instances, setInstances] = useState<InstanceStatusDto[]>([])
  const [logsByInstance, setLogsByInstance] = useState<Record<string, LogEntry[]>>({})
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [installProgress, setInstallProgress] =
    useState<InstallProgressDto>(DEFAULT_INSTALL)
  const [worlds, setWorlds] = useState<WorldSummary[]>([])
  const [worldsLoading, setWorldsLoading] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [installPolling, setInstallPolling] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const refreshWorlds = useCallback(async () => {
    if (!status.installed) {
      setWorlds([])
      return
    }

    setWorldsLoading(true)
    try {
      const result = await worldsApi.list()
      setWorlds(result.worlds)
    } catch {
      // ignore transient errors during polling
    } finally {
      setWorldsLoading(false)
    }
  }, [status.installed])

  const subscribeInstance = useCallback((instanceId: string) => {
    socketRef.current?.emit('subscribe', { instanceId })
  }, [])

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

    socket.on('instances', (payload: { instances: InstanceStatusDto[] }) => {
      setInstances(payload.instances ?? [])
    })

    socket.on('instance:status', (payload: InstanceStatusDto) => {
      setInstances((prev) => {
        const index = prev.findIndex((item) => item.id === payload.id)
        if (index === -1) return [...prev, payload]
        const next = [...prev]
        next[index] = payload
        return next
      })
    })

    socket.on('log', (entry: LogEntry) => {
      setLogsByInstance((prev) => {
        const current = prev[entry.instanceId] ?? []
        return {
          ...prev,
          [entry.instanceId]: [...current, entry].slice(-2000),
        }
      })
    })

    socket.on('logs:history', (payload: { instanceId: string; logs: LogEntry[] }) => {
      if (!payload.instanceId) return
      setLogsByInstance((prev) => ({
        ...prev,
        [payload.instanceId]: payload.logs ?? [],
      }))
    })

    socket.on('install:progress', (payload: InstallProgressDto) => {
      setInstallProgress(payload)
    })

    socket.on('error', (payload: { message?: string }) => {
      setError(payload.message ?? 'WebSocket 错误')
    })

    terrariaApi.getStatus().then(setStatus).catch(() => undefined)
    terrariaApi.getInstances().then((r) => setInstances(r.instances)).catch(() => undefined)
    terrariaApi.getInstallStatus().then(setInstallProgress).catch(() => undefined)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    void refreshWorlds()
  }, [refreshWorlds, installProgress.phase])

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      const running = instances.find((item) => item.status === 'running')
      setSelectedInstanceId(running?.id ?? instances[0]?.id ?? null)
    }
  }, [instances, selectedInstanceId])

  useEffect(() => {
    if (selectedInstanceId && connected) {
      subscribeInstance(selectedInstanceId)
    }
  }, [connected, selectedInstanceId, subscribeInstance])

  useEffect(() => {
    const pollInstallStatus = () => {
      terrariaApi.getInstallStatus().then(setInstallProgress).catch(() => undefined)
    }

    if (installPolling) {
      pollInstallStatus()
    }

    const shouldPoll =
      installPolling ||
      (installProgress.phase !== 'idle' &&
        installProgress.phase !== 'completed' &&
        installProgress.phase !== 'failed')

    if (!shouldPoll) {
      return
    }

    const timer = window.setInterval(pollInstallStatus, 2000)
    return () => window.clearInterval(timer)
  }, [installProgress.phase, installPolling])

  useEffect(() => {
    if (
      installProgress.phase === 'completed' ||
      installProgress.phase === 'failed'
    ) {
      setInstallPolling(false)
      if (installProgress.phase === 'completed') {
        terrariaApi.getStatus().then(setStatus).catch(() => undefined)
        terrariaApi.getInstances().then((r) => setInstances(r.instances)).catch(() => undefined)
      }
    }
  }, [installProgress.phase])

  useEffect(() => {
    const shouldPollWorlds =
      status.installed &&
      (worlds.some((world) => world.status === 'starting' || world.status === 'running') ||
        actionLoading === 'createWorld')

    if (!shouldPollWorlds) {
      return
    }

    const timer = window.setInterval(() => {
      void refreshWorlds()
      terrariaApi.getInstances().then((r) => setInstances(r.instances)).catch(() => undefined)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [actionLoading, refreshWorlds, status.installed, worlds])

  const runAction = useCallback(
    async (key: string, action: () => Promise<unknown>) => {
      setActionLoading(key)
      setError(null)
      try {
        await action()
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败')
      } finally {
        setActionLoading(null)
      }
    },
    [],
  )

  const startAll = useCallback(
    () =>
      runAction('startAll', async () => {
        setStatus(await terrariaApi.startAll())
        await refreshWorlds()
        const result = await terrariaApi.getInstances()
        setInstances(result.instances)
      }),
    [refreshWorlds, runAction],
  )

  const stopAll = useCallback(
    () =>
      runAction('stopAll', async () => {
        setStatus(await terrariaApi.stopAll())
        await refreshWorlds()
        const result = await terrariaApi.getInstances()
        setInstances(result.instances)
      }),
    [refreshWorlds, runAction],
  )

  const restartAll = useCallback(
    () =>
      runAction('restartAll', async () => {
        setStatus(await terrariaApi.restartAll())
        await refreshWorlds()
        const result = await terrariaApi.getInstances()
        setInstances(result.instances)
      }),
    [refreshWorlds, runAction],
  )

  const install = useCallback(
    () =>
      runAction('install', async () => {
        const result = await terrariaApi.install()
        setInstallProgress(result)
        if (result.phase !== 'completed' && result.phase !== 'failed') {
          setInstallPolling(true)
        }
      }),
    [runAction],
  )

  const createWorld = useCallback(async (payload: CreateWorldPayload) => {
    setActionLoading('createWorld')
    setError(null)
    try {
      const result = await worldsApi.create(payload)
      setWorlds(result.worlds)
      setStatus(result.status)
      if (result.instance) {
        setSelectedInstanceId(result.instance.id)
        setInstances((prev) => {
          const index = prev.findIndex((item) => item.id === result.instance!.id)
          if (index === -1) return [...prev, result.instance!]
          const next = [...prev]
          next[index] = result.instance!
          return next
        })
      }
      setCreateModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建世界失败')
    } finally {
      setActionLoading(null)
    }
  }, [])

  const startWorld = useCallback(
    async (path: string) => {
      setActionLoading(`start:${path}`)
      setError(null)
      try {
        const result = await worldsApi.start(path)
        setWorlds(result.worlds)
        const refreshed = await terrariaApi.getInstances()
        setInstances(refreshed.instances)
        setStatus(await terrariaApi.getStatus())
        const world = result.worlds.find((item) => item.path === path)
        if (world?.instanceId) {
          setSelectedInstanceId(world.instanceId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '启动失败')
      } finally {
        setActionLoading(null)
      }
    },
    [],
  )

  const stopWorld = useCallback(async (path: string) => {
    setActionLoading(`stop:${path}`)
    setError(null)
    try {
      const result = await worldsApi.stop(path)
      setWorlds(result.worlds)
      const refreshed = await terrariaApi.getInstances()
      setInstances(refreshed.instances)
      setStatus(await terrariaApi.getStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止失败')
    } finally {
      setActionLoading(null)
    }
  }, [])

  const restartWorld = useCallback(async (path: string) => {
    setActionLoading(`restart:${path}`)
    setError(null)
    try {
      const result = await worldsApi.restart(path)
      setWorlds(result.worlds)
      const refreshed = await terrariaApi.getInstances()
      setInstances(refreshed.instances)
      setStatus(await terrariaApi.getStatus())
      const world = result.worlds.find((item) => item.path === path)
      if (world?.instanceId) {
        setSelectedInstanceId(world.instanceId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '重启失败')
    } finally {
      setActionLoading(null)
    }
  }, [])

  const deleteWorld = useCallback(
    async (path: string, worldName: string, instanceId: string | null) => {
      const confirmed = window.confirm(
        `确定删除世界「${worldName}」？\n\n将同时删除 .wld 文件及关联实例配置，此操作不可恢复。`,
      )
      if (!confirmed) return

      setActionLoading(`delete:${path}`)
      setError(null)
      try {
        const result = await worldsApi.delete(path)
        setWorlds(result.worlds)
        const refreshed = await terrariaApi.getInstances()
        setInstances(refreshed.instances)
        setStatus(await terrariaApi.getStatus())

        if (instanceId && selectedInstanceId === instanceId) {
          setSelectedInstanceId(null)
        }

        setLogsByInstance((prev) => {
          if (!instanceId) return prev
          const next = { ...prev }
          delete next[instanceId]
          return next
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除失败')
      } finally {
        setActionLoading(null)
      }
    },
    [selectedInstanceId],
  )

  const selectInstance = useCallback((instanceId: string) => {
    setSelectedInstanceId(instanceId)
    subscribeInstance(instanceId)
  }, [subscribeInstance])

  const sendCommand = useCallback((command: string) => {
    const trimmed = command.trim()
    if (!trimmed || !selectedInstanceId) return

    setError(null)
    socketRef.current?.emit('command', {
      instanceId: selectedInstanceId,
      command: trimmed,
    })
  }, [selectedInstanceId])

  const clearError = useCallback(() => setError(null), [])
  const openCreateModal = useCallback(() => setCreateModalOpen(true), [])
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), [])

  const selectedLogs = selectedInstanceId
    ? logsByInstance[selectedInstanceId] ?? []
    : []

  const selectedInstance = instances.find((item) => item.id === selectedInstanceId) ?? null

  return {
    status,
    instances,
    selectedInstanceId,
    selectedInstance,
    logs: selectedLogs,
    installProgress,
    worlds,
    worldsLoading,
    createModalOpen,
    connected,
    actionLoading,
    error,
    startAll,
    stopAll,
    restartAll,
    install,
    createWorld,
    startWorld,
    stopWorld,
    restartWorld,
    deleteWorld,
    selectInstance,
    openCreateModal,
    closeCreateModal,
    sendCommand,
    clearError,
  }
}
