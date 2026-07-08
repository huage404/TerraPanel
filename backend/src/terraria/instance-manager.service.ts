import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { ServerStatus } from '../common/enums/server-status.enum';
import type { InstanceConfig } from '../common/interfaces/instance-config.interface';
import type { LogEntry } from '../common/interfaces/log-entry.interface';
import { AppConfigService } from '../config/config.service';
import type { PersistedTerrariaSettings } from '../config/configuration';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { InstanceStatusDto } from './dto/instance-status.dto';
import { ServerStatusDto } from './dto/server-status.dto';
import { ServerConfigService } from './server-config.service';
import {
  InstanceStatusSnapshot,
  TerrariaProcessInstance,
} from './terraria-process.instance';

@Injectable()
export class InstanceManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstanceManagerService.name);
  private readonly instances = new Map<string, TerrariaProcessInstance>();

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly serverConfigService: ServerConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadInstances();
    if (this.instances.size === 0) {
      await this.migrateFromLegacySettings();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopAll(true);
  }

  getAllStatuses(): InstanceStatusDto[] {
    return [...this.instances.values()].map((instance) =>
      this.toStatusDto(instance.getStatusSnapshot()),
    );
  }

  getInstanceStatus(id: string): InstanceStatusDto {
    const instance = this.getInstanceOrThrow(id);
    return this.toStatusDto(instance.getStatusSnapshot());
  }

  findByWorldPath(worldPath: string): InstanceStatusDto | null {
    const instance = this.findInstanceByWorldPath(worldPath);
    return instance
      ? this.toStatusDto(instance.getStatusSnapshot())
      : null;
  }

  getAggregateStatus(): ServerStatusDto {
    const snapshots = this.getAllStatuses();
    const installed = this.appConfigService.isInstalledSync();

    if (snapshots.length === 0) {
      const defaults = this.appConfigService.getRuntimeConfig();
      return {
        status: ServerStatus.STOPPED,
        installed,
        port: defaults.serverPort,
        playerCount: 0,
        maxPlayers: defaults.maxPlayers,
        startedAt: null,
        uptimeSeconds: 0,
        pid: null,
        runningCount: 0,
        totalInstances: 0,
        totalPlayerCount: 0,
      };
    }

    const running = snapshots.filter((s) => s.status === ServerStatus.RUNNING);
    const starting = snapshots.filter(
      (s) => s.status === ServerStatus.STARTING,
    );
    const stopping = snapshots.filter(
      (s) => s.status === ServerStatus.STOPPING,
    );
    const errored = snapshots.filter((s) => s.status === ServerStatus.ERROR);

    let status = ServerStatus.STOPPED;
    if (starting.length > 0) status = ServerStatus.STARTING;
    else if (stopping.length > 0) status = ServerStatus.STOPPING;
    else if (running.length > 0) status = ServerStatus.RUNNING;
    else if (errored.length > 0) status = ServerStatus.ERROR;

    const totalPlayerCount = snapshots.reduce(
      (sum, item) => sum + item.playerCount,
      0,
    );

    const primary = running[0] ?? starting[0] ?? snapshots[0];

    return {
      status,
      installed,
      port: primary.port,
      playerCount: totalPlayerCount,
      maxPlayers: primary.maxPlayers,
      startedAt: primary.startedAt,
      uptimeSeconds: primary.uptimeSeconds,
      pid: primary.pid,
      runningCount: running.length,
      totalInstances: snapshots.length,
      totalPlayerCount,
    };
  }

  getLogs(instanceId: string, limit = 200): LogEntry[] {
    return this.getInstanceOrThrow(instanceId).getLogs(limit);
  }

  async createInstance(dto: CreateInstanceDto): Promise<InstanceStatusDto> {
    const worldPath = dto.worldPath.trim();
    if (!dto.allowMissingWorld) {
      await this.assertWorldExists(worldPath);
    }

    const existing = this.findInstanceByWorldPath(worldPath);
    if (existing) {
      throw new BadRequestException('该世界已有关联实例');
    }

    const defaults = this.appConfigService.getRuntimeConfig();
    const port = dto.port ?? this.allocatePort();
    this.assertPortAvailable(port);

    const worldName =
      dto.worldName?.trim() ||
      worldPath.split(/[/\\]/).pop()?.replace(/\.wld$/i, '') ||
      'world';

    const config: InstanceConfig = {
      id: randomUUID(),
      worldPath,
      worldName,
      port,
      maxPlayers: dto.maxPlayers ?? defaults.maxPlayers,
      password: dto.password ?? defaults.password,
      motd: dto.motd ?? defaults.motd,
      worldSize: dto.worldSize ?? defaults.worldSize,
      worldSeed: dto.worldSeed ?? defaults.worldSeed,
      worldDifficulty: dto.worldDifficulty ?? defaults.worldDifficulty,
      autoSaveMinutes: dto.autoSaveMinutes ?? defaults.autoSaveMinutes,
    };

    await this.persistInstance(config);
    return this.toStatusDto(this.getInstanceOrThrow(config.id).getStatusSnapshot());
  }

  async getOrCreateForWorld(
    worldPath: string,
    overrides?: Partial<CreateInstanceDto>,
  ): Promise<InstanceStatusDto> {
    const existing = this.findInstanceByWorldPath(worldPath);
    if (existing) {
      return this.toStatusDto(existing.getStatusSnapshot());
    }

    return this.createInstance({ worldPath, ...overrides });
  }

  async deleteInstance(id: string): Promise<void> {
    const instance = this.getInstanceOrThrow(id);
    const snapshot = instance.getStatusSnapshot();

    if (
      snapshot.status === ServerStatus.RUNNING ||
      snapshot.status === ServerStatus.STARTING ||
      snapshot.status === ServerStatus.STOPPING
    ) {
      throw new BadRequestException('请先停止实例后再删除');
    }

    this.instances.delete(id);
    await this.saveInstancesFile();
    await this.removeInstanceConfigDir(id);
  }

  async deleteByWorldPath(worldPath: string): Promise<void> {
    const instance = this.findInstanceByWorldPath(worldPath);
    if (instance) {
      await this.deleteInstance(instance.id);
    }
  }

  async start(id: string): Promise<InstanceStatusDto> {
    const instance = this.getInstanceOrThrow(id);
    await instance.start();
    return this.toStatusDto(instance.getStatusSnapshot());
  }

  async stop(id: string, force = false): Promise<InstanceStatusDto> {
    const instance = this.getInstanceOrThrow(id);
    await instance.stop(force);
    return this.toStatusDto(instance.getStatusSnapshot());
  }

  async restart(id: string): Promise<InstanceStatusDto> {
    const instance = this.getInstanceOrThrow(id);
    await instance.restart();
    return this.toStatusDto(instance.getStatusSnapshot());
  }

  async startAll(): Promise<InstanceStatusDto[]> {
    const results: InstanceStatusDto[] = [];
    for (const instance of this.instances.values()) {
      const snapshot = instance.getStatusSnapshot();
      if (
        snapshot.status === ServerStatus.STOPPED ||
        snapshot.status === ServerStatus.ERROR
      ) {
        results.push(await this.start(snapshot.id));
      } else {
        results.push(this.toStatusDto(snapshot));
      }
    }
    return results;
  }

  async stopAll(force = false): Promise<InstanceStatusDto[]> {
    const results: InstanceStatusDto[] = [];
    for (const instance of this.instances.values()) {
      results.push(await this.stop(instance.id, force));
    }
    return results;
  }

  async restartAll(): Promise<InstanceStatusDto[]> {
    await this.stopAll();
    return this.startAll();
  }

  sendCommand(id: string, command: string): void {
    this.getInstanceOrThrow(id).sendCommand(command);
  }

  assertWorldNotRunningElsewhere(
    worldPath: string,
    excludeId?: string,
  ): void {
    for (const instance of this.instances.values()) {
      if (excludeId && instance.id === excludeId) continue;

      const snapshot = instance.getStatusSnapshot();
      if (
        snapshot.worldPath === worldPath &&
        (snapshot.status === ServerStatus.RUNNING ||
          snapshot.status === ServerStatus.STARTING)
      ) {
        throw new BadRequestException('该世界已在另一个实例中运行');
      }
    }
  }

  private getInstanceOrThrow(id: string): TerrariaProcessInstance {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new NotFoundException('实例不存在');
    }
    return instance;
  }

  private findInstanceByWorldPath(
    worldPath: string,
  ): TerrariaProcessInstance | undefined {
    return [...this.instances.values()].find(
      (instance) => instance.getConfig().worldPath === worldPath,
    );
  }

  private createProcessInstance(
    config: InstanceConfig,
  ): TerrariaProcessInstance {
    return new TerrariaProcessInstance(
      config,
      this.appConfigService,
      this.serverConfigService,
      this.eventEmitter,
    );
  }

  private async removeInstanceConfigDir(instanceId: string): Promise<void> {
    const configDir = join(
      this.appConfigService.getDataPath(),
      'instances',
      instanceId,
    );
    await rm(configDir, { recursive: true, force: true });
  }

  private getInstancesFilePath(): string {
    return join(this.appConfigService.getDataPath(), 'terrapanel.instances.json');
  }

  private async loadInstances(): Promise<void> {
    try {
      const raw = await readFile(this.getInstancesFilePath(), 'utf-8');
      const configs = JSON.parse(raw) as InstanceConfig[];

      for (const config of configs) {
        this.instances.set(config.id, this.createProcessInstance(config));
      }
    } catch {
      // 首次运行或文件不存在
    }
  }

  private async persistInstance(config: InstanceConfig): Promise<void> {
    this.instances.set(config.id, this.createProcessInstance(config));
    await this.saveInstancesFile();
  }

  private async saveInstancesFile(): Promise<void> {
    const configs = [...this.instances.values()].map((instance) =>
      instance.getConfig(),
    );
    await writeFile(
      this.getInstancesFilePath(),
      JSON.stringify(configs, null, 2),
      'utf-8',
    );
  }

  private async migrateFromLegacySettings(): Promise<void> {
    const settingsPath = join(
      this.appConfigService.getDataPath(),
      'terrapanel.settings.json',
    );

    try {
      const raw = await readFile(settingsPath, 'utf-8');
      const saved = JSON.parse(raw) as Partial<PersistedTerrariaSettings>;
      const defaults = this.appConfigService.getRuntimeConfig();
      const worldPath = saved.worldPath
        ? saved.worldPath
        : join(
            defaults.dataPath,
            'worlds',
            `${saved.worldName ?? defaults.worldName}.wld`,
          );

      try {
        await access(worldPath);
      } catch {
        return;
      }

      const config: InstanceConfig = {
        id: randomUUID(),
        worldPath,
        worldName:
          saved.worldName ??
          worldPath.split(/[/\\]/).pop()?.replace(/\.wld$/i, '') ??
          defaults.worldName,
        port: saved.serverPort ?? defaults.serverPort,
        maxPlayers: saved.maxPlayers ?? defaults.maxPlayers,
        password: saved.password ?? defaults.password,
        motd: saved.motd ?? defaults.motd,
        worldSize: saved.worldSize ?? defaults.worldSize,
        worldSeed: saved.worldSeed ?? defaults.worldSeed,
        worldDifficulty: saved.worldDifficulty ?? defaults.worldDifficulty,
        autoSaveMinutes: saved.autoSaveMinutes ?? defaults.autoSaveMinutes,
      };

      await this.persistInstance(config);
      this.logger.log(`已从旧配置迁移实例: ${config.worldName}`);
    } catch {
      // 无旧配置可迁移
    }
  }

  private allocatePort(): number {
    const { portStart, portEnd } = this.appConfigService.getPortRange();
    const used = new Set(
      [...this.instances.values()].map(
        (instance) => instance.getConfig().port,
      ),
    );

    for (let port = portStart; port <= portEnd; port++) {
      if (!used.has(port)) {
        return port;
      }
    }

    throw new BadRequestException(
      `无可用端口（范围 ${portStart}-${portEnd} 已用尽）`,
    );
  }

  private assertPortAvailable(port: number): void {
    const { portStart, portEnd } = this.appConfigService.getPortRange();
    if (port < portStart || port > portEnd) {
      throw new BadRequestException(
        `端口 ${port} 不在允许范围 ${portStart}-${portEnd} 内`,
      );
    }

    for (const instance of this.instances.values()) {
      if (instance.getConfig().port === port) {
        throw new BadRequestException(`端口 ${port} 已被其他实例占用`);
      }
    }
  }

  private async assertWorldExists(worldPath: string): Promise<void> {
    try {
      await access(worldPath);
    } catch {
      throw new BadRequestException('世界文件不存在');
    }
  }

  private toStatusDto(snapshot: InstanceStatusSnapshot): InstanceStatusDto {
    return {
      ...snapshot,
      installed: this.appConfigService.isInstalledSync(),
    };
  }
}
