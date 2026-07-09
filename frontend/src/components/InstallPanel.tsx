import { useEffect, useState } from 'react'
import type { InstallProgressDto } from '../types/terraria'

interface InstallPanelProps {
  installed: boolean
  progress: InstallProgressDto
  loading: string | null
  onInstall: () => void
}

const PHASE_LABELS: Record<InstallProgressDto['phase'], string> = {
  idle: '待命',
  downloading: '下载中',
  extracting: '解压中',
  chmod: '赋权中',
  completed: '已完成',
  failed: '失败',
}

export function InstallPanel({
  installed,
  progress,
  loading,
  onInstall,
}: InstallPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const installing =
    loading === 'install' ||
    (progress.phase !== 'idle' &&
      progress.phase !== 'completed' &&
      progress.phase !== 'failed')

  const showProgress =
    progress.phase !== 'idle' || loading === 'install'

  useEffect(() => {
    if (!installed || installing) {
      setConfirmOpen(false)
      setConfirmed(false)
    }
  }, [installed, installing])

  const handlePrimaryInstall = () => {
    if (installed) {
      setConfirmOpen(true)
      setConfirmed(false)
      return
    }
    onInstall()
  }

  const handleConfirmReinstall = () => {
    if (!confirmed) return
    onInstall()
    setConfirmOpen(false)
    setConfirmed(false)
  }

  return (
    <section className="ops-section install-panel">
      <div className="panel__header">
        <h3>服务器安装</h3>
        <p>
          {installed
            ? '程序已就绪。重新安装会覆盖现有服务器文件，请谨慎操作。'
            : '下载 Terraria 专用服务器并自动解压、赋权。'}
        </p>
      </div>

      <div className="install-panel__body">
        {!confirmOpen && (
          <button
            type="button"
            className={installed ? 'btn btn-ghost' : 'btn btn-primary'}
            disabled={installing}
            onClick={handlePrimaryInstall}
          >
            {installing
              ? '安装进行中...'
              : installed
                ? '重新安装…'
                : '开始安装'}
          </button>
        )}

        {confirmOpen && !installing && (
          <div className="confirm-box" role="group" aria-label="确认重新安装">
            <p className="confirm-box__warning">
              重新安装将重新下载并覆盖当前服务器程序目录，进行中的实例可能受影响。世界存档通常不受影响，但仍建议先停止所有世界。
            </p>
            <label className="confirm-box__check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>我已了解风险，确认重新安装</span>
            </label>
            <div className="confirm-box__actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmOpen(false)
                  setConfirmed(false)
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!confirmed}
                onClick={handleConfirmReinstall}
              >
                确认重新安装
              </button>
            </div>
          </div>
        )}

        {showProgress && (
          <div className="install-panel__progress">
            <div className="install-panel__progress-meta">
              <span>{PHASE_LABELS[progress.phase]}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar__fill ${
                  progress.phase === 'failed' ? 'progress-bar__fill--error' : ''
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <p className="install-panel__message">{progress.message}</p>
            {progress.error && (
              <p className="install-panel__error">{progress.error}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
