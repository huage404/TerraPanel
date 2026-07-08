import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: true })
  active: boolean;
}
