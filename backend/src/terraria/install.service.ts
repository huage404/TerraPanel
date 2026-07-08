import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import AdmZip from 'adm-zip';
import axios from 'axios';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { TERRARIA_INSTALL_PROGRESS } from '../common/constants/events';
import { InstallPhase } from '../common/enums/install-status.enum';
import { AppConfigService } from '../config/config.service';
import { InstallProgressDto } from './dto/install-status.dto';

@Injectable()
export class InstallService {
  private readonly logger = new Logger(InstallService.name);
  private progress: InstallProgressDto = {
    phase: InstallPhase.IDLE,
    progress: 0,
    message: '等待安装',
  };
  private installing = false;

  constructor(
    private readonly configService: AppConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getProgress(): InstallProgressDto {
    return { ...this.progress };
  }

  isInstalling(): boolean {
    return this.installing;
  }

  /** 同步启动安装并立即返回当前进度（供 API 响应） */
  beginInstall(): InstallProgressDto {
    if (this.installing) {
      return this.getProgress();
    }

    const downloadUrl = this.configService.getDownloadUrl();
    if (!downloadUrl) {
      throw new BadRequestException(
        '未配置 TERRARIA_DOWNLOAD_URL，请在环境变量中设置下载地址',
      );
    }

    this.installing = true;
    this.updateProgress(
      InstallPhase.DOWNLOADING,
      0,
      '开始下载 Terraria 服务器压缩包...',
    );

    void this.runInstall(downloadUrl).catch((error) => {
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`安装任务异常: ${message}`);
    });

    return this.getProgress();
  }

  private async runInstall(downloadUrl: string): Promise<void> {
    const installPath = this.configService.getInstallPath();
    const tempZipPath = join(installPath, '.terrapanel-download.zip');

    try {
      await mkdir(installPath, { recursive: true });

      await this.downloadFile(downloadUrl, tempZipPath);

      await this.updateProgress(
        InstallPhase.EXTRACTING,
        70,
        '正在解压服务器文件...',
      );
      await this.extractArchive(tempZipPath, installPath);

      await this.updateProgress(
        InstallPhase.CHMOD,
        90,
        '正在设置可执行权限...',
      );
      await this.chmodExecutable();

      await rm(tempZipPath, { force: true });

      await this.updateProgress(
        InstallPhase.COMPLETED,
        100,
        'Terraria 服务器安装完成',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`安装失败: ${message}`);
      await rm(tempZipPath, { force: true });
      this.updateProgress(InstallPhase.FAILED, 0, '安装失败', message);
    } finally {
      this.installing = false;
    }
  }

  private async downloadFile(url: string, destination: string): Promise<void> {
    const response = await axios.get<NodeJS.ReadableStream>(url, {
      responseType: 'stream',
      timeout: 0,
      maxRedirects: 5,
    });

    const totalBytes = Number(response.headers['content-length'] ?? 0);
    let downloadedBytes = 0;

    response.data.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const percent = Math.min(
          65,
          Math.floor((downloadedBytes / totalBytes) * 65),
        );
        this.updateProgress(
          InstallPhase.DOWNLOADING,
          percent,
          `下载中 ${Math.floor((downloadedBytes / totalBytes) * 100)}%`,
        );
      }
    });

    await pipeline(response.data, createWriteStream(destination));
    await this.updateProgress(
      InstallPhase.DOWNLOADING,
      65,
      '下载完成，准备解压...',
    );
  }

  private async extractArchive(
    zipPath: string,
    destination: string,
  ): Promise<void> {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destination, true);
  }

  private async chmodExecutable(): Promise<void> {
    const executablePath = this.configService.getExecutablePath();
    await chmod(executablePath, 0o755);
  }

  private updateProgress(
    phase: InstallPhase,
    progress: number,
    message: string,
    error?: string,
  ): void {
    this.progress = { phase, progress, message, error };
    this.eventEmitter.emit(TERRARIA_INSTALL_PROGRESS, this.progress);
  }
}
