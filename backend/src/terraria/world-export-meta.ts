/** Lightweight export metadata for TerraPanel world archives. */
export const WORLD_EXPORT_META_FILENAME = 'terrapanel-meta.json';

export interface WorldExportMeta {
  version: 1;
  exportedAt: string;
  worldName: string;
  port?: number;
  maxPlayers?: number;
  password?: string;
  motd?: string;
  worldSize?: number;
  worldSeed?: string;
  worldDifficulty?: number;
}

export function isWorldExportMeta(value: unknown): value is WorldExportMeta {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1 && typeof record.worldName === 'string';
}
