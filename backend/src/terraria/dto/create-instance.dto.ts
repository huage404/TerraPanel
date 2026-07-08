import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInstanceDto {
  @ApiProperty({ example: '/data/terraria/worlds/world.wld' })
  @IsString()
  worldPath: string;

  @ApiPropertyOptional({ example: 'world' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  worldName?: string;

  @ApiPropertyOptional({ example: 7777 })
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(255)
  maxPlayers?: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;

  @ApiPropertyOptional({ example: 'Welcome to TerraPanel Server' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  motd?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  worldSize?: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  worldSeed?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  worldDifficulty?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  autoSaveMinutes?: number;

  @ApiPropertyOptional({
    example: false,
    description: '为 true 时允许世界文件尚未存在（用于新建世界）',
  })
  @IsOptional()
  @IsBoolean()
  allowMissingWorld?: boolean;
}
