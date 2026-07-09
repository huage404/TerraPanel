import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import AdmZip from 'adm-zip';
import { access, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';
import { ServerStatus } from '../common/enums/server-status.enum';
import { AppConfigService } from '../config/config.service';
import { CreateWorldDto } from './dto/create-world.dto';
import { ImportWorldDto } from './dto/import-world.dto';
import {
  CreateWorldResponseDto,
  WorldsResponseDto,
} from './dto/worlds-response.dto';
import { WorldSummaryDto } from './dto/world-summary.dto';
import { InstanceManagerService } from './instance-manager.service';
import {
  isWorldExportMeta,
  WORLD_EXPORT_META_FILENAME,
  type WorldExportMeta,
} from './world-export-meta';

export interface WorldExportArchive {
  fileName: string;
  buffer: Buffer;
}

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

    const worldName = this.normalizeWorldName(dto.worldName);
    const worldPath = await this.assertWorldNameAvailable(worldName);

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

  async importWorld(
    file: Express.Multer.File,
    dto: ImportWorldDto,
  ): Promise<CreateWorldResponseDto> {
    this.assertInstalled();

    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传世界文件（.wld 或导出的 zip）');
    }

    const worldName = this.normalizeWorldName(dto.worldName);
    const worldPath = await this.assertWorldNameAvailable(worldName);
    const extracted = this.extractWorldUpload(file);

    try {
      await writeFile(worldPath, extracted.wldBuffer);

      for (const [suffix, content] of Object.entries(extracted.related)) {
        await writeFile(`${worldPath}${suffix}`, content);
      }

      const defaults = this.configService.getRuntimeConfig();
      const preferredPort =
        dto.port ?? extracted.meta?.port ?? undefined;
      const port = this.instanceManager.suggestPort(preferredPort);

      const instance = await this.instanceManager.createInstance({
        worldPath,
        worldName,
        port,
        maxPlayers: dto.maxPlayers ?? extracted.meta?.maxPlayers ?? defaults.maxPlayers,
        password: dto.password ?? extracted.meta?.password ?? defaults.password,
        motd: dto.motd ?? extracted.meta?.motd ?? defaults.motd,
        worldSize: extracted.meta?.worldSize ?? defaults.worldSize,
        worldSeed: extracted.meta?.worldSeed ?? '',
        worldDifficulty:
          extracted.meta?.worldDifficulty ?? defaults.worldDifficulty,
        allowMissingWorld: false,
      });

      const started = await this.instanceManager.start(instance.id);

      return {
        ...(await this.listWorlds()),
        status: this.instanceManager.getAggregateStatus(),
        instance: started,
      };
    } catch (error) {
      await this.removeWorldFiles(worldPath).catch(() => undefined);
      throw error;
    }
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

  async exportWorld(path: string): Promise<WorldExportArchive> {
    this.assertInstalled();
    this.assertWorldPathSafe(path);
    await this.assertWorldFileExists(path);

    const worldDir = resolve(join(path, '..'));
    const worldBaseName = basename(path, '.wld');
    const entries = await readdir(worldDir);
    const relatedFiles = entries.filter(
      (entry) =>
        entry === `${worldBaseName}.wld` ||
        entry.startsWith(`${worldBaseName}.wld.`),
    );

    if (relatedFiles.length === 0) {
      throw new NotFoundException('世界不存在');
    }

    const zip = new AdmZip();
    for (const entry of relatedFiles) {
      zip.addLocalFile(join(worldDir, entry));
    }

    const config = this.instanceManager.findConfigByWorldPath(path);
    const defaults = this.configService.getRuntimeConfig();
    const meta: WorldExportMeta = {
      version: 1,
      exportedAt: new Date().toISOString(),
      worldName: config?.worldName ?? worldBaseName,
      port: config?.port,
      maxPlayers: config?.maxPlayers ?? defaults.maxPlayers,
      password: config?.password ?? defaults.password,
      motd: config?.motd ?? defaults.motd,
      worldSize: config?.worldSize ?? defaults.worldSize,
      worldSeed: config?.worldSeed ?? defaults.worldSeed,
      worldDifficulty: config?.worldDifficulty ?? defaults.worldDifficulty,
    };

    zip.addFile(
      WORLD_EXPORT_META_FILENAME,
      Buffer.from(`${JSON.stringify(meta, null, 2)}\n`, 'utf-8'),
    );

    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

    return {
      fileName: `${worldBaseName}-${stamp}.zip`,
      buffer: zip.toBuffer(),
    };
  }

  private extractWorldUpload(file: Express.Multer.File): {
    wldBuffer: Buffer;
    related: Record<string, Buffer>;
    meta: WorldExportMeta | null;
  } {
    const originalName = file.originalname?.toLowerCase() ?? '';
    const isZip =
      originalName.endsWith('.zip') ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed';

    if (isZip || this.looksLikeZip(file.buffer)) {
      return this.extractFromZip(file.buffer);
    }

    if (!originalName.endsWith('.wld') && originalName.length > 0) {
      throw new BadRequestException('仅支持 .wld 或 TerraPanel 导出的 .zip');
    }

    return {
      wldBuffer: file.buffer,
      related: {},
      meta: null,
    };
  }

  private extractFromZip(buffer: Buffer): {
    wldBuffer: Buffer;
    related: Record<string, Buffer>;
    meta: WorldExportMeta | null;
  } {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException('无法解析 zip 文件');
    }

    const entries = zip
      .getEntries()
      .filter((entry) => !entry.isDirectory)
      .map((entry) => ({
        name: basename(entry.entryName.replace(/\\/g, '/')),
        data: entry.getData(),
      }));

    const wldEntry = entries.find((entry) =>
      entry.name.toLowerCase().endsWith('.wld'),
    );
    if (!wldEntry) {
      throw new BadRequestException('zip 中未找到 .wld 世界文件');
    }

    const baseName = wldEntry.name.replace(/\.wld$/i, '');
    const related: Record<string, Buffer> = {};

    for (const entry of entries) {
      if (!entry.name.startsWith(`${baseName}.wld.`)) continue;
      const suffix = entry.name.slice(`${baseName}.wld`.length);
      related[suffix] = entry.data;
    }

    const metaEntry = entries.find(
      (entry) => entry.name === WORLD_EXPORT_META_FILENAME,
    );
    let meta: WorldExportMeta | null = null;
    if (metaEntry) {
      try {
        const parsed: unknown = JSON.parse(metaEntry.data.toString('utf-8'));
        if (isWorldExportMeta(parsed)) {
          meta = parsed;
        }
      } catch {
        // ignore invalid meta; import can continue with defaults
      }
    }

    return {
      wldBuffer: wldEntry.data,
      related,
      meta,
    };
  }

  private looksLikeZip(buffer: Buffer): boolean {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
      (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
    );
  }

  private normalizeWorldName(raw: string): string {
    const worldName = raw.trim();
    if (!worldName) {
      throw new BadRequestException('世界名称不能为空');
    }
    if (!/^[\w\u4e00-\u9fa5 -]+$/.test(worldName)) {
      throw new BadRequestException(
        '世界名称只能包含字母、数字、中文、空格、下划线和连字符',
      );
    }
    return worldName;
  }

  private async assertWorldNameAvailable(worldName: string): Promise<string> {
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

    return worldPath;
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
