import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SelectWorldDto {
  @ApiProperty({ example: '/data/terraria/worlds/world.wld' })
  @IsString()
  @MaxLength(512)
  path: string;
}
