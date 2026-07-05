import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateConfigDto {
  @ApiPropertyOptional({ example: 7777 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  serverPort?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(255)
  maxPlayers?: number;

  @ApiPropertyOptional({ example: '/data/terraria/worlds/world.wld' })
  @IsOptional()
  @IsString()
  worldPath?: string;

  @ApiPropertyOptional({ example: 'world' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  worldName?: string;

  @ApiPropertyOptional({ example: 'secret' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;

  @ApiPropertyOptional({ example: 'Welcome to TerraPanel Server' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  motd?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  autoSaveMinutes?: number;
}
