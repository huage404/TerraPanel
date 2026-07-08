import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { SendInstanceCommandDto } from './dto/instance-action.dto';
import {
  InstanceStatusDto,
  InstancesResponseDto,
} from './dto/instance-status.dto';
import { LogsResponseDto } from './dto/logs-response.dto';
import { InstanceManagerService } from './instance-manager.service';

@ApiTags('instances')
@Controller('instances')
export class InstanceController {
  constructor(private readonly instanceManager: InstanceManagerService) {}

  @Get()
  @ApiOperation({ summary: '获取所有服务器实例及运行状态' })
  @ApiOkResponse({ type: InstancesResponseDto })
  listInstances(): InstancesResponseDto {
    return { instances: this.instanceManager.getAllStatuses() };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个实例状态' })
  @ApiOkResponse({ type: InstanceStatusDto })
  getInstance(@Param('id') id: string): InstanceStatusDto {
    return this.instanceManager.getInstanceStatus(id);
  }

  @Post()
  @ApiOperation({ summary: '为世界创建服务器实例' })
  @ApiOkResponse({ type: InstanceStatusDto })
  createInstance(@Body() dto: CreateInstanceDto): Promise<InstanceStatusDto> {
    return this.instanceManager.createInstance(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除实例（需先停止）' })
  @ApiOkResponse({ description: '实例已删除' })
  async deleteInstance(@Param('id') id: string): Promise<{ success: true }> {
    await this.instanceManager.deleteInstance(id);
    return { success: true };
  }

  @Post(':id/start')
  @ApiOperation({ summary: '启动实例' })
  @ApiOkResponse({ type: InstanceStatusDto })
  start(@Param('id') id: string): Promise<InstanceStatusDto> {
    return this.instanceManager.start(id);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: '停止实例' })
  @ApiOkResponse({ type: InstanceStatusDto })
  stop(@Param('id') id: string): Promise<InstanceStatusDto> {
    return this.instanceManager.stop(id);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: '重启实例' })
  @ApiOkResponse({ type: InstanceStatusDto })
  restart(@Param('id') id: string): Promise<InstanceStatusDto> {
    return this.instanceManager.restart(id);
  }

  @Post(':id/command')
  @ApiOperation({ summary: '向实例发送控制台命令' })
  @ApiOkResponse({ description: '命令已发送' })
  sendCommand(
    @Param('id') id: string,
    @Body() dto: SendInstanceCommandDto,
  ): { success: true } {
    this.instanceManager.sendCommand(id, dto.command);
    return { success: true };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '获取实例历史日志' })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  @ApiOkResponse({ type: LogsResponseDto })
  getLogs(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ): LogsResponseDto {
    const logs = this.instanceManager.getLogs(id, limit);
    return { logs, total: logs.length };
  }
}
