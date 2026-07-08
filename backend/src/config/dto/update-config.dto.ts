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

  @ApiPropertyOptional({ example: 2, description: '1=小, 2=中, 3=大' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  worldSize?: number;

  @ApiPropertyOptional({ example: 'AwesomeSeed' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  worldSeed?: string;

  @ApiPropertyOptional({ example: 0, description: '0=普通, 1=专家, 2=大师, 3=旅途' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  worldDifficulty?: number;

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
