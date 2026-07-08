import { ApiProperty } from '@nestjs/swagger';
import { ServerStatusDto } from './server-status.dto';
import { WorldSummaryDto } from './world-summary.dto';

export class WorldsResponseDto {
  @ApiProperty({ type: [WorldSummaryDto] })
  worlds: WorldSummaryDto[];

  @ApiProperty({ example: '/data/terraria/worlds/world.wld', nullable: true })
  activeWorldPath: string | null;
}

export class CreateWorldResponseDto extends WorldsResponseDto {
  @ApiProperty({ type: ServerStatusDto })
  status: ServerStatusDto;
}
