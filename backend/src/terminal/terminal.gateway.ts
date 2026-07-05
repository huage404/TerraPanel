import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  TERRARIA_INSTALL_PROGRESS,
  TERRARIA_LOG,
  TERRARIA_STATUS,
} from '../common/constants/events';
import type { LogEntry } from '../common/interfaces/log-entry.interface';
import type { InstallProgressDto } from '../terraria/dto/install-status.dto';
import type { ServerStatusDto } from '../terraria/dto/server-status.dto';
import { TerrariaService } from '../terraria/terraria.service';

@WebSocketGateway({
  namespace: '/terminal',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TerminalGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly terrariaService: TerrariaService) {}

  handleConnection(client: Socket): void {
    client.emit('status', this.terrariaService.getStatus());
    client.emit('install:progress', this.terrariaService.getInstallStatus());
    client.emit('logs:history', {
      logs: this.terrariaService.getLogs(500).logs,
    });
  }

  @SubscribeMessage('command')
  handleCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { command?: string },
  ): void {
    const command = payload?.command?.trim();
    if (!command) {
      client.emit('error', { message: '命令不能为空' });
      return;
    }

    try {
      this.terrariaService.sendCommand(command);
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送命令失败';
      client.emit('error', { message });
    }
  }

  @OnEvent(TERRARIA_LOG)
  handleLogEvent(entry: LogEntry): void {
    this.server.emit('log', entry);
  }

  @OnEvent(TERRARIA_STATUS)
  handleStatusEvent(status: ServerStatusDto): void {
    this.server.emit('status', status);
  }

  @OnEvent(TERRARIA_INSTALL_PROGRESS)
  handleInstallProgress(progress: InstallProgressDto): void {
    this.server.emit('install:progress', progress);
  }
}
