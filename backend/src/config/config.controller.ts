import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from './config.service';
import { ConfigResponseDto } from './dto/config-response.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: AppConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取当前 Terraria 服务器配置' })
  @ApiOkResponse({ type: ConfigResponseDto })
  getConfig(): ConfigResponseDto {
    const config = this.configService.getRuntimeConfig();
    return {
      ...config,
      password: config.password ? '******' : '',
    };
  }

  @Patch()
  @ApiOperation({ summary: '更新 Terraria 服务器运行配置' })
  @ApiOkResponse({ type: ConfigResponseDto })
  async updateConfig(@Body() dto: UpdateConfigDto): Promise<ConfigResponseDto> {
    const config = await this.configService.updateRuntimeConfig(dto);
    return {
      ...config,
      password: config.password ? '******' : '',
    };
  }
}
