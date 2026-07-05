import { ApiProperty } from '@nestjs/swagger';
import { ServerStatus } from '../../common/enums/server-status.enum';

export class ServerStatusDto {
  @ApiProperty({ enum: ServerStatus })
  status: ServerStatus;

  @ApiProperty({ example: true })
  installed: boolean;

  @ApiProperty({ example: 7777 })
  port: number;

  @ApiProperty({ example: 3 })
  playerCount: number;

  @ApiProperty({ example: 8 })
  maxPlayers: number;

  @ApiProperty({ example: '2026-07-03T10:00:00.000Z', nullable: true })
  startedAt: string | null;

  @ApiProperty({ example: 3600, description: '运行时长（秒）' })
  uptimeSeconds: number;

  @ApiProperty({ example: 12345, nullable: true })
  pid: number | null;
}
