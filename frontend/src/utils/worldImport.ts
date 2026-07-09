import JSZip from 'jszip'
import {
  WORLD_EXPORT_META_FILENAME,
  type WorldExportMeta,
} from '../types/world'

function isWorldExportMeta(value: unknown): value is WorldExportMeta {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.version === 1 && typeof record.worldName === 'string'
}

export function suggestWorldNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.(zip|wld)$/i, '')
  return base.replace(/-\d{8}T\d{6}Z$/i, '') || base || 'world'
}

export async function readWorldUploadMeta(
  file: File,
): Promise<WorldExportMeta | null> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return null
  }

  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const metaFile = zip.file(WORLD_EXPORT_META_FILENAME)
    if (!metaFile) return null

    const parsed: unknown = JSON.parse(await metaFile.async('string'))
    return isWorldExportMeta(parsed) ? parsed : null
  } catch {
    return null
  }
}
