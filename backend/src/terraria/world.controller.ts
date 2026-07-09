import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWorldDto } from './dto/create-world.dto';
import { SelectWorldDto } from './dto/select-world.dto';
import { WorldActionDto } from './dto/world-action.dto';
import {
  CreateWorldResponseDto,
  WorldsResponseDto,
} from './dto/worlds-response.dto';
import { WorldService } from './world.service';

@ApiTags('worlds')
@Controller('worlds')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get()
  @ApiOperation({ summary: '获取世界列表（扫描 .wld 文件，含实例状态）' })
  @ApiOkResponse({ type: WorldsResponseDto })
  listWorlds(): Promise<WorldsResponseDto> {
    return this.worldService.listWorlds();
  }

  @Get('export')
  @ApiOperation({
    summary: '导出世界文件为 zip（含 .wld 及 .wld.bak 等关联文件）',
  })
  @ApiQuery({
    name: 'path',
    required: true,
    description: '世界 .wld 绝对路径',
  })
  @ApiProduces('application/zip')
  async exportWorld(@Query('path') path: string): Promise<StreamableFile> {
    if (!path?.trim()) {
      throw new BadRequestException('缺少世界路径');
    }

    const archive = await this.worldService.exportWorld(path.trim());
    const asciiName = archive.fileName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(archive.fileName);

    return new StreamableFile(archive.buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
    });
  }

  @Post()
  @ApiOperation({ summary: '创建世界并启动服务器生成' })
  @ApiOkResponse({ type: CreateWorldResponseDto })
  createWorld(@Body() dto: CreateWorldDto): Promise<CreateWorldResponseDto> {
    return this.worldService.createWorld(dto);
  }

  @Post('start')
  @ApiOperation({ summary: '启动指定世界的服务器实例' })
  @ApiOkResponse({ type: WorldsResponseDto })
  startWorld(@Body() dto: WorldActionDto): Promise<WorldsResponseDto> {
    return this.worldService.startWorld(dto.path);
  }

  @Post('stop')
  @ApiOperation({ summary: '停止指定世界的服务器实例' })
  @ApiOkResponse({ type: WorldsResponseDto })
  stopWorld(@Body() dto: WorldActionDto): Promise<WorldsResponseDto> {
    return this.worldService.stopWorld(dto.path);
  }

  @Post('restart')
  @ApiOperation({ summary: '重启指定世界的服务器实例' })
  @ApiOkResponse({ type: WorldsResponseDto })
  restartWorld(@Body() dto: WorldActionDto): Promise<WorldsResponseDto> {
    return this.worldService.restartWorld(dto.path);
  }

  @Delete()
  @ApiOperation({ summary: '删除世界文件及关联实例（需先停止）' })
  @ApiOkResponse({ type: WorldsResponseDto })
  deleteWorld(@Body() dto: WorldActionDto): Promise<WorldsResponseDto> {
    return this.worldService.deleteWorld(dto.path);
  }

  /** @deprecated 多实例模式下不再需要切换当前世界，保留兼容 */
  @Patch('active')
  @ApiOperation({ summary: '（已废弃）切换当前世界，现等同启动该世界' })
  @ApiOkResponse({ type: WorldsResponseDto })
  selectWorld(@Body() dto: SelectWorldDto): Promise<WorldsResponseDto> {
    return this.worldService.startWorld(dto.path);
  }
}
