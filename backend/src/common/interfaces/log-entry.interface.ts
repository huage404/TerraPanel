export type LogStream = 'stdout' | 'stderr' | 'system';

export interface LogEntry {
  id: number;
  timestamp: string;
  stream: LogStream;
  message: string;
}
