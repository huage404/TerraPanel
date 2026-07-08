import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendCommandDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  instanceId: string;

  @ApiProperty({ example: 'help' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  command: string;
}
