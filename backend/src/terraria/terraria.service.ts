import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { InstallProgressDto } from './dto/install-status.dto';
import { InstanceStatusDto } from './dto/instance-status.dto';
import { LogsResponseDto } from './dto/logs-response.dto';
import { ServerStatusDto } from './dto/server-status.dto';
import { InstallService } from './install.service';
import { InstanceManagerService } from './instance-manager.service';

@Injectable()
export class TerrariaService {
  constructor(
    private readonly instanceManager: InstanceManagerService,
    private readonly installService: InstallService,
    private readonly configService: AppConfigService,
  ) {}

  getStatus(): ServerStatusDto {
    return this.instanceManager.getAggregateStatus();
  }

  getLogs(instanceId: string, limit = 200): LogsResponseDto {
    const logs = this.instanceManager.getLogs(instanceId, limit);
    return {
      logs,
      total: logs.length,
    };
  }

  getInstallStatus(): InstallProgressDto {
    return this.installService.getProgress();
  }

  async startAll(): Promise<ServerStatusDto> {
    await this.instanceManager.startAll();
    return this.getStatus();
  }

  async stopAll(): Promise<ServerStatusDto> {
    await this.instanceManager.stopAll();
    return this.getStatus();
  }

  async restartAll(): Promise<ServerStatusDto> {
    await this.instanceManager.restartAll();
    return this.getStatus();
  }

  sendCommand(instanceId: string, command: string): void {
    this.instanceManager.sendCommand(instanceId, command);
  }

  beginInstall(): InstallProgressDto {
    return this.installService.beginInstall();
  }

  isInstalling(): boolean {
    return this.installService.isInstalling();
  }

  isInstalled(): boolean {
    return this.configService.isInstalledSync();
  }

  listInstances(): InstanceStatusDto[] {
    return this.instanceManager.getAllStatuses();
  }
}
