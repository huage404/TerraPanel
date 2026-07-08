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
import type { InstanceStatusDto } from '../terraria/dto/instance-status.dto';
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
    client.emit('instances', {
      instances: this.terrariaService.listInstances(),
    });
    client.emit('install:progress', this.terrariaService.getInstallStatus());
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { instanceId?: string },
  ): void {
    const instanceId = payload?.instanceId?.trim();
    if (!instanceId) {
      client.emit('error', { message: 'instanceId 不能为空' });
      return;
    }

    try {
      const logs = this.terrariaService.getLogs(instanceId, 500);
      client.emit('logs:history', {
        instanceId,
        logs: logs.logs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '订阅失败';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('command')
  handleCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { instanceId?: string; command?: string },
  ): void {
    const instanceId = payload?.instanceId?.trim();
    const command = payload?.command?.trim();

    if (!instanceId) {
      client.emit('error', { message: 'instanceId 不能为空' });
      return;
    }

    if (!command) {
      client.emit('error', { message: '命令不能为空' });
      return;
    }

    try {
      this.terrariaService.sendCommand(instanceId, command);
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
  handleStatusEvent(status: InstanceStatusDto): void {
    this.server.emit('instance:status', status);
    this.server.emit('status', this.terrariaService.getStatus());
    this.server.emit('instances', {
      instances: this.terrariaService.listInstances(),
    });
  }

  @OnEvent(TERRARIA_INSTALL_PROGRESS)
  handleInstallProgress(progress: InstallProgressDto): void {
    this.server.emit('install:progress', progress);
  }
}
