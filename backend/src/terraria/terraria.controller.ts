import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SendCommandDto } from './dto/send-command.dto';
import { InstallProgressDto } from './dto/install-status.dto';
import { InstancesResponseDto } from './dto/instance-status.dto';
import { LogsResponseDto } from './dto/logs-response.dto';
import { ServerStatusDto } from './dto/server-status.dto';
import { TerrariaService } from './terraria.service';

@ApiTags('terraria')
@Controller('terraria')
export class TerrariaController {
  constructor(private readonly terrariaService: TerrariaService) {}

  @Get('status')
  @ApiOperation({ summary: '获取服务器聚合运行状态' })
  @ApiOkResponse({ type: ServerStatusDto })
  getStatus(): ServerStatusDto {
    return this.terrariaService.getStatus();
  }

  @Get('instances')
  @ApiOperation({ summary: '获取所有实例状态' })
  @ApiOkResponse({ type: InstancesResponseDto })
  listInstances(): InstancesResponseDto {
    return { instances: this.terrariaService.listInstances() };
  }

  @Get('logs')
  @ApiOperation({ summary: '获取指定实例历史日志' })
  @ApiQuery({ name: 'instanceId', required: true })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  @ApiOkResponse({ type: LogsResponseDto })
  getLogs(
    @Query('instanceId') instanceId: string,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ): LogsResponseDto {
    return this.terrariaService.getLogs(instanceId, limit);
  }

  @Post('start')
  @ApiOperation({ summary: '启动所有已停止的实例' })
  @ApiOkResponse({ type: ServerStatusDto })
  start(): Promise<ServerStatusDto> {
    return this.terrariaService.startAll();
  }

  @Post('stop')
  @ApiOperation({ summary: '停止所有运行中的实例' })
  @ApiOkResponse({ type: ServerStatusDto })
  stop(): Promise<ServerStatusDto> {
    return this.terrariaService.stopAll();
  }

  @Post('restart')
  @ApiOperation({ summary: '重启所有实例' })
  @ApiOkResponse({ type: ServerStatusDto })
  restart(): Promise<ServerStatusDto> {
    return this.terrariaService.restartAll();
  }

  @Post('command')
  @ApiOperation({ summary: '向指定实例发送控制台命令' })
  @ApiOkResponse({ description: '命令已发送' })
  sendCommand(
    @Body() dto: SendCommandDto,
  ): { success: true } {
    this.terrariaService.sendCommand(dto.instanceId, dto.command);
    return { success: true };
  }

  @Post('install')
  @ApiOperation({ summary: '一键安装 Terraria 服务器（异步）' })
  @ApiAcceptedResponse({ type: InstallProgressDto })
  install(): InstallProgressDto {
    return this.terrariaService.beginInstall();
  }

  @Get('install/status')
  @ApiOperation({ summary: '获取安装进度' })
  @ApiOkResponse({ type: InstallProgressDto })
  getInstallStatus(): InstallProgressDto {
    return this.terrariaService.getInstallStatus();
  }
}
