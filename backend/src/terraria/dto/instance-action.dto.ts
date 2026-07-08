import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartWorldDto {
  @ApiPropertyOptional({ example: 7778 })
  @IsOptional()
  port?: number;
}

export class InstanceActionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  instanceId: string;
}

export class SendInstanceCommandDto {
  @ApiProperty({ example: 'say Hello' })
  @IsString()
  @MaxLength(512)
  command: string;
}
