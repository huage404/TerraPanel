import { ApiProperty } from '@nestjs/swagger';
import { ServerStatus } from '../../common/enums/server-status.enum';

export class InstanceStatusDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '/data/terraria/worlds/world.wld' })
  worldPath: string;

  @ApiProperty({ example: 'world' })
  worldName: string;

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

  @ApiProperty({ example: 3600 })
  uptimeSeconds: number;

  @ApiProperty({ example: 12345, nullable: true })
  pid: number | null;
}

export class InstancesResponseDto {
  @ApiProperty({ type: [InstanceStatusDto] })
  instances: InstanceStatusDto[];
}
