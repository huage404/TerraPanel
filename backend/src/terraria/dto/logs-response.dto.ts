import { ApiProperty } from '@nestjs/swagger';
import { LogEntry } from '../../common/interfaces/log-entry.interface';

export class LogsResponseDto {
  @ApiProperty({ type: [Object] })
  logs: LogEntry[];

  @ApiProperty()
  total: number;
}
