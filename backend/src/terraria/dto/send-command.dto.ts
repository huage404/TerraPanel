import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendCommandDto {
  @ApiProperty({ example: 'help' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  command: string;
}
