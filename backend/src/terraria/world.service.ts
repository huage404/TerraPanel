import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { access, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ServerStatus } from '../common/enums/server-status.enum';
import { AppConfigService } from '../config/config.service';
import { CreateWorldDto } from './dto/create-world.dto';
import {
  CreateWorldResponseDto,
  WorldsResponseDto,
} from './dto/worlds-response.dto';
import { WorldSummaryDto } from './dto/world-summary.dto';
import { ProcessManagerService } from './process-manager.service';
import { ServerConfigService } from './server-config.service';

@Injectable()
export class WorldService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly serverConfigService: ServerConfigService,
    private readonly processManager: ProcessManagerService,
  ) {}

  async listWorlds(): Promise<WorldsResponseDto> {
    const config = this.configService.getRuntimeConfig();
    const activeWorldPath = this.serverConfigService.resolveWorldPath(config);
    const worldsDir = this.getWorldsDir(config.dataPath);

    await mkdir(worldsDir, { recursive: true });

    const entries = await readdir(worldsDir, { withFileTypes: true });
    const worlds: WorldSummaryDto[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.wld')) {
        continue;
      }

      const path = join(worldsDir, entry.name);
      const fileStat = await stat(path);
      worlds.push({
        fileName: entry.name,
        worldName: entry.name.replace(/\.wld$/i, ''),
        path,
        sizeBytes: fileStat.size,
        modifiedAt: fileStat.mtime.toISOString(),
        active: path === activeWorldPath,
      });
    }

    worlds.sort(
      (left, right) =>
        new Date(right.modifiedAt).getTime() -
        new Date(left.modifiedAt).getTime(),
    );

    return {
      worlds,
      activeWorldPath: worlds.some((world) => world.active)
        ? activeWorldPath
        : null,
    };
  }

  async createWorld(dto: CreateWorldDto): Promise<CreateWorldResponseDto> {
    this.assertInstalled();
    this.assertServerStopped();

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

    await this.configService.updateRuntimeConfig({
      worldName,
      worldPath: '',
      worldSize: dto.worldSize ?? 2,
      worldSeed: dto.worldSeed?.trim() ?? '',
      worldDifficulty: dto.worldDifficulty ?? 0,
    });

    await this.serverConfigService.writeConfig();
    await this.processManager.start();

    return {
      ...(await this.listWorlds()),
      status: this.processManager.getStatusSnapshot(),
    };
  }

  async selectWorld(path: string): Promise<WorldsResponseDto> {
    this.assertServerStopped();

    const { worlds } = await this.listWorlds();
    const target = worlds.find((world) => world.path === path);

    if (!target) {
      throw new NotFoundException('世界不存在');
    }

    await this.configService.updateRuntimeConfig({
      worldName: target.worldName,
      worldPath: target.path,
    });
    await this.serverConfigService.writeConfig();

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

  private assertServerStopped(): void {
    const { status } = this.processManager.getStatusSnapshot();

    if (
      status === ServerStatus.RUNNING ||
      status === ServerStatus.STARTING ||
      status === ServerStatus.STOPPING
    ) {
      throw new BadRequestException('请先停止服务器后再操作世界');
    }
  }
}
