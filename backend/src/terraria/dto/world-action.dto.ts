import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class WorldActionDto {
  @ApiProperty({ example: '/data/terraria/worlds/world.wld' })
  @IsString()
  path: string;
}
