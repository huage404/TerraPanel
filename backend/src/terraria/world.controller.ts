import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWorldDto } from './dto/create-world.dto';
import { SelectWorldDto } from './dto/select-world.dto';
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
  @ApiOperation({ summary: '获取世界列表（扫描 .wld 文件）' })
  @ApiOkResponse({ type: WorldsResponseDto })
  listWorlds(): Promise<WorldsResponseDto> {
    return this.worldService.listWorlds();
  }

  @Post()
  @ApiOperation({ summary: '创建世界并启动服务器生成' })
  @ApiOkResponse({ type: CreateWorldResponseDto })
  createWorld(@Body() dto: CreateWorldDto): Promise<CreateWorldResponseDto> {
    return this.worldService.createWorld(dto);
  }

  @Patch('active')
  @ApiOperation({ summary: '切换当前使用的世界' })
  @ApiOkResponse({ type: WorldsResponseDto })
  selectWorld(@Body() dto: SelectWorldDto): Promise<WorldsResponseDto> {
    return this.worldService.selectWorld(dto.path);
  }
}
