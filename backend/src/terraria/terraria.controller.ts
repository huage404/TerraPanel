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
import { LogsResponseDto } from './dto/logs-response.dto';
import { ServerStatusDto } from './dto/server-status.dto';
import { TerrariaService } from './terraria.service';

@ApiTags('terraria')
@Controller('terraria')
export class TerrariaController {
  constructor(private readonly terrariaService: TerrariaService) {}

  @Get('status')
  @ApiOperation({ summary: '获取服务器运行状态' })
  @ApiOkResponse({ type: ServerStatusDto })
  getStatus(): ServerStatusDto {
    return this.terrariaService.getStatus();
  }

  @Get('logs')
  @ApiOperation({ summary: '获取历史日志' })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  @ApiOkResponse({ type: LogsResponseDto })
  getLogs(
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ): LogsResponseDto {
    return this.terrariaService.getLogs(limit);
  }

  @Post('start')
  @ApiOperation({ summary: '启动 Terraria 服务器' })
  @ApiOkResponse({ type: ServerStatusDto })
  start(): Promise<ServerStatusDto> {
    return this.terrariaService.start();
  }

  @Post('stop')
  @ApiOperation({ summary: '停止 Terraria 服务器' })
  @ApiOkResponse({ type: ServerStatusDto })
  stop(): Promise<ServerStatusDto> {
    return this.terrariaService.stop();
  }

  @Post('restart')
  @ApiOperation({ summary: '重启 Terraria 服务器' })
  @ApiOkResponse({ type: ServerStatusDto })
  restart(): Promise<ServerStatusDto> {
    return this.terrariaService.restart();
  }

  @Post('command')
  @ApiOperation({ summary: '向服务器发送控制台命令' })
  @ApiOkResponse({ description: '命令已发送' })
  sendCommand(@Body() dto: SendCommandDto): { success: true } {
    this.terrariaService.sendCommand(dto.command);
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
