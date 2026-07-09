import { useEffect, useState, type FormEvent } from 'react'
import type {
  CreateWorldPayload,
  ImportWorldPayload,
  WorldExportMeta,
} from '../types/world'
import {
  DEFAULT_CREATE_WORLD_FORM,
  WORLD_DIFFICULTY_OPTIONS,
  WORLD_SIZE_OPTIONS,
} from '../types/world'
import {
  readWorldUploadMeta,
  suggestWorldNameFromFile,
} from '../utils/worldImport'

interface CreateWorldModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onCreate: (payload: CreateWorldPayload) => void
  onImport: (payload: ImportWorldPayload) => void
}

interface ImportFormState {
  worldName: string
  port: string
  maxPlayers: string
  password: string
  motd: string
}

const DEFAULT_IMPORT_FORM: ImportFormState = {
  worldName: '',
  port: '',
  maxPlayers: '',
  password: '',
  motd: '',
}

export function CreateWorldModal({
  open,
  loading,
  onClose,
  onCreate,
  onImport,
}: CreateWorldModalProps) {
  const [form, setForm] = useState<CreateWorldPayload>(DEFAULT_CREATE_WORLD_FORM)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importForm, setImportForm] = useState<ImportFormState>(DEFAULT_IMPORT_FORM)
  const [metaHint, setMetaHint] = useState<string | null>(null)
  const [readingMeta, setReadingMeta] = useState(false)

  const importMode = importFile !== null

  useEffect(() => {
    if (open) {
      setForm(DEFAULT_CREATE_WORLD_FORM)
      setImportFile(null)
      setImportForm(DEFAULT_IMPORT_FORM)
      setMetaHint(null)
      setReadingMeta(false)
    }
  }, [open])

  if (!open) {
    return null
  }

  const applyMeta = (meta: WorldExportMeta | null, file: File) => {
    const suggestedName =
      meta?.worldName?.trim() || suggestWorldNameFromFile(file.name)

    setImportForm({
      worldName: suggestedName,
      port: meta?.port != null ? String(meta.port) : '',
      maxPlayers: meta?.maxPlayers != null ? String(meta.maxPlayers) : '',
      password: meta?.password ?? '',
      motd: meta?.motd ?? '',
    })

    if (!form.worldName || form.worldName === DEFAULT_CREATE_WORLD_FORM.worldName) {
      setForm((prev) => ({ ...prev, worldName: suggestedName }))
    }

    setMetaHint(
      meta
        ? '已读取导出元数据，以下为预填建议值，可按本机情况修改。'
        : '未检测到元数据，将仅导入存档，开服参数使用下方填写或系统默认值。',
    )
  }

  const handleFileChange = async (file: File | null) => {
    setImportFile(file)
    setMetaHint(null)

    if (!file) {
      setImportForm(DEFAULT_IMPORT_FORM)
      return
    }

    setReadingMeta(true)
    try {
      const meta = await readWorldUploadMeta(file)
      applyMeta(meta, file)
    } finally {
      setReadingMeta(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (importFile) {
      const worldName = importForm.worldName.trim()
      if (!worldName) return

      const portValue = importForm.port.trim()
      const maxPlayersValue = importForm.maxPlayers.trim()

      onImport({
        worldName,
        file: importFile,
        port: portValue ? Number(portValue) : undefined,
        maxPlayers: maxPlayersValue ? Number(maxPlayersValue) : undefined,
        password: importForm.password,
        motd: importForm.motd,
      })
      return
    }

    onCreate({
      ...form,
      worldName: form.worldName.trim(),
      worldSeed: form.worldSeed?.trim() ?? '',
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-world-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h2 id="create-world-title">
              {importMode ? '导入世界' : '创建世界'}
            </h2>
            <p>
              {importMode
                ? '上传已有存档；尺寸/难度/种子以文件为准，开服参数在本机确认'
                : '配置将写入 serverconfig.txt，并由 Terraria 服务器生成世界文件'}
            </p>
          </div>
          <button
            type="button"
            className="modal__close"
            aria-label="关闭"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          <div className="field">
            <span>世界文件（可选）</span>
            <input
              key={importFile ? importFile.name : 'no-file'}
              type="file"
              accept=".wld,.zip,application/zip"
              disabled={loading || readingMeta}
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0] ?? null)
              }}
            />
            <span className="field__hint">
              支持 `.wld` 或 TerraPanel 导出的 `.zip`。上传后进入导入模式。
            </span>
            {importFile && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={loading}
                onClick={() => {
                  void handleFileChange(null)
                }}
              >
                清除文件，改回新建模式
              </button>
            )}
          </div>

          {importMode ? (
            <>
              {metaHint && <p className="modal__notice">{metaHint}</p>}

              <label className="field">
                <span>世界名称</span>
                <input
                  type="text"
                  value={importForm.worldName}
                  maxLength={64}
                  required
                  placeholder="例如 my-world"
                  onChange={(event) =>
                    setImportForm((prev) => ({
                      ...prev,
                      worldName: event.target.value,
                    }))
                  }
                />
                <span className="field__hint">
                  决定落盘文件名；面板显示名以文件名为准。
                </span>
              </label>

              <label className="field">
                <span>端口（可选）</span>
                <input
                  type="number"
                  min={1024}
                  max={65535}
                  value={importForm.port}
                  placeholder="留空则自动分配；冲突时也会自动换端口"
                  onChange={(event) =>
                    setImportForm((prev) => ({
                      ...prev,
                      port: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>最大玩家数（可选）</span>
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={importForm.maxPlayers}
                  placeholder="留空使用系统默认"
                  onChange={(event) =>
                    setImportForm((prev) => ({
                      ...prev,
                      maxPlayers: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>密码（可选）</span>
                <input
                  type="text"
                  value={importForm.password}
                  maxLength={64}
                  placeholder="留空表示无密码或使用默认"
                  onChange={(event) =>
                    setImportForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>MOTD（可选）</span>
                <input
                  type="text"
                  value={importForm.motd}
                  maxLength={128}
                  placeholder="每日消息"
                  onChange={(event) =>
                    setImportForm((prev) => ({
                      ...prev,
                      motd: event.target.value,
                    }))
                  }
                />
              </label>

              <p className="modal__notice modal__notice--muted">
                已隐藏世界尺寸、难度与种子：导入以存档内容为准，不会按表单重建世界。
              </p>
            </>
          ) : (
            <>
              <label className="field">
                <span>世界名称</span>
                <input
                  type="text"
                  value={form.worldName}
                  maxLength={64}
                  required
                  placeholder="例如 my-world"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, worldName: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>世界尺寸</span>
                <select
                  value={form.worldSize}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      worldSize: Number(event.target.value),
                    }))
                  }
                >
                  {WORLD_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>世界难度</span>
                <select
                  value={form.worldDifficulty}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      worldDifficulty: Number(event.target.value),
                    }))
                  }
                >
                  {WORLD_DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>世界种子（可选）</span>
                <input
                  type="text"
                  value={form.worldSeed}
                  maxLength={64}
                  placeholder="留空则随机生成"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, worldSeed: event.target.value }))
                  }
                />
              </label>
            </>
          )}

          <div className="modal__actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || readingMeta}
            >
              {loading
                ? importMode
                  ? '导入中...'
                  : '创建中...'
                : importMode
                  ? '确认导入'
                  : '确认创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
