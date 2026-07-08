import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServerStatusDto } from './server-status.dto';
import { InstanceStatusDto } from './instance-status.dto';
import { WorldSummaryDto } from './world-summary.dto';

export class WorldsResponseDto {
  @ApiProperty({ type: [WorldSummaryDto] })
  worlds: WorldSummaryDto[];
}

export class CreateWorldResponseDto extends WorldsResponseDto {
  @ApiProperty({ type: ServerStatusDto })
  status: ServerStatusDto;

  @ApiPropertyOptional({ type: InstanceStatusDto })
  instance?: InstanceStatusDto;
}
