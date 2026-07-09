import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorldDto {
  @ApiProperty({ example: 'my-world' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[\w\u4e00-\u9fa5 -]+$/, {
    message: '世界名称只能包含字母、数字、中文、空格、下划线和连字符',
  })
  worldName: string;

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
}
