export type LogStream = 'stdout' | 'stderr' | 'system';

export interface LogEntry {
  id: number;
  instanceId: string;
  timestamp: string;
  stream: LogStream;
  message: string;
}
