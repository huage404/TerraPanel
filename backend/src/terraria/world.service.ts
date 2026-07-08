import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { access, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';
import { ServerStatus } from '../common/enums/server-status.enum';
import { AppConfigService } from '../config/config.service';
import { CreateWorldDto } from './dto/create-world.dto';
import {
  CreateWorldResponseDto,
  WorldsResponseDto,
} from './dto/worlds-response.dto';
import { WorldSummaryDto } from './dto/world-summary.dto';
import { InstanceManagerService } from './instance-manager.service';

@Injectable()
export class WorldService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly instanceManager: InstanceManagerService,
  ) {}

  async listWorlds(): Promise<WorldsResponseDto> {
    const dataPath = this.configService.getDataPath();
    const worldsDir = this.getWorldsDir(dataPath);

    await mkdir(worldsDir, { recursive: true });

    const entries = await readdir(worldsDir, { withFileTypes: true });
    const worlds: WorldSummaryDto[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.wld')) {
        continue;
      }

      const path = join(worldsDir, entry.name);
      const fileStat = await stat(path);
      const instance = this.instanceManager.findByWorldPath(path);

      worlds.push({
        fileName: entry.name,
        worldName: entry.name.replace(/\.wld$/i, ''),
        path,
        sizeBytes: fileStat.size,
        modifiedAt: fileStat.mtime.toISOString(),
        instanceId: instance?.id ?? null,
        status: instance?.status ?? ServerStatus.STOPPED,
        port: instance?.port ?? null,
        playerCount: instance?.playerCount ?? 0,
        maxPlayers: instance?.maxPlayers ?? this.configService.getRuntimeConfig().maxPlayers,
        pid: instance?.pid ?? null,
        uptimeSeconds: instance?.uptimeSeconds ?? 0,
      });
    }

    worlds.sort(
      (left, right) =>
        new Date(right.modifiedAt).getTime() -
        new Date(left.modifiedAt).getTime(),
    );

    return { worlds };
  }

  async createWorld(dto: CreateWorldDto): Promise<CreateWorldResponseDto> {
    this.assertInstalled();

    const worldName = dto.worldName.trim();
    const dataPath = this.configService.getDataPath();
    const worldPath = join(this.getWorldsDir(dataPath), `${worldName}.wld`);

    try {
      await access(worldPath);
      throw new BadRequestException(`世界「${worldName}」已存在`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
    }

    const instance = await this.instanceManager.createInstance({
      worldPath,
      worldName,
      worldSize: dto.worldSize ?? 2,
      worldSeed: dto.worldSeed?.trim() ?? '',
      worldDifficulty: dto.worldDifficulty ?? 0,
      allowMissingWorld: true,
    });

    const started = await this.instanceManager.start(instance.id);

    return {
      ...(await this.listWorlds()),
      status: this.instanceManager.getAggregateStatus(),
      instance: started,
    };
  }

  async startWorld(path: string): Promise<WorldsResponseDto> {
    this.assertInstalled();
    await this.assertWorldFileExists(path);

    const existing = this.instanceManager.findByWorldPath(path);
    if (existing) {
      if (
        existing.status === ServerStatus.RUNNING ||
        existing.status === ServerStatus.STARTING
      ) {
        return this.listWorlds();
      }
      await this.instanceManager.start(existing.id);
      return this.listWorlds();
    }

    await this.instanceManager.getOrCreateForWorld(path);
    const created = this.instanceManager.findByWorldPath(path);
    if (!created) {
      throw new NotFoundException('实例创建失败');
    }
    await this.instanceManager.start(created.id);
    return this.listWorlds();
  }

  async stopWorld(path: string): Promise<WorldsResponseDto> {
    const instance = this.instanceManager.findByWorldPath(path);
    if (!instance) {
      throw new NotFoundException('该世界尚未关联实例');
    }

    await this.instanceManager.stop(instance.id);
    return this.listWorlds();
  }

  async restartWorld(path: string): Promise<WorldsResponseDto> {
    const instance = this.instanceManager.findByWorldPath(path);
    if (!instance) {
      return this.startWorld(path);
    }

    await this.instanceManager.restart(instance.id);
    return this.listWorlds();
  }

  async deleteWorld(path: string): Promise<WorldsResponseDto> {
    this.assertInstalled();
    this.assertWorldPathSafe(path);
    await this.assertWorldFileExists(path);

    const instance = this.instanceManager.findByWorldPath(path);
    if (instance) {
      if (
        instance.status === ServerStatus.RUNNING ||
        instance.status === ServerStatus.STARTING ||
        instance.status === ServerStatus.STOPPING
      ) {
        throw new BadRequestException('请先停止该世界的服务器后再删除');
      }
      await this.instanceManager.deleteInstance(instance.id);
    }

    await this.removeWorldFiles(path);
    return this.listWorlds();
  }

  private getWorldsDir(dataPath: string): string {
    return join(dataPath, 'worlds');
  }

  private assertInstalled(): void {
    if (!this.configService.isInstalledSync()) {
      throw new BadRequestException('Terraria 服务器尚未安装，请先执行一键安装');
    }
  }

  private async assertWorldFileExists(path: string): Promise<void> {
    try {
      await access(path);
    } catch {
      throw new NotFoundException('世界不存在');
    }
  }

  private assertWorldPathSafe(worldPath: string): void {
    const worldsDir = resolve(this.getWorldsDir(this.configService.getDataPath()));
    const resolvedPath = resolve(worldPath);
    const prefix = worldsDir.endsWith(sep) ? worldsDir : `${worldsDir}${sep}`;

    if (resolvedPath !== worldsDir && !resolvedPath.startsWith(prefix)) {
      throw new BadRequestException('无效的世界路径');
    }
  }

  private async removeWorldFiles(worldPath: string): Promise<void> {
    const worldDir = resolve(join(worldPath, '..'));
    const worldBaseName = basename(worldPath, '.wld');
    const entries = await readdir(worldDir);

    for (const entry of entries) {
      if (
        entry === `${worldBaseName}.wld` ||
        entry.startsWith(`${worldBaseName}.wld.`)
      ) {
        await rm(join(worldDir, entry), { force: true });
      }
    }
  }
}
