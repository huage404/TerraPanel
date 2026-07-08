import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { accessSync, constants } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  PersistedTerrariaSettings,
  TerrariaEnvConfig,
} from './configuration';
import { UpdateConfigDto } from './dto/update-config.dto';

export interface RuntimeTerrariaConfig extends TerrariaEnvConfig {
  installed: boolean;
  executablePath: string;
}

@Injectable()
export class AppConfigService implements OnModuleInit {
  /** 来自 .env / 容器环境变量，启动后不变 */
  private readonly envConfig: TerrariaEnvConfig;
  /** 合并持久化设置后的有效配置 */
  private runtimeConfig: TerrariaEnvConfig;

  constructor(private readonly configService: ConfigService) {
    this.envConfig = this.configService.get<TerrariaEnvConfig>('terraria')!;
    this.runtimeConfig = { ...this.envConfig };
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDataDir();
    await this.loadRuntimeConfig();
  }

  getAppPort(): number {
    return this.configService.get<number>('app.port') ?? 3000;
  }

  getCorsOrigin(): string {
    return this.configService.get<string>('app.corsOrigin') ?? 'http://localhost:5173';
  }

  getRuntimeConfig(): RuntimeTerrariaConfig {
    return {
      ...this.getEffectiveConfig(),
      installed: this.isInstalledSync(),
      executablePath: this.getExecutablePath(),
    };
  }

  getInstallPath(): string {
    return this.envConfig.installPath;
  }

  getDataPath(): string {
    return this.envConfig.dataPath;
  }

  getExecutablePath(): string {
    return join(this.envConfig.installPath, this.envConfig.executable);
  }

  getDownloadUrl(): string {
    return this.envConfig.downloadUrl;
  }

  isInstalledSync(): boolean {
    try {
      accessSync(this.getExecutablePath(), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async isInstalled(): Promise<boolean> {
    return this.isInstalledSync();
  }

  async updateRuntimeConfig(dto: UpdateConfigDto): Promise<RuntimeTerrariaConfig> {
    this.runtimeConfig = {
      ...this.runtimeConfig,
      ...dto,
    };
    await this.persistRuntimeConfig();
    return this.getRuntimeConfig();
  }

  private getEffectiveConfig(): TerrariaEnvConfig {
    return {
      ...this.envConfig,
      serverPort: this.runtimeConfig.serverPort,
      maxPlayers: this.runtimeConfig.maxPlayers,
      worldPath: this.runtimeConfig.worldPath,
      worldName: this.runtimeConfig.worldName,
      password: this.runtimeConfig.password,
      motd: this.runtimeConfig.motd,
      autoSaveMinutes: this.runtimeConfig.autoSaveMinutes,
    };
  }

  private getSettingsFilePath(): string {
    return join(this.envConfig.dataPath, 'terrapanel.settings.json');
  }

  private async ensureDataDir(): Promise<void> {
    await mkdir(this.envConfig.dataPath, { recursive: true });
    await mkdir(this.envConfig.installPath, { recursive: true });
  }

  private async loadRuntimeConfig(): Promise<void> {
    try {
      const raw = await readFile(this.getSettingsFilePath(), 'utf-8');
      const saved = JSON.parse(raw) as Partial<PersistedTerrariaSettings>;
      this.runtimeConfig = {
        ...this.envConfig,
        ...this.pickPersistedSettings(saved),
      };
    } catch {
      this.runtimeConfig = { ...this.envConfig };
      await this.persistRuntimeConfig();
    }
  }

  private async persistRuntimeConfig(): Promise<void> {
    const payload = this.pickPersistedSettings(this.runtimeConfig);
    await writeFile(this.getSettingsFilePath(), JSON.stringify(payload, null, 2));
  }

  private pickPersistedSettings(
    source: Partial<TerrariaEnvConfig>,
  ): PersistedTerrariaSettings {
    return {
      serverPort: source.serverPort ?? this.envConfig.serverPort,
      maxPlayers: source.maxPlayers ?? this.envConfig.maxPlayers,
      worldPath: source.worldPath ?? this.envConfig.worldPath,
      worldName: source.worldName ?? this.envConfig.worldName,
      password: source.password ?? this.envConfig.password,
      motd: source.motd ?? this.envConfig.motd,
      autoSaveMinutes:
        source.autoSaveMinutes ?? this.envConfig.autoSaveMinutes,
    };
  }
}
