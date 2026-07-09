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
import { Transform } from 'class-transformer';

function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

function toOptionalInt(value: unknown): unknown {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : normalized;
}

export class ImportWorldDto {
  @ApiProperty({ example: 'my-world' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[\w\u4e00-\u9fa5 -]+$/, {
    message: '世界名称只能包含字母、数字、中文、空格、下划线和连字符',
  })
  worldName: string;

  @ApiPropertyOptional({ example: 7777 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1024)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(255)
  maxPlayers?: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(64)
  password?: string;

  @ApiPropertyOptional({ example: 'Welcome' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(128)
  motd?: string;
}
