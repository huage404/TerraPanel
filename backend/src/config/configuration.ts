import * as Joi from 'joi';

export interface AppConfig {
  port: number;
  corsOrigin: string;
}

export interface TerrariaEnvConfig {
  installPath: string;
  dataPath: string;
  executable: string;
  downloadUrl: string;
  serverPort: number;
  maxPlayers: number;
  worldPath: string;
  worldName: string;
  worldSize: number;
  worldSeed: string;
  worldDifficulty: number;
  password: string;
  motd: string;
  autoSaveMinutes: number;
}

/** 仅持久化可通过 API 修改的运行参数，部署相关项始终来自环境变量 */
export type PersistedTerrariaSettings = Pick<
  TerrariaEnvConfig,
  | 'serverPort'
  | 'maxPlayers'
  | 'worldPath'
  | 'worldName'
  | 'worldSize'
  | 'worldSeed'
  | 'worldDifficulty'
  | 'password'
  | 'motd'
  | 'autoSaveMinutes'
>;

export interface TerrariaConfig {
  app: AppConfig;
  terraria: TerrariaEnvConfig;
}

export default (): TerrariaConfig => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  terraria: {
    installPath: process.env.TERRARIA_INSTALL_PATH ?? './data/terraria',
    dataPath: process.env.TERRARIA_DATA_PATH ?? './data/terraria',
    executable:
      process.env.TERRARIA_EXECUTABLE ?? 'TerrariaServer.bin.x86_64',
    downloadUrl: process.env.TERRARIA_DOWNLOAD_URL ?? '',
    serverPort: parseInt(process.env.TERRARIA_SERVER_PORT ?? '7777', 10),
    maxPlayers: parseInt(process.env.TERRARIA_MAX_PLAYERS ?? '8', 10),
    worldPath: process.env.TERRARIA_WORLD_PATH ?? '',
    worldName: process.env.TERRARIA_WORLD_NAME ?? 'world',
    worldSize: parseInt(process.env.TERRARIA_WORLD_SIZE ?? '2', 10),
    worldSeed: process.env.TERRARIA_WORLD_SEED ?? '',
    worldDifficulty: parseInt(process.env.TERRARIA_WORLD_DIFFICULTY ?? '0', 10),
    password: process.env.TERRARIA_PASSWORD ?? '',
    motd: process.env.TERRARIA_MOTD ?? 'Welcome to TerraPanel Server',
    autoSaveMinutes: parseInt(
      process.env.TERRARIA_AUTOSAVE_MINUTES ?? '10',
      10,
    ),
  },
});

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  TERRARIA_INSTALL_PATH: Joi.string().default('./data/terraria'),
  TERRARIA_DATA_PATH: Joi.string().default('./data/terraria'),
  TERRARIA_EXECUTABLE: Joi.string().default('TerrariaServer.bin.x86_64'),
  TERRARIA_DOWNLOAD_URL: Joi.string().allow('').default(''),
  TERRARIA_SERVER_PORT: Joi.number().default(7777),
  TERRARIA_MAX_PLAYERS: Joi.number().min(1).max(255).default(8),
  TERRARIA_WORLD_PATH: Joi.string().allow('').default(''),
  TERRARIA_WORLD_NAME: Joi.string().default('world'),
  TERRARIA_WORLD_SIZE: Joi.number().valid(1, 2, 3).default(2),
  TERRARIA_WORLD_SEED: Joi.string().allow('').default(''),
  TERRARIA_WORLD_DIFFICULTY: Joi.number().valid(0, 1, 2, 3).default(0),
  TERRARIA_PASSWORD: Joi.string().allow('').default(''),
  TERRARIA_MOTD: Joi.string().default('Welcome to TerraPanel Server'),
  TERRARIA_AUTOSAVE_MINUTES: Joi.number().min(1).default(10),
});
