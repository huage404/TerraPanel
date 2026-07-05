import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChildProcess, spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import {
  TERRARIA_LOG,
  TERRARIA_STATUS,
} from '../common/constants/events';
import { ServerStatus } from '../common/enums/server-status.enum';
import {
  LogEntry,
  LogStream,
} from '../common/interfaces/log-entry.interface';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class ProcessManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(ProcessManagerService.name);
  private process: ChildProcess | null = null;
  private status = ServerStatus.STOPPED;
  private startedAt: Date | null = null;
  private playerCount = 0;
  private logId = 0;
  private readonly logs: LogEntry[] = [];
  private readonly maxLogs = 2000;

  constructor(
    private readonly configService: AppConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleDestroy(): void {
    void this.stop(true);
  }

  getStatusSnapshot(): {
    status: ServerStatus;
    port: number;
    playerCount: number;
    maxPlayers: number;
    startedAt: string | null;
    uptimeSeconds: number;
    pid: number | null;
    installed: boolean;
  } {
    return {
      status: this.status,
      port: this.configService.getRuntimeConfig().serverPort,
      playerCount: this.playerCount,
      maxPlayers: this.configService.getRuntimeConfig().maxPlayers,
      startedAt: this.startedAt?.toISOString() ?? null,
      uptimeSeconds: this.startedAt
        ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
        : 0,
      pid: this.process?.pid ?? null,
      installed: this.configService.isInstalledSync(),
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
      throw new BadRequestException('服务器已在运行或正在启动');
    }

    const installed = await this.configService.isInstalled();
    if (!installed) {
      throw new BadRequestException('Terraria 服务器尚未安装，请先执行一键安装');
    }

    const executablePath = this.configService.getExecutablePath();
    const installPath = this.configService.getInstallPath();
    const config = this.configService.getRuntimeConfig();
    const args = this.buildArgs(config);

    this.status = ServerStatus.STARTING;
    this.emitStatus();
    this.appendLog('system', `正在启动服务器: ${executablePath} ${args.join(' ')}`);

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
      this.status = ServerStatus.ERROR;
      this.appendLog('system', `启动失败: ${error.message}`);
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

  private buildArgs(config: ReturnType<AppConfigService['getRuntimeConfig']>): string[] {
    const args = [
      '-port',
      String(config.serverPort),
      '-maxplayers',
      String(config.maxPlayers),
      '-motd',
      config.motd,
      '-autoshare',
      '0',
      '-secure',
      '1',
    ];

    if (config.password) {
      args.push('-password', config.password);
    }

    if (config.worldPath) {
      args.push('-world', config.worldPath);
    } else {
      args.push('-world', join(config.dataPath, 'worlds', `${config.worldName}.wld`));
    }

    return args;
  }

  private handleOutput(stream: LogStream, raw: string): void {
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    for (const line of lines) {
      this.parseMetrics(line);
      this.appendLog(stream, line);
    }
  }

  private parseMetrics(line: string): void {
    const playersMatch = line.match(/(\d+)\/(\d+)\s+players?/i);
    if (playersMatch) {
      this.playerCount = parseInt(playersMatch[1], 10);
      this.emitStatus();
      return;
    }

    const connectedMatch = line.match(/(\d+)\s+users?\s+are\s+playing/i);
    if (connectedMatch) {
      this.playerCount = parseInt(connectedMatch[1], 10);
      this.emitStatus();
    }
  }

  private appendLog(stream: LogStream, message: string): void {
    const entry: LogEntry = {
      id: ++this.logId,
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
  }

  private emitStatus(): void {
    this.eventEmitter.emit(TERRARIA_STATUS, this.getStatusSnapshot());
  }
}
