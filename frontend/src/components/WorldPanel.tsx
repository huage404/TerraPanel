import type { ServerStatusDto } from '../types/terraria'
import type { WorldSummary } from '../types/world'
import { formatDateTime, formatFileSize } from '../utils/world'
import { isBusyStatus } from '../utils/format'

interface WorldPanelProps {
  installed: boolean
  status: ServerStatusDto['status']
  worlds: WorldSummary[]
  loading: boolean
  actionLoading: string | null
  onCreateClick: () => void
  onSelectWorld: (path: string) => void
}

export function WorldPanel({
  installed,
  status,
  worlds,
  loading,
  actionLoading,
  onCreateClick,
  onSelectWorld,
}: WorldPanelProps) {
  if (!installed) {
    return null
  }

  const busy = isBusyStatus(status) || actionLoading !== null
  const hasWorlds = worlds.length > 0

  return (
    <section className="panel world-panel">
      <div className="panel__header world-panel__header">
        <div>
          <h2>世界管理</h2>
          <p>从 .wld 文件自动扫描世界列表，并管理 serverconfig.txt 配置</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
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
            disabled={busy}
            onClick={onCreateClick}
          >
            创建世界
          </button>
        </div>
      ) : (
        <div className="world-list">
          {worlds.map((world) => (
            <article
              key={world.path}
              className={`world-card${world.active ? ' world-card--active' : ''}`}
            >
              <div className="world-card__main">
                <div className="world-card__title-row">
                  <h3>{world.worldName}</h3>
                  {world.active && <span className="world-card__badge">当前</span>}
                </div>
                <p className="world-card__meta">
                  {formatFileSize(world.sizeBytes)} · 更新于{' '}
                  {formatDateTime(world.modifiedAt)}
                </p>
                <p className="world-card__path">{world.path}</p>
              </div>

              {!world.active && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => onSelectWorld(world.path)}
                >
                  设为当前
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
