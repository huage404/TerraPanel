/** 持久化的服务器实例配置（一实例一世界一端口） */
export interface InstanceConfig {
  id: string;
  worldPath: string;
  worldName: string;
  port: number;
  maxPlayers: number;
  password: string;
  motd: string;
  worldSize: number;
  worldSeed: string;
  worldDifficulty: number;
  autoSaveMinutes: number;
}
