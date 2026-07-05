import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { InstallProgressDto } from './dto/install-status.dto';
import { LogsResponseDto } from './dto/logs-response.dto';
import { ServerStatusDto } from './dto/server-status.dto';
import { InstallService } from './install.service';
import { ProcessManagerService } from './process-manager.service';

@Injectable()
export class TerrariaService {
  constructor(
    private readonly processManager: ProcessManagerService,
    private readonly installService: InstallService,
    private readonly configService: AppConfigService,
  ) {}

  getStatus(): ServerStatusDto {
    return this.processManager.getStatusSnapshot();
  }

  getLogs(limit = 200): LogsResponseDto {
    const logs = this.processManager.getLogs(limit);
    return {
      logs,
      total: logs.length,
    };
  }

  getInstallStatus(): InstallProgressDto {
    return this.installService.getProgress();
  }

  async start(): Promise<ServerStatusDto> {
    await this.processManager.start();
    return this.getStatus();
  }

  async stop(): Promise<ServerStatusDto> {
    await this.processManager.stop();
    return this.getStatus();
  }

  async restart(): Promise<ServerStatusDto> {
    await this.processManager.restart();
    return this.getStatus();
  }

  sendCommand(command: string): void {
    this.processManager.sendCommand(command);
  }

  async install(): Promise<InstallProgressDto> {
    await this.installService.install();
    return this.getInstallStatus();
  }

  isInstalling(): boolean {
    return this.installService.isInstalling();
  }

  isInstalled(): boolean {
    return this.configService.isInstalledSync();
  }
}
