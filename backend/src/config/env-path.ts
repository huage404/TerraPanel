import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Monorepo 根目录 .env（backend 在 src/ 或 dist/ 下运行时均适用） */
export function resolveRootEnvPath(): string {
  return join(__dirname, '../../../.env');
}

export function rootEnvFileExists(): boolean {
  return existsSync(resolveRootEnvPath());
}
