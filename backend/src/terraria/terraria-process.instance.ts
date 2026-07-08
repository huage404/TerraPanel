import { BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChildProcess, spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import {
  TERRARIA_LOG,
  TERRARIA_STATUS,
} from '../common/constants/events';
import { ServerStatus } from '../common/enums/server-status.enum';
import type { InstanceConfig } from '../common/interfaces/instance-config.interface';
import {
  LogEntry,
  LogStream,
} from '../common/interfaces/log-entry.interface';
import { AppConfigService } from '../config/config.service';
import { ServerConfigService } from './server-config.service';
import {
  OnlinePlayerTracker,
  parseAggregatePlayerCount,
  parsePlayerLogLine,
} from './player-log.parser';

export interface InstanceStatusSnapshot {
  id: string;
  worldPath: string;
  worldName: string;
  status: ServerStatus;
  port: number;
  playerCount: number;
  maxPlayers: number;
  startedAt: string | null;
  uptimeSeconds: number;
  pid: number | null;
}

export class TerrariaProcessInstance {
  private readonly logger: Logger;
  private process: ChildProcess | null = null;
  private status = ServerStatus.STOPPED;
  private startedAt: Date | null = null;
  private playerCount = 0;
  private readonly onlinePlayers = new OnlinePlayerTracker();
  private logId = 0;
  private readonly logs: LogEntry[] = [];
  private readonly maxLogs = 2000;

  constructor(
    private config: InstanceConfig,
    private readonly appConfigService: AppConfigService,
    private readonly serverConfigService: ServerConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger = new Logger(`TerrariaProcess:${config.id.slice(0, 8)}`);
  }

  get id(): string {
    return this.config.id;
  }

  getConfig(): InstanceConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<InstanceConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getStatusSnapshot(): InstanceStatusSnapshot {
    return {
      id: this.config.id,
      worldPath: this.config.worldPath,
      worldName: this.config.worldName,
      status: this.status,
      port: this.config.port,
      playerCount: this.playerCount,
      maxPlayers: this.config.maxPlayers,
      startedAt: this.startedAt?.toISOString() ?? null,
      uptimeSeconds: this.startedAt
        ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
        : 0,
      pid: this.process?.pid ?? null,
    };
  }

  getLogs(limit = 200): LogEntry[] {
    const safeLimit = Math.min(Math.max(limit, 1), this.maxLogs);
    return this.logs.slice(-safeLimit);
  }

  async start(): Promise<void> {
    if (
      this.status === ServerStatus.RUNNING ||
      this.status === ServerStatus.STARTING
    ) {
      throw new BadRequestException(
        `实例「${this.config.worldName}」已在运行或正在启动`,
      );
    }

    const installed = await this.appConfigService.isInstalled();
    if (!installed) {
      throw new BadRequestException('Terraria 服务器尚未安装，请先执行一键安装');
    }

    const executablePath = this.appConfigService.getExecutablePath();
    const installPath = this.appConfigService.getInstallPath();
    const configPath = await this.serverConfigService.writeInstanceConfig(
      this.config,
    );
    const args = ['-config', configPath];

    try {
      await access(this.config.worldPath, constants.F_OK);
    } catch {
      this.appendLog(
        'system',
        `世界文件不存在，将根据 ${configPath} 自动创建世界（尺寸=${this.config.worldSize}，难度=${this.config.worldDifficulty}${this.config.worldSeed ? `，种子=${this.config.worldSeed}` : ''}）`,
      );
    }

    this.status = ServerStatus.STARTING;
    this.onlinePlayers.reset();
    this.playerCount = 0;
    this.emitStatus();
    this.appendLog(
      'system',
      `正在启动服务器: ${executablePath} ${args.join(' ')}`,
    );

    this.process = spawn(executablePath, args, {
      cwd: installPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.handleOutput('stdout', chunk.toString());
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      this.handleOutput('stderr', chunk.toString());
    });

    this.process.on('spawn', () => {
      this.startedAt = new Date();
      this.status = ServerStatus.RUNNING;
      this.emitStatus();
      this.appendLog('system', `服务器已启动 (PID: ${this.process?.pid})`);
    });

    this.process.on('error', (error) => {
      this.logger.error(`进程启动失败: ${error.message}`);
      const hint =
        error.message.includes('ENOENT') || error.message.includes('ENOEXEC')
          ? '（Terraria 二进制无法执行，Docker 请确认使用 Debian 基础镜像而非 Alpine）'
          : '';
      this.status = ServerStatus.ERROR;
      this.appendLog('system', `启动失败: ${error.message}${hint}`);
      this.cleanupProcessState();
      this.emitStatus();
    });

    this.process.on('exit', (code, signal) => {
      this.appendLog(
        'system',
        `服务器已退出 (code=${code ?? 'null'}, signal=${signal ?? 'null'})`,
      );
      this.status = ServerStatus.STOPPED;
      this.cleanupProcessState();
      this.emitStatus();
    });
  }

  async stop(force = false): Promise<void> {
    if (!this.process) {
      this.status = ServerStatus.STOPPED;
      this.emitStatus();
      return;
    }

    this.status = ServerStatus.STOPPING;
    this.emitStatus();
    this.appendLog('system', '正在停止服务器...');

    const currentProcess = this.process;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!currentProcess.killed) {
          currentProcess.kill('SIGKILL');
        }
      }, force ? 0 : 10_000);

      currentProcess.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      currentProcess.kill(force ? 'SIGKILL' : 'SIGTERM');
    });

    this.status = ServerStatus.STOPPED;
    this.cleanupProcessState();
    this.emitStatus();
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  sendCommand(command: string): void {
    if (!this.process?.stdin || this.status !== ServerStatus.RUNNING) {
      throw new BadRequestException('服务器未运行，无法发送命令');
    }

    this.process.stdin.write(`${command}\n`);
    this.appendLog('system', `> ${command}`);
  }

  async destroy(force = false): Promise<void> {
    await this.stop(force);
  }

  private handleOutput(stream: LogStream, raw: string): void {
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    for (const line of lines) {
      this.parseMetrics(line);
      this.appendLog(stream, line);
    }
  }

  private parseMetrics(line: string): void {
    const playerEvent = parsePlayerLogLine(line);
    if (playerEvent) {
      this.playerCount = this.onlinePlayers.apply(
        playerEvent.event,
        playerEvent.playerName,
      );
      this.emitStatus();
      return;
    }

    const aggregateCount = parseAggregatePlayerCount(line);
    if (aggregateCount !== null) {
      this.playerCount = this.onlinePlayers.setCount(aggregateCount);
      this.emitStatus();
    }
  }

  private appendLog(stream: LogStream, message: string): void {
    const entry: LogEntry = {
      id: ++this.logId,
      instanceId: this.config.id,
      timestamp: new Date().toISOString(),
      stream,
      message,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }

    this.eventEmitter.emit(TERRARIA_LOG, entry);
  }

  private cleanupProcessState(): void {
    this.process = null;
    this.startedAt = null;
    this.playerCount = 0;
    this.onlinePlayers.reset();
  }

  private emitStatus(): void {
    this.eventEmitter.emit(TERRARIA_STATUS, this.getStatusSnapshot());
  }
}
