import type { ServerStatusDto } from '../types/terraria'
import {
  canRestart,
  canStart,
  canStop,
  isBusyStatus,
} from '../utils/format'

interface ControlPanelProps {
  status: ServerStatusDto
  hasWorlds: boolean
  loading: string | null
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onCreateClick: () => void
}

export function ControlPanel({
  status,
  hasWorlds,
  loading,
  onStart,
  onStop,
  onRestart,
  onCreateClick,
}: ControlPanelProps) {
  const busy = isBusyStatus(status.status) || loading !== null

  return (
    <section className="panel control-panel">
      <div className="panel__header">
        <h2>服务器控制</h2>
        <p>管理 Terraria 专用服务器的启停与重启</p>
      </div>

      <div className="control-panel__actions">
        {status.installed && !hasWorlds ? (
          <button
            type="button"
            className="btn btn-success"
            disabled={busy}
            onClick={onCreateClick}
          >
            {loading === 'createWorld' ? '创建中...' : '创建世界'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-success"
              disabled={!canStart(status.status) || busy || !hasWorlds}
              onClick={onStart}
            >
              {loading === 'start' ? '启动中...' : '启动'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!canStop(status.status) || busy}
              onClick={onStop}
            >
              {loading === 'stop' ? '停止中...' : '停止'}
            </button>
            <button
              type="button"
              className="btn btn-warning"
              disabled={!canRestart(status.status) || busy || !hasWorlds}
              onClick={onRestart}
            >
              {loading === 'restart' ? '重启中...' : '重启'}
            </button>
          </>
        )}
      </div>

      {!status.installed && (
        <p className="control-panel__hint">
          服务器尚未安装，请先使用下方「一键安装」完成部署。
        </p>
      )}

      {status.installed && !hasWorlds && (
        <p className="control-panel__hint">
          尚未检测到世界文件，请先创建世界后再启动服务器。
        </p>
      )}
    </section>
  )
}
