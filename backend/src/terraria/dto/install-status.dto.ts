import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstallPhase } from '../../common/enums/install-status.enum';

export class InstallProgressDto {
  @ApiProperty({ enum: InstallPhase })
  phase: InstallPhase;

  @ApiProperty({ example: 42, description: '进度 0-100' })
  progress: number;

  @ApiProperty({ example: '正在下载服务器文件...' })
  message: string;

  @ApiPropertyOptional({ example: 'Network error' })
  error?: string;
}
