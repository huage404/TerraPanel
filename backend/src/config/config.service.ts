import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { accessSync, constants } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TerrariaEnvConfig } from './configuration';
import { UpdateConfigDto } from './dto/update-config.dto';

export interface RuntimeTerrariaConfig extends TerrariaEnvConfig {
  installed: boolean;
  executablePath: string;
}

@Injectable()
export class AppConfigService implements OnModuleInit {
  private runtimeConfig: TerrariaEnvConfig;

  constructor(private readonly configService: ConfigService) {
    this.runtimeConfig = this.configService.get<TerrariaEnvConfig>('terraria')!;
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
      ...this.runtimeConfig,
      installed: this.isInstalledSync(),
      executablePath: this.getExecutablePath(),
    };
  }

  getInstallPath(): string {
    return this.runtimeConfig.installPath;
  }

  getDataPath(): string {
    return this.runtimeConfig.dataPath;
  }

  getExecutablePath(): string {
    return join(this.runtimeConfig.installPath, this.runtimeConfig.executable);
  }

  getDownloadUrl(): string {
    return this.runtimeConfig.downloadUrl;
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
    try {
      accessSync(this.getExecutablePath(), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async updateRuntimeConfig(dto: UpdateConfigDto): Promise<RuntimeTerrariaConfig> {
    this.runtimeConfig = {
      ...this.runtimeConfig,
      ...dto,
    };
    await this.persistRuntimeConfig();
    return this.getRuntimeConfig();
  }

  private getSettingsFilePath(): string {
    return join(this.runtimeConfig.dataPath, 'terrapanel.settings.json');
  }

  private async ensureDataDir(): Promise<void> {
    await mkdir(this.runtimeConfig.dataPath, { recursive: true });
    await mkdir(this.runtimeConfig.installPath, { recursive: true });
  }

  private async loadRuntimeConfig(): Promise<void> {
    try {
      const raw = await readFile(this.getSettingsFilePath(), 'utf-8');
      const saved = JSON.parse(raw) as Partial<TerrariaEnvConfig>;
      this.runtimeConfig = {
        ...this.runtimeConfig,
        ...saved,
      };
    } catch {
      await this.persistRuntimeConfig();
    }
  }

  private async persistRuntimeConfig(): Promise<void> {
    const payload: TerrariaEnvConfig = {
      installPath: this.runtimeConfig.installPath,
      dataPath: this.runtimeConfig.dataPath,
      executable: this.runtimeConfig.executable,
      downloadUrl: this.runtimeConfig.downloadUrl,
      serverPort: this.runtimeConfig.serverPort,
      maxPlayers: this.runtimeConfig.maxPlayers,
      worldPath: this.runtimeConfig.worldPath,
      worldName: this.runtimeConfig.worldName,
      password: this.runtimeConfig.password,
      motd: this.runtimeConfig.motd,
      autoSaveMinutes: this.runtimeConfig.autoSaveMinutes,
    };
    await writeFile(this.getSettingsFilePath(), JSON.stringify(payload, null, 2));
  }
}
