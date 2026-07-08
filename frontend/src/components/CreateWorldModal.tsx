import { useEffect, useState, type FormEvent } from 'react'
import type { CreateWorldPayload } from '../types/world'
import {
  DEFAULT_CREATE_WORLD_FORM,
  WORLD_DIFFICULTY_OPTIONS,
  WORLD_SIZE_OPTIONS,
} from '../types/world'

interface CreateWorldModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (payload: CreateWorldPayload) => void
}

export function CreateWorldModal({
  open,
  loading,
  onClose,
  onSubmit,
}: CreateWorldModalProps) {
  const [form, setForm] = useState<CreateWorldPayload>(DEFAULT_CREATE_WORLD_FORM)

  useEffect(() => {
    if (open) {
      setForm(DEFAULT_CREATE_WORLD_FORM)
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
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
            <h2 id="create-world-title">创建世界</h2>
            <p>配置将写入 serverconfig.txt，并由 Terraria 服务器生成世界文件</p>
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

          <div className="modal__actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '创建中...' : '确认创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
