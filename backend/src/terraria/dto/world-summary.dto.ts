import { ApiProperty } from '@nestjs/swagger';
import { ServerStatus } from '../../common/enums/server-status.enum';

export class WorldSummaryDto {
  @ApiProperty({ example: 'world.wld' })
  fileName: string;

  @ApiProperty({ example: 'world' })
  worldName: string;

  @ApiProperty({ example: '/data/terraria/worlds/world.wld' })
  path: string;

  @ApiProperty({ example: 5242880 })
  sizeBytes: number;

  @ApiProperty({ example: '2026-07-09T10:00:00.000Z' })
  modifiedAt: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', nullable: true })
  instanceId: string | null;

  @ApiProperty({ enum: ServerStatus })
  status: ServerStatus;

  @ApiProperty({ example: 7777, nullable: true })
  port: number | null;

  @ApiProperty({ example: 2 })
  playerCount: number;

  @ApiProperty({ example: 8 })
  maxPlayers: number;

  @ApiProperty({ example: 12345, nullable: true })
  pid: number | null;

  @ApiProperty({ example: 3600 })
  uptimeSeconds: number;
}
