import type { WorldSummary } from '../types/world'
import { formatDateTime, formatFileSize } from '../utils/world'
import {
  canDelete,
  canRestart,
  canStart,
  canStop,
  getStatusLabel,
  isBusyStatus,
} from '../utils/format'

interface WorldPanelProps {
  installed: boolean
  worlds: WorldSummary[]
  loading: boolean
  actionLoading: string | null
  onCreateClick: () => void
  onStartWorld: (path: string) => void
  onStopWorld: (path: string) => void
  onRestartWorld: (path: string) => void
  onExportWorld: (path: string) => void
  onDeleteWorld: (path: string, worldName: string, instanceId: string | null) => void
}

function worldActionKey(prefix: string, path: string): string {
  return `${prefix}:${path}`
}

export function WorldPanel({
  installed,
  worlds,
  loading,
  actionLoading,
  onCreateClick,
  onStartWorld,
  onStopWorld,
  onRestartWorld,
  onExportWorld,
  onDeleteWorld,
}: WorldPanelProps) {
  if (!installed) {
    return null
  }

  const globalBusy = actionLoading !== null && !actionLoading.includes(':')
  const hasWorlds = worlds.length > 0

  return (
    <section className="panel world-panel">
      <div className="panel__header world-panel__header">
        <div>
          <h2>世界管理</h2>
          <p>每个世界独立端口与进程，可同时运行多个服务器实例</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={globalBusy}
          onClick={onCreateClick}
        >
          创建世界
        </button>
      </div>

      {loading && !hasWorlds ? (
        <p className="world-panel__empty">正在加载世界列表...</p>
      ) : !hasWorlds ? (
        <div className="world-panel__empty-state">
          <p>尚未检测到世界文件，请先创建世界。</p>
          <button
            type="button"
            className="btn btn-success world-panel__create-btn"
            disabled={globalBusy}
            onClick={onCreateClick}
          >
            创建世界
          </button>
        </div>
      ) : (
        <div className="world-list">
          {worlds.map((world) => {
            const busy =
              globalBusy ||
              isBusyStatus(world.status) ||
              actionLoading === worldActionKey('start', world.path) ||
              actionLoading === worldActionKey('stop', world.path) ||
              actionLoading === worldActionKey('restart', world.path) ||
              actionLoading === worldActionKey('export', world.path) ||
              actionLoading === worldActionKey('delete', world.path)

            const isRunning = world.status === 'running'

            return (
              <article
                key={world.path}
                className={`world-card${isRunning ? ' world-card--running' : ''}`}
              >
                <div className="world-card__main">
                  <div className="world-card__title-row">
                    <h3>{world.worldName}</h3>
                    <span className={`world-card__status badge-${world.status === 'running' ? 'running' : world.status === 'error' ? 'error' : world.status === 'starting' || world.status === 'stopping' ? 'starting' : 'stopped'}`}>
                      {getStatusLabel(world.status)}
                    </span>
                    {world.port != null && (
                      <span className="world-card__port">端口 {world.port}</span>
                    )}
                  </div>
                  <p className="world-card__meta">
                    {formatFileSize(world.sizeBytes)} · {world.playerCount}/{world.maxPlayers} 玩家
                    · 更新于 {formatDateTime(world.modifiedAt)}
                  </p>
                  <p className="world-card__path">{world.path}</p>
                </div>

                <div className="world-card__actions">
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={!canStart(world.status) || busy}
                    onClick={() => onStartWorld(world.path)}
                  >
                    {actionLoading === worldActionKey('start', world.path)
                      ? '启动中...'
                      : '启动'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={!canStop(world.status) || busy}
                    onClick={() => onStopWorld(world.path)}
                  >
                    {actionLoading === worldActionKey('stop', world.path)
                      ? '停止中...'
                      : '停止'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    disabled={!canRestart(world.status) || busy}
                    onClick={() => onRestartWorld(world.path)}
                  >
                    {actionLoading === worldActionKey('restart', world.path)
                      ? '重启中...'
                      : '重启'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    title="导出世界文件（zip），用于备份或迁移"
                    onClick={() => onExportWorld(world.path)}
                  >
                    {actionLoading === worldActionKey('export', world.path)
                      ? '导出中...'
                      : '导出'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-ghost--danger"
                    disabled={!canDelete(world.status) || busy}
                    title={canDelete(world.status) ? '删除世界及实例' : '请先停止服务器'}
                    onClick={() =>
                      onDeleteWorld(world.path, world.worldName, world.instanceId)
                    }
                  >
                    {actionLoading === worldActionKey('delete', world.path)
                      ? '删除中...'
                      : '删除'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
